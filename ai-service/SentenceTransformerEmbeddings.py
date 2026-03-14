from sentence_transformers import SentenceTransformer
from langchain.embeddings.base import Embeddings
from typing import List
class SentenceTransformerEmbeddings(Embeddings):
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def embed_documents(self, texts: List[str]):
        return self.model.encode(texts).tolist()

    def embed_query(self, text: str):
        return self.model.encode([text])[0].tolist()