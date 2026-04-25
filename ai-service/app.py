"""
FastAPI Application - AI Service Entry Point
Authors:
  - Sajeela Safdar (BCSF22M001) - AI Development

Endpoints:
  GET  /                        — health check
  POST /api/ask                 — question from physics textbook
  POST /api/ask-pastpaper       — question from past papers
  POST /api/past-papers/query   — structured past paper retrieval
  POST /api/generate-test       — generate physics test + save to MongoDB
"""

import re
from dataclasses import asdict
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from BookRAG import BookRAG
from PastPapersRag import (
    retrieve_past_paper_questions,
    cleanup_questions_with_llm,
    detect_board_and_year_from_query,
)
from test_engine import TestGenerationEngine
from auth import extract_user_id
from backend_client import save_test

app = FastAPI(title="AI Service")

# ── Request schemas ───────────────────────────────────────────────────────────

class QuestionRequest(BaseModel):
    question: str
    session_id: str

class TopicSelectionRequest(BaseModel):
    chapter: int
    topic_number: str
    topic_name: Optional[str] = None
    chapter_name: Optional[str] = None

class GenerateTestRequest(BaseModel):
    mode: str
    mcq_count: Optional[int] = 0
    short_count: Optional[int] = 0
    long_count: Optional[int] = 0
    full_chapters: Optional[List[int]] = []
    topic_selections: Optional[List[TopicSelectionRequest]] = []

class PastPaperQueryRequest(BaseModel):
    chapter_no: int
    topic_numbers: Optional[List[str]] = None
    boards: Optional[List[str]] = None
    years: Optional[List[int]] = None
    after_year: Optional[int] = None
    before_year: Optional[int] = None
    year_range: Optional[List[int]] = None  # [start_year, end_year]
    natural_query: Optional[str] = None
    n_questions: int = 10

# ── Startup ───────────────────────────────────────────────────────────────────

rag = BookRAG()
rag.prepare_rag()

engine = TestGenerationEngine()

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message": "AI Service is running.",
        "endpoints": {
            "book_questions":     "POST /api/ask",
            "pastpaper_questions": "POST /api/ask-pastpaper",
            "pastpaper_query":    "POST /api/past-papers/query",
            "generate_test":      "POST /api/generate-test",
        }
    }


@app.post("/api/ask")
async def ask_question(req: QuestionRequest):
    try:
        answer = rag.ask(req.question, req.session_id)
        return {"question": req.question, "answer": answer}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/ask-pastpaper")
async def ask_pastpaper_question(req: QuestionRequest):
    try:
        # Extract chapter number from the question
        chapter_match = re.search(r'chapter\s+(\d+)', req.question, re.IGNORECASE)
        if not chapter_match:
            return {"error": "Please mention a chapter number in your question, e.g. 'chapter 2'."}
        chapter_no = int(chapter_match.group(1))

        # Parse board / year hints from the question
        detected = detect_board_and_year_from_query(req.question)
        boards     = [detected["board"]] if "board" in detected else None
        years      = detected.get("years")
        after_year = detected.get("after_year")
        before_year = detected.get("before_year")
        year_range  = detected.get("year_range")

        questions = retrieve_past_paper_questions(
            chapter_no=chapter_no,
            boards=boards,
            years=years,
            after_year=after_year,
            before_year=before_year,
            year_range=year_range,
            natural_query=req.question,
            n_questions=10,
            base_dir="/mnt/chroma",
        )

        questions = cleanup_questions_with_llm(questions)

        return {
            "question": req.question,
            "chapter_no": chapter_no,
            "total": len(questions),
            "questions": [asdict(q) for q in questions],
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/past-papers/query")
async def query_past_papers(req: PastPaperQueryRequest):
    """
    Retrieve 9th grade Physics past paper questions by chapter/topic/board/year.
    Applies LLM cleanup to split bundled chunks and separate question from answer text.
    """
    try:
        # Parse board/year hints from natural_query if not explicitly provided.
        after_year = req.after_year
        before_year = req.before_year
        boards = req.boards
        years = req.years
        year_range = tuple(req.year_range) if req.year_range and len(req.year_range) == 2 else None

        if req.natural_query:
            detected = detect_board_and_year_from_query(req.natural_query)
            if boards is None and "board" in detected:
                boards = [detected["board"]]
            if years is None and "years" in detected:
                years = detected["years"]
            if after_year is None and "after_year" in detected:
                after_year = detected["after_year"]
            if before_year is None and "before_year" in detected:
                before_year = detected["before_year"]
            if year_range is None and "year_range" in detected:
                year_range = detected["year_range"]

        questions = retrieve_past_paper_questions(
            chapter_no=req.chapter_no,
            topic_numbers=req.topic_numbers,
            boards=boards,
            years=years,
            after_year=after_year,
            before_year=before_year,
            year_range=year_range,
            natural_query=req.natural_query,
            n_questions=req.n_questions,
            base_dir="/mnt/chroma",
        )

        questions = cleanup_questions_with_llm(questions)

        result = []
        for q in questions:
            appearances = sorted({f'{a["board"]} {a["year"]}' for a in q.appearances}) if q.appearances else []
            entry = {
                "question": q.question_text,
                "options": q.options or [],
                "answer": q.answer_text,
                "boards_years": appearances,
            }
            result.append(entry)

        return {
            "chapter_no": req.chapter_no,
            "total": len(result),
            "questions": result,
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/generate-test")
async def generate_test(req: GenerateTestRequest, request: Request):
    try:
        # 1. Extract user_id from JWT token in Authorization header
        user_id = extract_user_id(request)

        # 2. Generate the test
        result = engine.generate(req.dict())

        # 3. Save to MongoDB via backend server (server-to-server).
        #    Backend returns { test_id, expires_at }.
        #    We inject test_id into result so frontend has it.
        try:
            saved = await save_test(user_id, result)
            result["test_id"] = saved.get("test_id")
        except Exception as save_error:
            # Save failed — log and continue.
            # Frontend gets the test but cannot submit (no test_id).
            print(f"[WARN] Failed to save test to backend: {save_error}")
            result["test_id"] = None

        return result

    except HTTPException:
        raise
    except Exception as e:
        return {"error": str(e)}
