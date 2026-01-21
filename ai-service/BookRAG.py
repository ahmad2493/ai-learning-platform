import os
from typing import List
import re
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate

from mathbert_embeddings import MathBERTEmbeddings

load_dotenv()


class BookRAG:
    def __init__(self, markdown_file, persist_dir="/mnt/chroma/chromadb_physicsBook9"):
        self.markdown_file = markdown_file
        self.persist_dir = persist_dir
        self.math_vectorstore = None
        self.text_vectorstore = None
        self.qa_chain = None

    # --------------------------------------------------
    # Load & Chunk Markdown
    # --------------------------------------------------
    def load_and_chunk(self):
        with open(self.markdown_file, "r", encoding="utf-8") as f:
            content = f.read()

        documents = [Document(page_content=content)]

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=500,
            separators=["\n##", "##\n"]
        )

        chunks = splitter.split_documents(documents)
        return chunks

    # --------------------------------------------------
    # Separate Chunks based on content
    # --------------------------------------------------
    def separate_chunks(self, chunks):
        math_chunks = []
        text_chunks = []

        for chunk in chunks:
            content = chunk.page_content
            if '$$' in content or '\\[' in content or '\\]' in content:
                math_chunks.append(chunk)
            else:
                text_chunks.append(chunk)
        return math_chunks, text_chunks

    # --------------------------------------------------
    # Create dual vectorstores
    # --------------------------------------------------
    def create_vectorstores(self, chunks):
        math_chunks, text_chunks = self.separate_chunks(chunks)

        if math_chunks:
            math_embeddings = MathBERTEmbeddings()
            self.math_vectorstore = Chroma.from_documents(
                documents=math_chunks,
                embedding=math_embeddings,
                persist_directory= os.path.join(self.persist_dir, "math"),
                collection_name="math_docs"
            )

        if text_chunks:
            text_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
            self.text_vectorstore = Chroma.from_documents(
                documents=text_chunks,
                embedding=text_embeddings,
                persist_directory=os.path.join(self.persist_dir, "text"),
                collection_name="text_docs"
            )

    # --------------------------------------------------
    # Load Existing DB
    # --------------------------------------------------
    def load_vectorstores(self):
        math_path = os.path.join(self.persist_dir, "math")
        text_path = os.path.join(self.persist_dir, "text")

        if os.path.exists(math_path):
            math_embeddings = MathBERTEmbeddings()
            self.math_vectorstore = Chroma(
                persist_directory=math_path,
                embedding_function=math_embeddings,
                collection_name="math_docs"
            )

        if os.path.exists(text_path):
            text_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
            self.text_vectorstore = Chroma(
                persist_directory=text_path,
                embedding_function=text_embeddings,
                collection_name="text_docs"
            )

    # --------------------------------------------------
    # Map Reference Queries to their category e.g SQ, MCQ
    # --------------------------------------------------
    def parse_reference_query(self, question):
        question_lower = question.lower()

        # Extended mapping for reference types with their common variations
        ref_type_mapping = {
            'short question': ['short question', 'short questions', 'short answer', 'sq', 's.q'],
            'mcq': ['mcq', 'mcqs', 'multiple choice', 'multiple choice question', 'm.c.q', 'tick'],
            'example': ['example', 'ex', 'ex.'],
            'exercise': ['exercise', 'problem', 'prob'],
            'numerical': ['numerical', 'numerical problem', 'numerical problems'],
            'table': ['table', 'tab', 'tab.'],
            'figure': ['figure', 'fig', 'fig.'],
            'activity': ['activity', 'act', 'act.'],
            'constructed response': ['constructed response', 'constructed'],
            'comprehensive': ['comprehensive', 'comprehensive question'],
            'topic': ['topic', 'top', 'topic.'],
            'chapter': ['chapter', 'ch', 'ch.'],
            'question': ['question', 'q', 'q.']
        }

        found_ref_type = None
        matched_keyword = None

        # Find which reference type is mentioned
        for ref_type, variations in ref_type_mapping.items():
            for variation in variations:
                # Use word boundaries to avoid false matches
                pattern = rf'\b{re.escape(variation)}\b'
                if re.search(pattern, question_lower):
                    found_ref_type = ref_type
                    matched_keyword = variation
                    break
            if found_ref_type:
                break

        # This regex captures numbers like "1.2" as a single match
        decimal_numbers = re.findall(r'\d+\.\d+', question)

        # If no decimal numbers, try to construct them from context
        if not decimal_numbers and found_ref_type:
            # Try to find the "X.Y" pattern near the reference keyword
            keyword_pos = question_lower.find(matched_keyword)
            if keyword_pos != -1:
                context = question[keyword_pos:keyword_pos + 30]
                decimal_match = re.search(r'\b(\d+)\.(\d+)\b', context)
                if decimal_match:
                    decimal_numbers = [decimal_match.group(0)]

        if not decimal_numbers:
            decimal_numbers = re.findall(r'\d+', question)

        return {
            'ref_type': found_ref_type,
            'matched_keyword': matched_keyword,
            'numbers': decimal_numbers,
            'original_query': question
        }

    # --------------------------------------------------
    # Decide Retrieval Method i.e. Keyword or Semantic
    # --------------------------------------------------
    def dual_retrieve(self, question, k=5):
        parsed = self.parse_reference_query(question)

        # If we have a reference type or numbers, use keyword-based filtering
        if parsed['ref_type'] or parsed['numbers']:
            return self.keyword_filtered_retrieve(question, parsed, k)
        else:
            return self.semantic_retrieve(question, k)

    # --------------------------------------------------
    # Keyword Retrieval
    # --------------------------------------------------
    def keyword_filtered_retrieve(self, question, parsed_info, k):
        results = []

        ref_type = parsed_info['ref_type']
        numbers = parsed_info['numbers']
        matched_keyword = parsed_info['matched_keyword']
        full_ref_number = numbers[0] if len(numbers) == 1 else '.'.join(numbers[:2])
        if self.math_vectorstore:
            all_math = self.math_vectorstore.similarity_search(question, k=k * 10)
            results.extend([(doc, "math") for doc in all_math])

        if self.text_vectorstore:
            all_text = self.text_vectorstore.similarity_search(question, k=k * 10)
            results.extend([(doc, "text") for doc in all_text])

        filtered = []
        seen = set()

        for doc, source_type in results:
            doc_hash = hash(doc.page_content)
            if doc_hash in seen:
                continue
            seen.add(doc_hash)

            doc_content = doc.page_content
            lines = doc_content.split('\n')
            first_line = lines[0] if lines else ""

            # Look for section headers in more lines
            header_context = '\n'.join(lines[:10]).lower()

            final_score = 0.0
            match_found = False

            #PRIORITY 1: EXACT REFERENCE MATCH IN HEADER
            if ref_type and numbers:
                exact_patterns = []

                if ref_type == 'example':
                    exact_patterns = [
                        rf'##\s*example\s+{re.escape(full_ref_number)}\b',
                        rf'##\s*ex\.?\s+{re.escape(full_ref_number)}\b'
                    ]
                elif ref_type == 'table':
                    exact_patterns = [
                        rf'##\s*table\s+{re.escape(full_ref_number)}\b',
                        rf'##\s*tab\.?\s+{re.escape(full_ref_number)}\b'
                    ]
                elif ref_type == 'figure':
                    exact_patterns = [
                        rf'##\s*Fig\.?\s+{re.escape(full_ref_number)}\b',
                        rf'##\s*fig\.?\s+{re.escape(full_ref_number)}\b'
                    ]
                elif ref_type == 'activity':
                    exact_patterns = [
                        rf'##\s*activity\s*{re.escape(full_ref_number)}\b',
                        rf'##\s*act\.?\s*{re.escape(full_ref_number)}\b'
                    ]
                elif ref_type == 'topic':
                    exact_patterns = [
                        rf'##\s*{re.escape(full_ref_number)}\s',
                        rf'##{re.escape(full_ref_number)}\s',
                    ]

                for pattern in exact_patterns:
                    if re.search(pattern, first_line, re.IGNORECASE):
                        final_score += 100.0  # VERY HIGH score for exact header match
                        match_found = True
                        break

            #PRIORITY 2: SECTION-BASED QUESTIONS (Short Questions, MCQs)
            if ref_type == 'short question' and numbers:
                if re.search(r'short\s+(answer\s+)?question', header_context):
                    final_score += 50.0
                    match_found = True

                    # Match patterns like "1.4." or "1.4" or "- 1.4"
                    number_patterns = [
                        rf'^\s*-?\s*{re.escape(full_ref_number)}[\.\s]',
                        rf'\b{re.escape(full_ref_number)}[\.\s]',
                    ]

                    for pattern in number_patterns:
                        if re.search(pattern, doc_content, re.MULTILINE):
                            final_score += 30.0
                            break

            elif ref_type == 'mcq' and numbers:
                if re.search(r'(multiple\s+choice|mcq|tick.*correct)', header_context):
                    final_score += 50.0
                    match_found = True

                    full_ref_number = numbers[0] if len(numbers) == 1 else '.'.join(numbers[:2])

                    number_patterns = [
                        rf'^\s*-?\s*{re.escape(full_ref_number)}[\.\s]',
                        rf'\b{re.escape(full_ref_number)}[\.\s]',
                    ]

                    for pattern in number_patterns:
                        if re.search(pattern, doc_content, re.MULTILINE):
                            final_score += 30.0
                            break

            elif ref_type == 'numerical' and numbers:
                if re.search(r'numerical\s+problem', header_context):
                    final_score += 50.0
                    match_found = True

                    full_ref_number = numbers[0] if len(numbers) == 1 else '.'.join(numbers[:2])

                    number_patterns = [
                        rf'^\s*-?\s*{re.escape(full_ref_number)}[\.\s]',
                        rf'\b{re.escape(full_ref_number)}[\.\s]',
                    ]

                    for pattern in number_patterns:
                        if re.search(pattern, doc_content, re.MULTILINE):
                            final_score += 30.0
                            break

            elif ref_type == 'topic' and numbers:
                match_found = False
                full_ref_number = numbers[0] if len(numbers) == 1 else '.'.join(numbers[:2])

                header_pattern = rf'^##\s+{re.escape(full_ref_number)}\s+\S'
                if re.search(header_pattern, doc_content, re.MULTILINE):
                    final_score += 200.0
                    match_found = True
                elif not match_found:
                    list_pattern = rf'^\s*-\s*{re.escape(full_ref_number)}\s+\w'
                    if re.search(list_pattern, doc_content, re.MULTILINE):
                        final_score += 50.0  # Lower score for list items
                        match_found = True
                if not match_found:
                    number_patterns = [
                        rf'^\s*-?\s*{re.escape(full_ref_number)}[\.\s]',
                        rf'\b{re.escape(full_ref_number)}[\.\s]',
                    ]
                    for pattern in number_patterns:
                        if re.search(pattern, doc_content, re.MULTILINE):
                            final_score += 20.0
                            match_found = True
                            break
            elif ref_type == 'figure' and numbers:
                if re.search(rf'\bFig\.?\s+{re.escape(full_ref_number)}\b',doc_content):
                    final_score += 50.0
                    match_found = True

            #PRIORITY 3: GENERAL REFERENCE IN CONTENT
            if not match_found and ref_type and numbers:
                full_ref_number = numbers[0] if len(numbers) == 1 else '.'.join(numbers[:2])

                # Generic patterns for any reference type
                content_patterns = [
                    rf'\b{re.escape(ref_type)}\s+{re.escape(full_ref_number)}\b',
                    rf'\b{re.escape(matched_keyword)}\s+{re.escape(full_ref_number)}\b'
                ]

                for pattern in content_patterns:
                    if re.search(pattern, doc_content, re.IGNORECASE):
                        final_score += 10.0
                        match_found = True
                        break

            # PRIORITY 4: NUMBER MATCH ONLY
            if not match_found and numbers:
                full_ref_number = numbers[0] if len(numbers) == 1 else '.'.join(numbers[:2])

                # Check in the first line
                if full_ref_number in first_line:
                    final_score += 5.0
                    match_found = True
                # Check in content
                elif full_ref_number in doc_content:
                    final_score += 2.0
                    match_found = True

            if match_found:
                filtered.append((doc, final_score))

        filtered.sort(key=lambda x: x[1], reverse=True)

        if filtered:
            return [doc for doc, _ in filtered[:k]]
        else:
            return self.semantic_retrieve(question, k)

    # --------------------------------------------------
    # Semantic Retrieve
    # --------------------------------------------------
    def semantic_retrieve(self, question, k):
        results = []

        if self.math_vectorstore:
            math_results = self.math_vectorstore.similarity_search(question, k=k * 3)
            results.extend([(doc, "math") for doc in math_results])

        if self.text_vectorstore:
            text_results = self.text_vectorstore.similarity_search(question, k=k * 3)

            results.extend([(doc, "text") for doc in text_results])

        seen = set()
        scored = []

        for doc, source_type in results:
            if doc.page_content in seen:
                continue
            seen.add(doc.page_content)

            final_score = 0.1

            stopwords = {'what', 'are', 'is', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
                         'be', 'been', 'by', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
                         'must', 'can', 'have', 'has', 'had', 'this', 'that', 'these', 'those'}

            question_words = set(word for word in question.lower().split() if word not in stopwords and len(word) > 2)
            doc_words = set(doc.page_content.lower().split())
            keyword_overlap = len(question_words & doc_words)
            final_score += keyword_overlap * 0.1

            first_line = doc.page_content.split('\n')[0]
            header = first_line.lstrip("#").strip().lower()
            normalized_question = question.strip().lower()

            if header == normalized_question:
                final_score += 2.0
            elif normalized_question in header:
                final_score += 1.0

            math_keywords = {'formula', 'equation', 'calculate', 'solve', 'derive', 'proof', 'law', 'theorem'}
            if source_type == "math" and any(kw in question.lower() for kw in math_keywords):
                final_score += 0.5

            scored.append((doc, final_score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [doc for doc, _ in scored[:k]]

    # --------------------------------------------------
    # Setup QA Chain
    # --------------------------------------------------
    def setup_qa(self):
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0
        )
        rag_instance = self

        class DualRetriever(BaseRetriever):
            """Retrieves from both math and text vectorstores"""

            def _get_relevant_documents(self, query: str) -> List[Document]:
                return rag_instance.dual_retrieve(query, k=5)

            async def _aget_relevant_documents(self, query: str) -> List[Document]:
                return rag_instance.dual_retrieve(query, k=5)

        prompt = PromptTemplate(
            input_variables=["context", "question"],
            template=r"""
                Use the context below to answer the question.
                The context may contain LaTeX, equations, or textbook formatting.
        
                Interpret the mathematics correctly, but DO NOT copy the formatting.
        
                STRICT FORMAT RULES (MANDATORY):
                - Do NOT use LaTeX or math blocks.
                - Do NOT use markdown (no headings, lists, or bold text).
                - Write all mathematics inline using Unicode symbols (², √, ×).
                - Do not number steps or label sections.
                - Do not imitate textbook solution layouts.
        
                Required answer structure:
                Perform mathematical derivations/solution step by step in each line.
                State given values in sentences.
                Write formulas inline.
                Substitute values inline.
                Compute results.
                State final answers clearly.
                BUT THE CONTENT SHOULD BE RELATED TO CONTEXT.
        
                Context:
                {context}
        
                Question:
                {question}
        
                Answer:
                """
        )

        retriever = DualRetriever()
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=retriever,
            chain_type="stuff",
            return_source_documents=True,
            chain_type_kwargs={"prompt": prompt}
        )

    # --------------------------------------------------
    # Ask Question
    # --------------------------------------------------
    def ask(self, question):
        result = self.qa_chain.invoke({"query": question})
        return result['result']

    # --------------------------------------------------
    # Prepare RAG Instance
    # --------------------------------------------------
    def prepare_rag(self):
        math_exists = os.path.exists(os.path.join(self.persist_dir, "math"))
        text_exists = os.path.exists(os.path.join(self.persist_dir, "text"))

        if math_exists and text_exists:
            self.load_vectorstores()
        else:
            chunks = self.load_and_chunk()
            self.create_vectorstores(chunks)

        self.setup_qa()

