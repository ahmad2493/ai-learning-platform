"""
Past Papers Retrieval + Cleanup Pipeline

Usage (example, from ai-service folder):
  python past_papers_query.py --chapter 1 --n 10
  python past_papers_query.py --chapter 1 --topics 1.1 1.2 --boards LHR GRW --years 2017 2018

This uses the existing `chromadb_past_papers` vector DB created by
`past_papers_metadata.py` and applies optional LLM cleanup on the
returned questions.

LLM post-processing
-------------------
- If you set `GROQ_API_KEY` in your environment, we will call the Groq
  OpenAI-compatible chat API (`llama-3.1-70b-versatile` by default) to:
  * Reformat questions/answers
  * Infer the correct option for MCQs (A/B/C/D)
  * Fix incomplete / messy answers for short questions
- If `GROQ_API_KEY` is not set, we simply return the raw chunks
  (already reasonably clean) and skip LLM calls.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Sequence, Tuple

import requests
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from sentence_transformers import SentenceTransformer


# ---------------------------------------------------------------------------
# Embeddings wrapper (must match past_papers_metadata.py)
# ---------------------------------------------------------------------------


class SentenceTransformerEmbeddings:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.model.encode(texts).tolist()

    def embed_query(self, text: str) -> List[float]:
        return self.model.encode([text])[0].tolist()


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class PastPaperQuestion:
    id: str
    chapter_no: int
    chapter_name: str
    section: str
    topics: List[Dict[str, Any]]
    question_text: str
    options: List[str]
    correct_option: Optional[str]  # "A" / "B" / "C" / "D" for MCQs
    answer_text: Optional[str]  # For short questions, cleaned full answer
    appearances: List[Dict[str, Any]]


# In-memory cache of the JSON chunk index (id, question_text, topics, appearances, etc.).
_CHUNKS_INDEX: Optional[List[Dict[str, Any]]] = None


def _load_chunks_index(base_dir: str = ".") -> List[Dict[str, Any]]:
    """
    Load past_papers_chunks.json once and cache it.

    This JSON contains the ground-truth metadata for boards+years
    (as board-year pairs in 'appearances'), so we prefer it over
    the flattened boards/years lists stored in Chroma metadata
    when doing field-based retrieval.
    """
    global _CHUNKS_INDEX
    if _CHUNKS_INDEX is not None:
        return _CHUNKS_INDEX

    path = os.path.join(base_dir, "past_papers_chunks.json")
    with open(path, "r", encoding="utf-8") as f:
        _CHUNKS_INDEX = json.load(f)
    return _CHUNKS_INDEX


# ---------------------------------------------------------------------------
# Helpers for board / year parsing (mirrors PastPaperRAG.detect_board_and_year)
# ---------------------------------------------------------------------------


def detect_board_and_year_from_query(query: str) -> Dict[str, Any]:
    """
    Parse a natural-language query for board cities and years.

    This mirrors the behaviour of PastPaperRAG.detect_board_and_year so that
    terminal usage of this script supports the same kinds of inputs, e.g.:

      - "Give Multan board questions after 2018"
      - "Questions between 2016-2019 for Lahore board"
    """
    keywords: Dict[str, Any] = {}
    query_lower = query.lower()

    board_mappings = {
        "lahore": "LHR",
        "lhr": "LHR",
        "multan": "MLN",
        "mln": "MLN",
        "rawalpindi": "RWP",
        "rwp": "RWP",
        "sargodha": "SGD",
        "sgd": "SGD",
        "sahiwal": "SWL",
        "swl": "SWL",
        "dera ghazi khan": "DGK",
        "dgk": "DGK",
        "d.g.khan": "DGK",
        "bahawalpur": "BWP",
        "bwp": "BWP",
        "gujranwala": "GRW",
        "grw": "GRW",
        "faisalabad": "FSD",
        "fsd": "FSD",
    }

    for city_name, board_code in board_mappings.items():
        if city_name in query_lower:
            keywords["board"] = board_code
            break

    year_pattern = r"\b(20\d{2})\b"
    year_matches = re.findall(year_pattern, query)
    if year_matches:
        keywords["years"] = [int(y) for y in year_matches]

    if "after" in query_lower:
        after_match = re.search(r"after\s+(\d{4})", query_lower)
        if after_match:
            keywords["after_year"] = int(after_match.group(1))

    if "before" in query_lower:
        before_match = re.search(r"before\s+(\d{4})", query_lower)
        if before_match:
            keywords["before_year"] = int(before_match.group(1))

    if "between" in query_lower:
        between_match = re.search(r"between\s+(\d{4})\s*[-–]\s*(\d{4})", query_lower)
        if between_match:
            keywords["year_range"] = (
                int(between_match.group(1)),
                int(between_match.group(2)),
            )

    return keywords


# ---------------------------------------------------------------------------
# Vector store loading (text only, same approach as past_papers_query2.py)
# ---------------------------------------------------------------------------


def load_text_vectorstore(base_dir: str = ".") -> Chroma:
    """
    Load the text Chroma store for past papers.
    Only text_docs are used for question retrieval.

    This mirrors the working setup from past_papers_query2.py so we use the
    same persist directory and collection name.
    """
    persist_dir = os.path.join(base_dir, "chromadb_past_papers", "text")
    embeddings = SentenceTransformerEmbeddings("all-MiniLM-L6-v2")
    vs = Chroma(
        persist_directory=persist_dir,
        embedding_function=embeddings,
        collection_name="text_docs",
    )
    return vs


# ---------------------------------------------------------------------------
# LLM integration (OpenAI, optional)
# ---------------------------------------------------------------------------


def _call_openai_chat(system_prompt: str, user_prompt: str) -> Optional[str]:
    """
    Thin wrapper over OpenAI's chat completions API.

    Set OPENAI_API_KEY in your environment. You can optionally override:
      - OPENAI_MODEL (default: gpt-4o-mini)
      - OPENAI_TEMPERATURE (default: 0.1)
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "temperature": float(os.getenv("OPENAI_TEMPERATURE", "0.1")),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return content
    except Exception:
        # Fail closed: just skip LLM normalization
        return None


def normalize_mcq_with_llm(question: str, options: Sequence[str]) -> Tuple[str, List[str], Optional[str]]:
    """
    Ask LLM to:
      - clean up question wording
      - clean up options (keep same semantics)
      - infer correct option letter (A/B/C/D) if possible

    Returns (clean_question, clean_options, correct_option_letter_or_None).
    If no LLM available, returns inputs and None.
    """
    system_prompt = (
        "You are a teacher preparing 9th class Physics past-paper MCQs. "
        "You will be given a question stem and up to four options. "
        "Return JSON with fields: 'question', 'options', 'correct', 'explanation'. "
        "'options' must be an array of strings (in order A, B, C, D). "
        "'correct' must be one of 'A','B','C','D' if you can infer it reliably, "
        "otherwise null. Do not add new options; just clean wording."
    )
    user_payload = {
        "question": question,
        "options": list(options),
    }
    raw = _call_openai_chat(system_prompt, json.dumps(user_payload, ensure_ascii=False, indent=2))
    if not raw:
        return question, list(options), None
    try:
        parsed = json.loads(raw)
        q = parsed.get("question") or question
        opts = parsed.get("options") or list(options)
        correct = parsed.get("correct")
        if correct is not None:
            correct = str(correct).strip().upper()
            if correct not in {"A", "B", "C", "D"}:
                correct = None
        return q, opts, correct
    except Exception:
        return question, list(options), None


def normalize_short_with_llm(text: str) -> str:
    """
    For short questions (question + answer already concatenated),
    ask LLM to clean structure, but not change meaning.
    """
    system_prompt = (
        "You are cleaning 9th class Physics short questions with their answers. "
        "Input text includes the question and maybe its answer. "
        "Rewrite it neatly as: 'Question: ...\\nAnswer: ...' without losing any facts. "
        "Return JSON with a single field 'text'."
    )
    user_payload = {"text": text}
    raw = _call_openai_chat(system_prompt, json.dumps(user_payload, ensure_ascii=False, indent=2))
    if not raw:
        return text
    try:
        parsed = json.loads(raw)
        cleaned = parsed.get("text") or text
        return cleaned
    except Exception:
        return text


def normalize_mcqs_batch_with_llm(
    items: Sequence[Tuple[str, Sequence[str]]],
) -> List[Tuple[str, List[str], Optional[str]]]:
    """
    Batched version of MCQ normalization: processes many questions in one LLM call.

    `items` is a list of (question_text, options).
    Returns a list of (clean_question, clean_options, correct_option_or_None)
    in the same order.
    """
    if not items:
        return []

    system_prompt = (
        "You are a teacher preparing 9th class Physics past-paper MCQs. "
        "You will receive a JSON object with an array field 'items'. Each item "
        "has 'id', 'question', and 'options'. For each item, clean the wording "
        "of the question and options (without changing meaning), and infer the "
        "correct option letter if you can.\n\n"
        "Return JSON with a single field 'items', where each element is an "
        "object with fields: 'id', 'question', 'options', 'correct'.\n"
        "- 'options' must be an array of strings (order A, B, C, D).\n"
        "- 'correct' must be one of 'A','B','C','D' if you can infer it "
        "  reliably, otherwise null.\n"
        "Keep the same number of options; do not invent new options."
    )

    payload_items = []
    for idx, (q, opts) in enumerate(items):
        payload_items.append(
            {
                "id": idx,
                "question": q,
                "options": list(opts),
            }
        )

    raw = _call_openai_chat(
        system_prompt,
        json.dumps({"items": payload_items}, ensure_ascii=False, indent=2),
    )
    # Fallback: return original data if anything fails
    default_result = [(q, list(opts), None) for q, opts in items]
    if not raw:
        return default_result

    try:
        parsed = json.loads(raw)
        out_items = parsed.get("items")
        if not isinstance(out_items, list):
            return default_result

        results: List[Tuple[str, List[str], Optional[str]]] = []
        for idx, (q, opts) in enumerate(items):
            obj = out_items[idx] if idx < len(out_items) and isinstance(out_items[idx], dict) else {}
            new_q = obj.get("question") or q
            new_opts = obj.get("options") or list(opts)
            correct = obj.get("correct")
            if correct is not None:
                correct = str(correct).strip().upper()
                if correct not in {"A", "B", "C", "D"}:
                    correct = None
            results.append((new_q, new_opts, correct))
        return results
    except Exception:
        return default_result


def filter_and_correct_chunks_with_llm(questions: List[PastPaperQuestion]) -> List[PastPaperQuestion]:
    """
    Pass retrieved chunks through GPT-4o-mini to:
    - Keep only chunks that are valid 9th grade Physics past paper questions.
    - Correct any incorrect wording, grammar issues, or incomplete statements
      while preserving original meaning.
    - Return the exact text unchanged if the chunk is already correct.
    - Exclude chunks that are not actual past paper questions (headings, metadata, etc.).

    Falls back to returning questions as-is if OPENAI_API_KEY is not set or
    if the LLM call fails.
    """
    if not questions:
        return []

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return questions

    system_prompt = (
        "You are a 9th grade Physics teacher verifying past paper questions from Pakistan boards. "
        "You will receive a JSON object with an 'items' array. Each item is a retrieved chunk "
        "that may or may not be an actual past paper question.\n\n"
        "For each item:\n"
        "1. Decide if it is a valid question from a 9th grade Physics past paper "
        "(MCQ, short question, or long question).\n"
        "2. If it IS a valid past paper question:\n"
        "   - Return the text EXACTLY as-is if the wording is already correct and complete.\n"
        "   - If there are incorrect wordings, grammar mistakes, or incomplete statements, "
        "correct them without changing the scientific meaning.\n"
        "   - Set 'include' to true.\n"
        "3. If it is NOT a valid past paper question (e.g. it is a heading, table of contents, "
        "metadata, or irrelevant content), set 'include' to false.\n\n"
        "Return JSON with a single field 'items'. Each element must have:\n"
        "  'id'           : the original id (string)\n"
        "  'include'      : true or false\n"
        "  'question_text': corrected or exact question stem (string, required when include=true)\n"
        "  'options'      : corrected options array for MCQs, empty array otherwise\n"
        "  'answer_text'  : corrected answer text for short/long questions, null for MCQs\n"
    )

    payload_items = [
        {
            "id": q.id,
            "section": q.section,
            "question_text": q.question_text,
            "options": q.options or [],
            "answer_text": q.answer_text,
        }
        for q in questions
    ]

    raw = _call_openai_chat(
        system_prompt,
        json.dumps({"items": payload_items}, ensure_ascii=False, indent=2),
    )
    if not raw:
        return questions

    try:
        parsed = json.loads(raw)
        out_items = parsed.get("items", [])
        id_to_result: Dict[str, Any] = {
            str(item.get("id")): item
            for item in out_items
            if isinstance(item, dict)
        }

        filtered: List[PastPaperQuestion] = []
        for q in questions:
            result = id_to_result.get(str(q.id))
            if result is None or result.get("include", True):
                if result is not None:
                    q = PastPaperQuestion(
                        id=q.id,
                        chapter_no=q.chapter_no,
                        chapter_name=q.chapter_name,
                        section=q.section,
                        topics=q.topics,
                        question_text=result.get("question_text") or q.question_text,
                        options=result.get("options") or q.options,
                        correct_option=q.correct_option,
                        answer_text=result.get("answer_text") or q.answer_text,
                        appearances=q.appearances,
                    )
                filtered.append(q)
        return filtered
    except Exception:
        return questions


def normalize_shorts_batch_with_llm(texts: Sequence[str]) -> List[str]:
    """
    Batched version of short-question normalization: many question+answer
    texts are cleaned in a single LLM call.
    """
    if not texts:
        return []

    system_prompt = (
        "You are cleaning 9th class Physics short questions with their answers. "
        "You will receive a JSON object with an array field 'items', where each "
        "element has 'id' and 'text'. Each 'text' contains the question and its "
        "full answer. For each item, rewrite it neatly as:\n"
        "  Question: ...\\nAnswer: ...\n"
        "without losing any facts.\n\n"
        "Return JSON with a single field 'items', where each element is an "
        "object with fields: 'id' and 'text' (the cleaned text)."
    )

    payload_items = [{"id": idx, "text": t} for idx, t in enumerate(texts)]

    raw = _call_openai_chat(
        system_prompt,
        json.dumps({"items": payload_items}, ensure_ascii=False, indent=2),
    )
    if not raw:
        return list(texts)

    try:
        parsed = json.loads(raw)
        out_items = parsed.get("items")
        if not isinstance(out_items, list):
            return list(texts)

        results: List[str] = []
        for idx, t in enumerate(texts):
            obj = out_items[idx] if idx < len(out_items) and isinstance(out_items[idx], dict) else {}
            cleaned = obj.get("text") or t
            results.append(cleaned)
        return results
    except Exception:
        return list(texts)


# ---------------------------------------------------------------------------
# Retrieval & filtering
# ---------------------------------------------------------------------------


def _decode_json_field(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            data = json.loads(value)
            if isinstance(data, list):
                return data
        except Exception:
            return []
    return []


def filter_docs_by_metadata(
    docs,
    topic_numbers: Optional[Sequence[str]],
    boards: Optional[Sequence[str]],
    years: Optional[Sequence[int]],
    after_year: Optional[int] = None,
    before_year: Optional[int] = None,
    year_range: Optional[Tuple[int, int]] = None,
) -> List[Any]:
    def keep(doc) -> bool:
        md = doc.metadata or {}

        # Topics filter (if provided)
        if topic_numbers:
            topic_nums = _decode_json_field(md.get("topic_numbers"))
            if not any(t in topic_nums for t in topic_numbers):
                return False

        # Boards / years filter from metadata
        boards_meta = [b.strip().upper() for b in _decode_json_field(md.get("boards"))]
        years_meta_raw = _decode_json_field(md.get("years"))
        years_meta = [int(y) for y in years_meta_raw if isinstance(y, (int, str))]

        if boards:
            if not boards_meta or not any(b.upper() in boards_meta for b in boards):
                return False
        if years:
            if not years_meta or not any(int(y) in years for y in years_meta):
                return False

        # Extra year filters to mirror PastPaperRAG behaviour.
        if after_year is not None:
            if not years_meta or not any(int(y) > after_year for y in years_meta):
                return False

        if before_year is not None:
            if not years_meta or not any(int(y) < before_year for y in years_meta):
                return False

        if year_range is not None:
            y_min, y_max = year_range
            if not years_meta or not any(y_min <= int(y) <= y_max for y in years_meta):
                return False

        return True

    return [d for d in docs if keep(d)]


def retrieve_past_paper_questions(
    chapter_no: int,
    topic_numbers: Optional[Sequence[str]] = None,
    boards: Optional[Sequence[str]] = None,
    years: Optional[Sequence[int]] = None,
    after_year: Optional[int] = None,
    before_year: Optional[int] = None,
    year_range: Optional[Tuple[int, int]] = None,
    natural_query: Optional[str] = None,
    n_questions: int = 10,
    base_dir: str = ".",
) -> List[PastPaperQuestion]:
    """
    High-level pipeline:

    - If natural_query is provided:
        * Use Chroma + semantic search, then filter by chapter/metadata.
    - If no natural_query (pure field-based mode):
        * Use the JSON chunks index as the source of truth for
          boards/years (via 'appearances') and filter directly in Python,
          without any semantic gating. This guarantees that all questions
          matching chapter/board/year/topic constraints are considered.
    """

    # ------------------
    # Field-based mode: use JSON index only
    # ------------------
    if not natural_query:
        chunks = _load_chunks_index(base_dir)
        filtered_chunks: List[Dict[str, Any]] = []

        for c in chunks:
            if int(c.get("chapter_no", 0)) != chapter_no:
                continue

            # Topic filter
            if topic_numbers:
                topic_nums = [t.get("number") for t in c.get("topics", []) if "number" in t]
                if not any(t in topic_nums for t in topic_numbers):
                    continue

            apps = c.get("appearances", []) or []

            # Boards / years via board-year pairs
            if boards and years:
                # Require at least one appearance where BOTH board and year match
                if not apps or not any(
                    str(a.get("board", "")).strip().upper() in boards
                    and int(a.get("year")) in years
                    for a in apps
                    if "year" in a
                ):
                    continue
            elif boards:
                if not apps or not any(str(a.get("board", "")).strip().upper() in boards for a in apps):
                    continue
            elif years:
                if not apps or not any(int(a.get("year")) in years for a in apps if "year" in a):
                    continue

            # After / before / between constraints on years
            years_in_apps = [int(a.get("year")) for a in apps if "year" in a]

            if after_year is not None:
                if not years_in_apps or not any(y > after_year for y in years_in_apps):
                    continue

            if before_year is not None:
                if not years_in_apps or not any(y < before_year for y in years_in_apps):
                    continue

            if year_range is not None:
                y_min, y_max = year_range
                if not years_in_apps or not any(y_min <= y <= y_max for y in years_in_apps):
                    continue

            filtered_chunks.append(c)

        # Trim to requested number (preserve original order)
        filtered_chunks = filtered_chunks[:n_questions]

        # Optional batched LLM normalization using the JSON fields.
        use_llm = bool(os.getenv("OPENAI_API_KEY"))

        mcq_indices: List[int] = []
        mcq_payload: List[Tuple[str, Sequence[str]]] = []
        short_indices: List[int] = []
        short_payload: List[str] = []

        if use_llm:
            for idx, c in enumerate(filtered_chunks):
                section = c.get("section", "")
                q_text = c.get("question_text", "")
                options_list: List[str] = c.get("options", []) or []
                if section in ("mcq", "exercise_mcq") and options_list:
                    mcq_indices.append(idx)
                    mcq_payload.append((q_text, options_list))
                else:
                    short_indices.append(idx)
                    short_payload.append(q_text)

            if mcq_payload:
                mcq_results = normalize_mcqs_batch_with_llm(mcq_payload)
                for local_idx, global_idx in enumerate(mcq_indices):
                    clean_q, clean_opts, correct = mcq_results[local_idx]
                    c = filtered_chunks[global_idx]
                    c["question_text"] = clean_q
                    c["options"] = clean_opts
                    c["correct_option"] = correct

            if short_payload:
                short_results = normalize_shorts_batch_with_llm(short_payload)
                for local_idx, global_idx in enumerate(short_indices):
                    cleaned = short_results[local_idx]
                    c = filtered_chunks[global_idx]
                    c["answer_text"] = cleaned
        else:
            for c in filtered_chunks:
                section = c.get("section", "")
                if section not in ("mcq", "exercise_mcq"):
                    # For short/long questions we just keep the raw question_text.
                    c["answer_text"] = c.get("question_text", "")

        results_from_json: List[PastPaperQuestion] = []
        for c in filtered_chunks:
            topics_list = c.get("topics", []) or []
            appearances = c.get("appearances", []) or []
            results_from_json.append(
                PastPaperQuestion(
                    id=str(c.get("id", "")),
                    chapter_no=int(c.get("chapter_no", chapter_no)),
                    chapter_name=c.get("chapter_name", f"Chapter {chapter_no}"),
                    section=c.get("section", ""),
                    topics=topics_list,
                    question_text=c.get("question_text", ""),
                    options=c.get("options", []) or [],
                    correct_option=c.get("correct_option"),
                    answer_text=c.get("answer_text"),
                    appearances=appearances,
                )
            )

        return results_from_json

    # ------------------
    # Natural-language mode: Chroma + semantic search + metadata filters
    # ------------------
    vs = load_text_vectorstore(base_dir)
    base_query = natural_query

    candidate_docs = vs.similarity_search(
        base_query,
        k=max(n_questions * 5, 100),
    )

    # Require correct chapter first
    chapter_filtered: List[Document] = []
    for d in candidate_docs:
        md = d.metadata or {}
        try:
            ch_val = int(md.get("chapter_no", 0))
        except Exception:
            ch_val = 0
        if ch_val == chapter_no:
            chapter_filtered.append(d)

    # Post-filter by topics / boards / years / ranges using metadata
    docs = filter_docs_by_metadata(
        chapter_filtered,
        topic_numbers,
        boards,
        years,
        after_year=after_year,
        before_year=before_year,
        year_range=year_range,
    )

    # Trim / deduplicate by a stable key (prefer metadata id, else content hash)
    seen_keys = set()
    uniq_docs = []
    for d in docs:
        md = d.metadata or {}
        base_id = md.get("id") or md.get("source") or ""
        key = base_id if base_id else hash(d.page_content)
        if key not in seen_keys:
            seen_keys.add(key)
            uniq_docs.append(d)
    docs = uniq_docs[:n_questions]

    # Build intermediate structures so we can batch LLM normalization.
    intermediate: List[Dict[str, Any]] = []

    for d in docs:
        md = d.metadata or {}
        raw_doc = d.page_content
        section = md.get("section", "")
        # Options were stored as JSON string in metadata.
        options: List[str] = _decode_json_field(md.get("options"))

        # Metadata we stored when building the vector store
        chapter = int(md.get("chapter_no", chapter_no))
        chapter_name = md.get("chapter_name", f"Chapter {chapter}")
        topics_raw = _decode_json_field(md.get("topic_numbers"))
        topic_names = _decode_json_field(md.get("topic_names"))
        topics_list: List[Dict[str, Any]] = []
        for i, num in enumerate(topics_raw):
            name = topic_names[i] if i < len(topic_names) else ""
            topics_list.append({"number": num, "name": name})
        boards_meta = _decode_json_field(md.get("boards"))
        years_meta = _decode_json_field(md.get("years"))
        appearances = [
            {"board": b, "year": int(y)}
            for b in boards_meta
            for y in years_meta
        ] if boards_meta and years_meta else []

        # Reconstruct question_text (without options) from document
        # For MCQs, our stored document is: question_clean + "\n" + joined options text.
        # We split at the first option marker.
        lines = raw_doc.split("\n")
        stem_lines: List[str] = []
        option_lines: List[str] = []
        in_opts = False
        for L in lines:
            if not in_opts and any(L.strip().startswith(f"({c})") for c in "ABCD"):
                in_opts = True
            if in_opts:
                option_lines.append(L)
            else:
                stem_lines.append(L)
        question_text = "\n".join(stem_lines).strip() if stem_lines else raw_doc.strip()

        # Base options used for any later LLM normalization.
        if options:
            base_opts = options
        else:
            base_opts = [L for L in option_lines if L.strip()]

        intermediate.append(
            {
                "id": str(md.get("id", "")),
                "chapter": chapter,
                "chapter_name": chapter_name,
                "section": section,
                "topics_list": topics_list,
                "appearances": appearances,
                "raw_doc": raw_doc,
                "question_text": question_text,
                "options": options,
                "base_opts": base_opts,
                "correct_option": None,
                "answer_text": None,
            }
        )

    use_llm = bool(os.getenv("OPENAI_API_KEY"))

    # Batch LLM normalization for MCQs
    if use_llm:
        mcq_indices: List[int] = []
        mcq_payload: List[Tuple[str, Sequence[str]]] = []

        short_indices: List[int] = []
        short_payload: List[str] = []

        for idx, item in enumerate(intermediate):
            section = item["section"]
            if section in ("mcq", "exercise_mcq") and item["base_opts"]:
                mcq_indices.append(idx)
                mcq_payload.append((item["question_text"], item["base_opts"]))
            elif section not in ("mcq", "exercise_mcq"):
                short_indices.append(idx)
                short_payload.append(item["raw_doc"])

        if mcq_payload:
            mcq_results = normalize_mcqs_batch_with_llm(mcq_payload)
            for local_idx, global_idx in enumerate(mcq_indices):
                clean_q, clean_opts, correct = mcq_results[local_idx]
                item = intermediate[global_idx]
                item["question_text"] = clean_q
                item["options"] = clean_opts
                item["correct_option"] = correct

        if short_payload:
            short_results = normalize_shorts_batch_with_llm(short_payload)
            for local_idx, global_idx in enumerate(short_indices):
                cleaned = short_results[local_idx]
                item = intermediate[global_idx]
                item["answer_text"] = cleaned
    else:
        # No LLM – for short questions, just treat full doc as answer_text.
        for item in intermediate:
            if item["section"] not in ("mcq", "exercise_mcq"):
                item["answer_text"] = item["raw_doc"]

    # Convert intermediates to dataclass instances.
    results: List[PastPaperQuestion] = []
    for item in intermediate:
        q = PastPaperQuestion(
            id=item["id"],
            chapter_no=item["chapter"],
            chapter_name=item["chapter_name"],
            section=item["section"],
            topics=item["topics_list"],
            question_text=item["question_text"],
            options=item["options"],
            correct_option=item["correct_option"],
            answer_text=item["answer_text"],
            appearances=item["appearances"],
        )
        results.append(q)

    return results


# ---------------------------------------------------------------------------
# CLI for quick manual testing
# ---------------------------------------------------------------------------


def main() -> None:
    print("=== Physics Past Papers Query (interactive) ===")
    print("Leave any optional field blank to skip it.")
    print("Type 'q' at chapter prompt to quit.\n")

    while True:
        # Required: chapter
        while True:
            chapter_raw = input("Chapter number (1-9) or 'q' to quit: ").strip()
            if chapter_raw.lower() == "q":
                return
            if not chapter_raw:
                print("Chapter is required.")
                continue
            try:
                chapter = int(chapter_raw)
                break
            except ValueError:
                print("Please enter a valid integer chapter number.")

        # Optional: natural-language query
        natural_query_raw = input(
            "Natural-language query (optional, e.g. 'Multan board questions after 2018'): "
        ).strip()
        natural_query: Optional[str] = natural_query_raw or None

        # Optional: topics (space-separated like 1.1 1.2)
        topics_raw = input("Topic numbers (optional, space-separated, e.g. '1.1 1.2'): ").strip()
        topics: Optional[Sequence[str]] = topics_raw.split() if topics_raw else None

        # Optional: boards (space-separated codes: LHR GRW ...)
        boards_raw = input("Board codes (optional, space-separated, e.g. 'LHR GRW FSD'): ").strip()
        boards: Optional[Sequence[str]] = (
            [b.strip().upper() for b in boards_raw.split()] if boards_raw else None
        )

        # Optional: exact years
        years_raw = input("Years (optional, space-separated, e.g. '2017 2018'): ").strip()
        if years_raw:
            try:
                years: Optional[Sequence[int]] = [int(y) for y in years_raw.split()]
            except ValueError:
                print("Could not parse years; ignoring exact year filter.")
                years = None
        else:
            years = None

        # Optional: after / before / between
        after_year_raw = input("After year (optional, e.g. '2018'): ").strip()
        try:
            after_year: Optional[int] = int(after_year_raw) if after_year_raw else None
        except ValueError:
            print("Invalid after-year; ignoring.")
            after_year = None

        before_year_raw = input("Before year (optional, e.g. '2018'): ").strip()
        try:
            before_year: Optional[int] = int(before_year_raw) if before_year_raw else None
        except ValueError:
            print("Invalid before-year; ignoring.")
            before_year = None

        between_raw = input("Between years (optional, format 'START END', e.g. '2016 2019'): ").strip()
        between_years: Optional[Tuple[int, int]]
        if between_raw:
            parts = between_raw.split()
            if len(parts) == 2:
                try:
                    start_y, end_y = int(parts[0]), int(parts[1])
                    between_years = (start_y, end_y)
                except ValueError:
                    print("Invalid between-years format; ignoring.")
                    between_years = None
            else:
                print("Between-years must be two integers; ignoring.")
                between_years = None
        else:
            between_years = None

        # Decide a sensible default number of questions based on filters:
        # - Topic-based retrieval: around 20 chunks
        # - Chapter/board/year retrieval: around 50 chunks
        # - Both board and year selected: domain is tighter → ~30 chunks
        if topics:
            default_n = 20
        else:
            default_n = 50
        if boards and years:
            default_n = 30

        # Optional: how many questions
        n_raw = input(f"Number of questions to return (default {default_n}): ").strip()
        try:
            n_questions = int(n_raw) if n_raw else default_n
        except ValueError:
            print(f"Invalid number; defaulting to {default_n}.")
            n_questions = default_n

        # If a natural-language query is provided, hydrate board/year filters
        # from it to mirror PastPaperRAG behaviour, unless the user already
        # set those fields explicitly above.
        if natural_query:
            detected = detect_board_and_year_from_query(natural_query)

            if boards is None and "board" in detected:
                boards = [detected["board"]]
            if years is None and "years" in detected:
                years = detected["years"]
            if after_year is None and "after_year" in detected:
                after_year = detected["after_year"]
            if before_year is None and "before_year" in detected:
                before_year = detected["before_year"]
            if between_years is None and "year_range" in detected:
                between_years = detected["year_range"]

        questions = retrieve_past_paper_questions(
            chapter_no=chapter,
            topic_numbers=topics,
            boards=boards,
            years=years,
            after_year=after_year,
            before_year=before_year,
            year_range=between_years,
            # IMPORTANT:
            # - If the user did NOT type a natural-language query, we pass
            #   natural_query=None so that retrieval is 100% metadata/JSON
            #   based (field mode).
            # - If the user DID type a natural-language query, we pass it
            #   through so that semantic search is used.
            natural_query=natural_query if natural_query_raw else None,
            n_questions=n_questions,
            base_dir=".",
        )

        # Human-readable listing: question text + boards for each retrieved chunk.
        print("\n=== Retrieved Questions ===")
        for idx, q in enumerate(questions, start=1):
            # Build "BOARD YEAR" pairs, e.g. "LHR 2017".
            if q.appearances:
                pairs = sorted({f'{a["board"]} {a["year"]}' for a in q.appearances})
                boards_str = ", ".join(pairs)
            else:
                boards_str = "N/A"
            print(f"\n[{idx}] {q.question_text}")
            print(f"Boards: {boards_str}")

        print("\n--- Query finished. You can run another query or type 'q' at the chapter prompt to exit. ---\n")


if __name__ == "__main__":
    main()

