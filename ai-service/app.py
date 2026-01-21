from fastapi import FastAPI
from pydantic import BaseModel
from BookRag import BookRAG

app = FastAPI(title="BookRAG API")

# Input schema
class QuestionRequest(BaseModel):
    question: str

# Initialize RAG once
rag = BookRAG('PhysicsBook_docling.md')
rag.prepare_rag()

@app.get("/")
def root():
    return {"message": "BookRAG API is running. Use POST /api/ask to query questions."}

@app.post("/api/ask")
async def ask_question(req: QuestionRequest):
    try:
        answer = rag.ask(req.question)
        return {"question": req.question, "answer": answer}
    except Exception as e:
        return {"error": str(e)}
