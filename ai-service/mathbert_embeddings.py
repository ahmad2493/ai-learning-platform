"""
MathBERT Embeddings - Mathematical Content Embedding Model
Author: Sajeela Safdar (BCSF22M001), Muhammad Ahmad (BCSF22M002)

Functionality:
  - Wraps MathBERT model for generating embeddings of mathematical content
  - Uses Hugging Face transformers (tbs17/MathBERT) for math-aware embeddings
  - Converts text to vector representations optimized for mathematical formulas
  - Implements LangChain Embeddings interface for integration with vector stores
  - Handles tokenization, model inference, and embedding generation
"""

from langchain.embeddings.base import Embeddings
from transformers import AutoTokenizer, AutoModel
import torch
import numpy as np

class MathBERTEmbeddings(Embeddings):
    def __init__(self, model_name="tbs17/MathBERT"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.eval()

    def _embed(self, texts):
        embeddings = []

        with torch.no_grad():
            for text in texts:
                inputs = self.tokenizer(
                    text,
                    return_tensors="pt",
                    truncation=True,
                    padding=True,
                    max_length=512
                )
                outputs = self.model(**inputs)
                vector = outputs.last_hidden_state.mean(dim=1).squeeze()
                embeddings.append(vector.numpy())

        return embeddings

    def embed_documents(self, texts):
        return self._embed(texts)

    def embed_query(self, text):
        return self._embed([text])[0]
