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
    def __init__(self, markdown_file, persist_dir="./chroma_physicsBook9"):
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
                persist_directory=os.path.join(self.persist_dir, "math"),
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

    def dual_retrieve(self, question, k=5):
        # Extract numbers (e.g., "3.2" from "Example 3.2")
        number_matches = re.findall(r'\d+\.?\d*', question)

        ref_keywords = {'example', 'exercise', 'problem', 'table', 'figure', 'section', 'chapter', 'question', 'ex'}
        found_ref_keyword = None
        for kw in ref_keywords:
            if kw in question.lower():
                found_ref_keyword = kw
                break

        # If we have numbers or reference keywords, use keyword-based filtering
        if number_matches or found_ref_keyword:
            return self.keyword_filtered_retrieve(question, number_matches, found_ref_keyword, k)
        else:
            # Fall back to semantic similarity
            return self.semantic_retrieve(question, k)

    def keyword_filtered_retrieve(self, question, number_matches, found_ref_keyword, k):
        candidate_docs = []

        if self.math_vectorstore:
            all_math = self.math_vectorstore.similarity_search(question, k=1000)
            candidate_docs.extend([(doc, "math") for doc in all_math])

        if self.text_vectorstore:
            all_text = self.text_vectorstore.similarity_search(question, k=1000)
            candidate_docs.extend([(doc, "text") for doc in all_text])

        filtered = []
        seen = set()

        for doc, source_type in candidate_docs:
            doc_hash = hash(doc.page_content)
            if doc_hash in seen:
                continue
            seen.add(doc_hash)

            doc_content = doc.page_content
            first_line = doc_content.split('\n')[0]

            matches = False
            match_score = 0

            # HIGHEST PRIORITY: Case-insensitive exact match of "Example 3.2" in the header
            if found_ref_keyword and number_matches:
                for num in number_matches:
                    # Create a pattern that matches the keyword (case-insensitive) followed by a number
                    pattern = rf'{found_ref_keyword}\s*{re.escape(num)}'
                    if re.search(pattern, first_line, re.IGNORECASE):
                        match_score += 1000
                        matches = True
                        break
            # HIGH PRIORITY: Reference pattern anywhere in content
            if found_ref_keyword and not matches:
                for num in number_matches:
                    pattern = rf'{found_ref_keyword}\s*{re.escape(num)}'
                    if re.search(pattern, doc_content, re.IGNORECASE):
                        match_score += 500
                        matches = True
                        break

            # MEDIUM PRIORITY: Number match in header
            if number_matches and not matches:
                for num in number_matches:
                    if num in first_line:
                        match_score += 100
                        matches = True
                        break

            # LOW PRIORITY: Number anywhere in content
            if number_matches and not matches:
                for num in number_matches:
                    if num in doc_content:
                        match_score += 50
                        matches = True
                        break

            if matches:
                filtered.append((doc, match_score, source_type))

        # Sort by match score
        filtered.sort(key=lambda x: x[1], reverse=True)

        # Return top k
        if filtered:
            return [doc for doc, _, _ in filtered[:k]]
        else:
            return self.semantic_retrieve(question, k)

    def semantic_retrieve(self, question, k):
        results = []

        if self.math_vectorstore:
            math_results = self.math_vectorstore.similarity_search(question, k=k)
            results.extend([(doc, "math") for doc in math_results])

        if self.text_vectorstore:
            text_results = self.text_vectorstore.similarity_search(question, k=k)
            results.extend([(doc, "text") for doc in text_results])

        seen = set()
        scored = []

        for doc, source_type in results:
            if doc.page_content in seen:
                continue
            seen.add(doc.page_content)

            score = 0
            math_keywords = {'formula', 'equation', 'calculate', 'solve', 'derive', 'proof', 'law', 'theorem'}
            if source_type == "math" and any(kw in question.lower() for kw in math_keywords):
                score += 50

            scored.append((doc, score))

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
            template="""
                Use the context below to answer the question.
                Pay close attention to mathematical formulas.
                Do NOT invent formulas. If you get latex in the context, convert it into normal form.
                Give answers in human readable, neat and clean form. Do not give formulas and scientific notations in latex.

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

        print("\n" + "=" * 70)
        print("ANSWER:")
        print("=" * 70)
        print(result["result"])


# ------------------------------------------------------
# MAIN
# ------------------------------------------------------
def main():
    rag = BookRAG("PhysicsBook_docling.md")

    math_exists = os.path.exists(os.path.join(rag.persist_dir, "math"))
    text_exists = os.path.exists(os.path.join(rag.persist_dir, "text"))

    if math_exists and text_exists:
        rag.load_vectorstores()
    else:
        chunks = rag.load_and_chunk()
        rag.create_vectorstores(chunks)

    rag.setup_qa()

    while True:
        print("\n" + "=" * 70)
        q = input("Ask a question ('exit' to quit): ").strip()

        if q.lower() in ["exit", "quit"]:
            break
        else:
            rag.ask(q)


if __name__ == "__main__":
    main()