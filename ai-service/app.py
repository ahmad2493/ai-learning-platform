"""
FastAPI Application - AI Service Entry Point
Authors: 
  - Sajeela Safdar (BCSF22M001) - AI Development

Functionality:
  - FastAPI web server for AI question answering service
  - Initializes RAG system with physics textbook and past papers
  - Provides REST API endpoints for question answering
  - Handles question requests and returns AI-generated answers
"""

from fastapi import FastAPI
from pydantic import BaseModel
from BookRAG import BookRAG
from PastPaperRAG import PastPaperRAG

app = FastAPI(title="RAG API")

# Input schema
class QuestionRequest(BaseModel):
    question: str

# Initialize BookRAG
book_rag = BookRAG('PhysicsBook_docling.md')
book_rag.prepare_rag()

# Initialize PastPaperRAG
pastpaper_rag = PastPaperRAG('PastPapers9_docling.md')
pastpaper_rag.prepare_rag()

@app.get("/")
def root():
    return {
        "message": "RAG API is running.",
        "endpoints": {
            "book_questions": "POST /api/ask - Query questions from physics textbook",
            "pastpaper_questions": "POST /api/ask-pastpaper - Query questions from past papers"
        }
    }

@app.post("/api/ask")
async def ask_question(req: QuestionRequest):
    try:
        answer = book_rag.ask(req.question)
        return {"question": req.question, "answer": answer}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/ask-pastpaper")
async def ask_pastpaper_question(req: QuestionRequest):
    try:
        answer = pastpaper_rag.ask(req.question)
        return {"question": req.question, "answer": answer}
    except Exception as e:
        return {"error": str(e)}
