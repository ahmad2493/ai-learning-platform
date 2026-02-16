import os
from typing import List
import re
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from mathbert_embeddings import MathBERTEmbeddings

load_dotenv()


class PastPaperRAG:
    def __init__(self, markdown_file: str, persist_dir: str = "/mnt/chroma/chromadb_pastpapers9"):
        self.markdown_file = markdown_file
        self.persist_dir = persist_dir
        self.math_vectorstore = None
        self.text_vectorstore = None
        self.llm = None
        self.retriever = None
        self.prompt = None

    def preprocess_content(self, content: str) -> str:
        """
        Preprocess content to remove repeated headers that waste vector space.
        Removes duplicate board header lines that appear multiple times throughout the document.
        """
        # Pattern matches lines like "SARGODHA,RAWALPINDI.D.GKHAN and BAHAWALPUR B0ARDS (2014 to2023)"
        # and variations with different spacing/formatting
        board_header_pattern = r'.*SARGODHA.*RAWALPINDI.*(?:D\.?G\.?KHAN|D\.G\.KHAN).*BAHAWALPUR.*BOARDS?.*2014.*2023.*'
        multiple_choice_pattern = r'Multiple Choice Questions developed according to the New Examination Techniques'
        questions_taken_pattern = r'Questions.*Taken.*From.*Previous.*Papers.*'
        
        lines = content.split('\n')
        filtered_lines = []
        seen_board_header = set()  # Track unique variations
        seen_mc_header = False
        seen_questions_taken = False
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            
            # Check if this is a board header line (case insensitive, flexible matching)
            if re.search(board_header_pattern, line_stripped, re.IGNORECASE):
                # Create a normalized version for comparison
                normalized = re.sub(r'[^\w]', '', line_stripped.upper())
                # Only keep if we haven't seen this exact variation before
                if normalized not in seen_board_header:
                    filtered_lines.append(line)
                    seen_board_header.add(normalized)
                # Skip duplicate occurrences
                continue
            
            # Check if this is a multiple choice header line
            if re.search(multiple_choice_pattern, line_stripped, re.IGNORECASE):
                # Only keep the first occurrence
                if not seen_mc_header:
                    filtered_lines.append(line)
                    seen_mc_header = True
                # Skip subsequent occurrences
                continue
            
            # Check if this is a "Questions Taken From Previous Papers" line
            if re.search(questions_taken_pattern, line_stripped, re.IGNORECASE):
                # Only keep the first occurrence
                if not seen_questions_taken:
                    filtered_lines.append(line)
                    seen_questions_taken = True
                # Skip subsequent occurrences
                continue
            
            # Keep all other lines
            filtered_lines.append(line)
        
        return '\n'.join(filtered_lines)
    
    def clean_chunks(self, chunks: List[Document]) -> List[Document]:
        """
        Post-process chunks to remove headers-only chunks and clean up content.
        """
        cleaned_chunks = []
        header_patterns = [
            r'^Multiple Choice Questions developed according to the New Examination Techniques.*$',
            r'^.*SARGODHA.*RAWALPINDI.*BAHAWALPUR.*BOARDS?.*2014.*2023.*$',
            r'^Questions.*Taken.*From.*Previous.*Papers.*$',
        ]
        
        for chunk in chunks:
            content = chunk.page_content.strip()
            
            # Skip empty chunks
            if not content or len(content) < 10:
                continue
            
            # Skip chunks that are only headers
            is_header_only = True
            for pattern in header_patterns:
                if re.match(pattern, content, re.IGNORECASE | re.MULTILINE):
                    # Check if there's actual content beyond the header
                    lines = content.split('\n')
                    non_header_lines = [line for line in lines if not re.search(pattern, line.strip(), re.IGNORECASE)]
                    if len('\n'.join(non_header_lines).strip()) > 20:
                        is_header_only = False
                        break
                else:
                    is_header_only = False
            
            if is_header_only:
                continue
            
            # Remove header lines from chunk content
            lines = content.split('\n')
            cleaned_lines = []
            for line in lines:
                line_stripped = line.strip()
                skip_line = False
                for pattern in header_patterns:
                    if re.search(pattern, line_stripped, re.IGNORECASE):
                        skip_line = True
                        break
                if not skip_line:
                    cleaned_lines.append(line)
            
            cleaned_content = '\n'.join(cleaned_lines).strip()
            
            # Only keep chunks with substantial content
            if len(cleaned_content) > 20:
                chunk.page_content = cleaned_content
                cleaned_chunks.append(chunk)
        
        return cleaned_chunks

    def load_and_chunk(self):
        with open(self.markdown_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Preprocess to remove repeated headers
        content = self.preprocess_content(content)

        documents = [Document(page_content=content)]

        # Optimized separators for past paper structure
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,  # Increased to accommodate questions with answers
            chunk_overlap=250,  # Increased overlap for better context
            separators=[
                r"\n## (?!Answers)",  # Section headers (but not "Answers")
                r"\n## Answers",  # Answers section headers
                r"\n## Exercise",  # Exercise section headers
                r"\n- Q\d+\.",  # Question headers like "- Q1.", "- Q2."
                r"\n\d+\.\s",  # Numbered questions (1., 2., 3.)
                r"\n\([ivx]+\)",  # Roman numeral questions (i), (ii), (iii)
                r"\n[ivx]+\.\s",  # Roman numeral questions (i., ii., iii.)
                r"\n- \(",  # Multiple choice options "- (A)", "- (B)"
                r"\n\n",  # Double newlines
                r"\n",  # Single newlines
                r" ",  # Spaces
                r"",  # Any character (fallback)
            ],
            is_separator_regex=True,
        )

        chunks = splitter.split_documents(documents)
        
        # Clean chunks to remove headers and duplicates
        chunks = self.clean_chunks(chunks)
        
        return chunks

    def separate_chunks(self, chunks):
        math_chunks = []
        text_chunks = []

        for chunk in chunks:
            content = chunk.page_content
            if "$$" in content or "\\[" in content or "\\]" in content:
                math_chunks.append(chunk)
            else:
                text_chunks.append(chunk)
        return math_chunks, text_chunks

    def create_vectorstores(self, chunks):
        math_chunks, text_chunks = self.separate_chunks(chunks)

        if math_chunks:
            print(f"Creating math vectorstore with {len(math_chunks)} chunks...")
            math_embeddings = MathBERTEmbeddings()
            self.math_vectorstore = Chroma.from_documents(
                documents=math_chunks,
                embedding=math_embeddings,
                persist_directory=os.path.join(self.persist_dir, "math"),
                collection_name="math_docs",
            )

        if text_chunks:
            print(f"Creating text vectorstore with {len(text_chunks)} chunks...")
            text_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
            self.text_vectorstore = Chroma.from_documents(
                documents=text_chunks,
                embedding=text_embeddings,
                persist_directory=os.path.join(self.persist_dir, "text"),
                collection_name="text_docs",
            )

    def load_vectorstores(self):
        math_path = os.path.join(self.persist_dir, "math")
        text_path = os.path.join(self.persist_dir, "text")

        if os.path.exists(math_path):
            print("Loading math vectorstore...")
            math_embeddings = MathBERTEmbeddings()
            self.math_vectorstore = Chroma(
                persist_directory=math_path,
                embedding_function=math_embeddings,
                collection_name="math_docs",
            )

        if os.path.exists(text_path):
            print("Loading text vectorstore...")
            text_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
            self.text_vectorstore = Chroma(
                persist_directory=text_path,
                embedding_function=text_embeddings,
                collection_name="text_docs",
            )

    def detect_board_and_year(self, query: str) -> dict:
        """
        Detect board cities and years in the query.
        Returns a dict with detected board codes and years.
        """
        keywords = {}
        query_lower = query.lower()
        
        # Board city mappings (full names and abbreviations)
        board_mappings = {
            'lahore': 'LHR', 'lhr': 'LHR',
            'multan': 'MLN', 'mln': 'MLN',
            'rawalpindi': 'RWP', 'rwp': 'RWP',
            'sargodha': 'SWL', 'swl': 'SWL', 'sgd': 'SGD',
            'dera ghazi khan': 'DGK', 'dgk': 'DGK', 'd.g.khan': 'DGK',
            'bahawalpur': 'BWP', 'bwp': 'BWP',
            'gujranwala': 'GRW', 'grw': 'GRW',
            'faisalabad': 'FSD', 'fsd': 'FSD',
        }
        
        # Detect board cities
        for city_name, board_code in board_mappings.items():
            if city_name in query_lower:
                keywords['board'] = board_code
                break
        
        # Detect years (4-digit years like 2014, 2015, etc.)
        year_pattern = r'\b(20\d{2})\b'  # Matches 2000-2099
        year_matches = re.findall(year_pattern, query)
        if year_matches:
            keywords['years'] = [int(year) for year in year_matches]
        
        # Detect year ranges
        if 'after' in query_lower:
            after_match = re.search(r'after\s+(\d{4})', query_lower)
            if after_match:
                keywords['after_year'] = int(after_match.group(1))
        
        if 'before' in query_lower:
            before_match = re.search(r'before\s+(\d{4})', query_lower)
            if before_match:
                keywords['before_year'] = int(before_match.group(1))
        
        if 'between' in query_lower:
            between_match = re.search(r'between\s+(\d{4})\s*[-–]\s*(\d{4})', query_lower)
            if between_match:
                keywords['year_range'] = (int(between_match.group(1)), int(between_match.group(2)))
        
        return keywords

    def filter_by_board_and_year(self, documents: List[Document], keywords: dict) -> List[Document]:
        """
        Filter documents that contain the detected board codes and years in their content.
        """
        filtered = []
        
        for doc in documents:
            content = doc.page_content
            matches = True
            
            # Check board code
            if 'board' in keywords:
                board_code = keywords['board']
                # Look for board code anywhere in annotations (MLN, LHR, etc.)
                # Pattern: board code followed by .GI or .GII or just the code
                board_patterns = [
                    f'{re.escape(board_code)}\\.?\\s*GI',  # MLN.GI, MLN GI
                    f'{re.escape(board_code)}\\.?\\s*GII',  # MLN.GII, MLN GII
                    f'{re.escape(board_code)}[^A-Za-z]',  # MLN followed by non-letter (in middle of annotation)
                ]
                board_found = False
                for pattern in board_patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        board_found = True
                        break
                if not board_found:
                    matches = False
            
            # Check years
            if matches and 'years' in keywords:
                years_found = False
                for year in keywords['years']:
                    # Look for year in board annotations
                    year_pattern = f'\\([^)]*{year}[^)]*\\)'
                    if re.search(year_pattern, content):
                        years_found = True
                        break
                if not years_found:
                    matches = False
            
            # Check after_year
            if matches and 'after_year' in keywords:
                after_year = keywords['after_year']
                # Find all years in annotations and check if any are after the threshold
                year_pattern = r'\([^)]*(\d{4})[^)]*\)'
                years_in_doc = re.findall(year_pattern, content)
                if years_in_doc:
                    years_list = [int(y) for y in years_in_doc if y.isdigit()]
                    if not any(year > after_year for year in years_list):
                        matches = False
                else:
                    matches = False
            
            # Check before_year
            if matches and 'before_year' in keywords:
                before_year = keywords['before_year']
                year_pattern = r'\([^)]*(\d{4})[^)]*\)'
                years_in_doc = re.findall(year_pattern, content)
                if years_in_doc:
                    years_list = [int(y) for y in years_in_doc if y.isdigit()]
                    if not any(year < before_year for year in years_list):
                        matches = False
                else:
                    matches = False
            
            # Check year_range
            if matches and 'year_range' in keywords:
                year_min, year_max = keywords['year_range']
                year_pattern = r'\([^)]*(\d{4})[^)]*\)'
                years_in_doc = re.findall(year_pattern, content)
                if years_in_doc:
                    years_list = [int(y) for y in years_in_doc if y.isdigit()]
                    if not any(year_min <= year <= year_max for year in years_list):
                        matches = False
                else:
                    matches = False
            
            if matches:
                filtered.append(doc)
        
        return filtered

    def retrieve(self, question: str, k: int = 10) -> List[Document]:
        """
        Hybrid retrieval strategy:
        - If board/year detected: Get top 5 from math, 30 from text, filter by keywords, return top k
        - Otherwise: Get top 2 from math, 8 from text, rank by similarity, return top k
        """
        # Detect board cities and years in query
        keywords = self.detect_board_and_year(question)
        use_hybrid = len(keywords) > 0
        
        if use_hybrid:
            print(f"Hybrid mode: Detected keywords {keywords}")
        
        candidates = []  # List of (doc, score, source)
        seen = set()
        
        # Determine how many results to fetch from each store
        # Normal mode: 2 from math (33 chunks), 8 from text (569 chunks)
        # Hybrid mode: 5 from math, 30 from text - more from text for better keyword filtering
        math_k = 5 if use_hybrid else 2
        text_k = 30 if use_hybrid else 8
        
        # Get results from math vectorstore with scores
        if self.math_vectorstore:
            try:
                math_results = self.math_vectorstore.similarity_search_with_relevance_scores(
                    query=question,
                    k=math_k
                )
                for doc, score in math_results:
                    # Normalize negative scores (distances) to positive similarity scores
                    if score < 0:
                        normalized_score = 1.0 / (1.0 + abs(score))
                    else:
                        normalized_score = score
                    
                    doc_hash = hash(doc.page_content)
                    if doc_hash not in seen:
                        seen.add(doc_hash)
                        candidates.append((doc, normalized_score, "math"))
            except Exception as e:
                print(f"Math vectorstore error: {e}")
        
        # Get results from text vectorstore with scores
        if self.text_vectorstore:
            try:
                text_results = self.text_vectorstore.similarity_search_with_relevance_scores(
                    query=question,
                    k=text_k
                )
                for doc, score in text_results:
                    # Normalize negative scores (distances) to positive similarity scores
                    if score < 0:
                        normalized_score = 1.0 / (1.0 + abs(score))
                    else:
                        normalized_score = score
                    
                    doc_hash = hash(doc.page_content)
                    if doc_hash not in seen:
                        seen.add(doc_hash)
                        candidates.append((doc, normalized_score, "text"))
            except Exception as e:
                print(f"Text vectorstore error: {e}")
        
        # If hybrid approach: filter by board/year keywords first
        if use_hybrid:
            # Extract documents from candidates
            docs_to_filter = [doc for doc, score, source in candidates]
            # Filter by keywords
            filtered_docs = self.filter_by_board_and_year(docs_to_filter, keywords)
            
            # Rebuild candidates list with only filtered documents (preserve scores)
            filtered_candidates = []
            filtered_doc_hashes = {hash(doc.page_content) for doc in filtered_docs}
            for doc, score, source in candidates:
                if hash(doc.page_content) in filtered_doc_hashes:
                    filtered_candidates.append((doc, score, source))
            
            # If no matches after filtering, fall back to top results without filtering
            if not filtered_candidates:
                print(f"Warning: No documents matched keywords {keywords}. Returning top results without keyword filtering.")
                # Keep original candidates, just take top results
                candidates = candidates[:k*2]  # Get more candidates for fallback
            else:
                candidates = filtered_candidates
        
        # Sort by score (highest first)
        candidates.sort(key=lambda x: x[1], reverse=True)
        
        # Return top k documents
        return [doc for doc, score, source in candidates[:k]]

    def setup_qa(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
        )
        rag_instance = self

        class SimpleRetriever(BaseRetriever):
            """Hybrid retriever: detects board/year, uses keyword filtering if detected"""

            def _get_relevant_documents(self, query: str) -> List[Document]:
                return rag_instance.retrieve(query, k=10)

            async def _aget_relevant_documents(self, query: str) -> List[Document]:
                return rag_instance.retrieve(query, k=10)

        self.retriever = SimpleRetriever()

        self.prompt = PromptTemplate(
            input_variables=["context", "question"],
            template="""
You are a helpful assistant for answering questions based on past exam papers.

Use the context below (past paper questions and maybe their answers) to answer the question.

**IMPORTANT - Board and Year Queries:**
If the user asks about questions from specific boards, years, or topics, carefully extract and list them from the context.

**Board City Abbreviations:**
- LHR = Lahore
- MLN = Multan
- RWP = Rawalpindi
- SWL = Sargodha
- SGD = Sargodha
- DGK = Dera Ghazi Khan
- BWP = Bahawalpur
- GRW = Gujranwala
- FSD = Faisalabad

**Board annotations format:** Questions have board annotations like (LHR. GI, 2019), (MLN. GII, 2015), etc.
- GI = Group I, GII = Group II
- The year appears after the board codes
- **CRITICAL:** Board codes can appear ANYWHERE in the annotation, not just at the start!
  - Examples: "(MLN.GI, 2014)" - MLN at start
  - Examples: "(LHR.GI, MLN.GI, 2014)" - MLN in the middle
  - Examples: "(SWLGI, MLN.GII, 2015)" - MLN in the middle
  - Examples: "(GRW.GI, BWP.GII, MLN.GI, 2019)" - MLN at the end
- You MUST check the ENTIRE annotation for the board code, not just the beginning!

**For queries about boards/years:**
1. Look for board annotations in parentheses in the context
2. **IMPORTANT:** Search for the board abbreviation ANYWHERE in the annotation, not just at the start
   - For "Multan board" or "MLN", look for "MLN" anywhere in annotations like:
     - "(MLN.GI, 2014)" ✓
     - "(LHR.GI, MLN.GI, 2014)" ✓ (MLN appears in middle)
     - "(SWLGI, MLN.GII, SGD.GI, 2015)" ✓ (MLN appears in middle)
     - "(GRW.GI, BWP.GII, MLN.GI, 2019)" ✓ (MLN appears at end)
3. Filter questions based on:
   - Board city (match abbreviations ANYWHERE in annotation)
   - Year (exact year, "after X", "before X", "between X-Y")
4. List ALL questions that match the criteria (don't miss any!)
5. Include the full board annotation with each question

**For topic-based queries:**
- Look for questions related to the mentioned topic
- Extract and list relevant questions from the context

**General Instructions:**
- Prefer giving exact, direct, exam-style answers
- If the context does not provide the answer, just say that you don't know, don't try to make up an answer
- If you get latex or symbols in the context, convert them into normal readable form
- When listing questions, format them clearly with their board annotations

Context:
{context}

Question:
{question}

Answer:
""",
        )

    def ask(self, question: str, show_sources: bool = True):
        # Retrieve documents
        docs = self.retriever.invoke(question)

        if not docs:
            return "No relevant documents found."

        # Format context
        context = "\n\n---\n\n".join(doc.page_content for doc in docs)

        # Create the chain using LCEL
        chain = self.prompt | self.llm | StrOutputParser()

        # Get answer
        result = chain.invoke({"context": context, "question": question})
        
        return result


    def prepare_rag(self):
        """Initialize RAG system: load or create vectorstores and setup QA chain"""
        math_exists = os.path.exists(os.path.join(self.persist_dir, "math"))
        text_exists = os.path.exists(os.path.join(self.persist_dir, "text"))

        if math_exists and text_exists:
            self.load_vectorstores()
        else:
            chunks = self.load_and_chunk()
            self.create_vectorstores(chunks)

        self.setup_qa()