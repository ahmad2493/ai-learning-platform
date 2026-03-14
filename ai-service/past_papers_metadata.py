"""
Physics Past Papers Pipeline (No LLM, Chapter-aware)

Goal
-----
- Create high-quality, structure-aware chunks for the 9th class Physics past papers.
- Attach rich metadata (boards, years, topics, etc.) for vector search.
- Save chunks to `past_papers_chunks.json` for review.
- Create a ChromaDB instance `chromadb_past_papers`.

Run:
  cd ai-service
  python past_papers_metadata.py
"""

import json
import re
import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Iterator, Dict, Any

import chromadb
import shutil
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
from sentence_transformers import SentenceTransformer

from mathbert_embeddings import MathBERTEmbeddings

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MD_FILE = "PastPapers9.md"
OUTPUT_DIR = "chromadb_past_papers"
COLLECTION_NAME = "physics_past_papers"
JSON_OUT = "past_papers_chunks.json"
BATCH_SIZE = 50


# ---------------------------------------------------------------------------
# Citation Normalizer (OCR fixes)
# ---------------------------------------------------------------------------

VALID_BOARDS = {"LHR", "GRW", "FSD", "RWP", "MLN", "SWL", "BWP", "SGD", "DGK"}

BOARD_OCR_FIXES = {
    "SD": "SGD", "WP": "RWP", "WPG": "RWP", "RPG": "RWP", "CHR": "LHR",
    "LRGI": "LHR", "LRG": "LHR", "HRG": "LHR", "LHRG": "LHR", "FD": "FSD",
    "MN": "MLN", "WL": "SWL", "SWG": "SWL", "GKG": "DGK", "DKGI": "DGK",
    "DGI": "DGK", "DKG": "DGK", "GRGI": "GRW", "GW": "GRW", "GD": "SGD",
    "WG": "GRW", "Rwp": "RWP", "DGKGI": "DGK", "SWLGI": "SWL", "MLNGI": "MLN",
    "FSD7W": "FSD", "FSDGII": "FSD", "LHG": "LHR", "LG": "LHR", "BWPI": "BWP",
    "GWG": "GRW", "SGDPI": "SGD", "WIG": "RWP", "RWGI": "RWP",
    "URR": "LHR", "URr": "LHR", "urr": "LHR", "Gl": "GRW", "GL": "GRW",
}

def _normalize_year(y: str) -> Optional[int]:
    if not y or len(y) > 4:
        return None
    y = y.strip()
    if len(y) == 4 and y.isdigit():
        yr = int(y)
        if 2014 <= yr <= 2023: return yr
    if len(y) == 3 and y.isdigit():
        n = int(y)
        if 210 <= n <= 223: return 2000 + (n - 200)
        if 201 <= n <= 209: return {201: 2015, 202: 2020}.get(n, 2000 + (n % 10))
        if 14 <= n <= 23: return 2000 + n
        if n in (17, 18, 19, 20, 21, 22, 23): return 2000 + n
        if 15 <= n <= 23: return 2000 + n
    if len(y) == 2 and y.isdigit():
        n = int(y)
        if 14 <= n <= 23: return 2000 + n
    if len(y) == 1 and y.isdigit():
        n = int(y)
        if n in (4, 5, 6, 7, 8, 9): return 2000 + n
    return None

def _normalize_board(token: str) -> Optional[str]:
    token = token.upper().replace(".", "").strip()
    if not token: return None
    if token in VALID_BOARDS: return token
    for noisy, canonical in BOARD_OCR_FIXES.items():
        if noisy.upper() == token or noisy.upper() in token:
            return canonical
    for board in VALID_BOARDS:
        if token.startswith(board) or board in token:
            return board
    return None

def _extract_from_paren_block(inner: str, seen: set, appearances: List[Dict]) -> None:
    parts = re.split(r"[,;]", inner)
    current_boards = []
    for part in parts:
        part = part.strip()
        num_match = re.search(r"(\d{2,4})", part)
        if num_match:
            raw = num_match.group(1)
            yr = _normalize_year(raw)
            if yr and current_boards:
                for b in current_boards:
                    key = (b, yr)
                    if key not in seen:
                        seen.add(key)
                        appearances.append({"board": b, "year": yr})
                current_boards = []
            elif yr and not current_boards and appearances:
                last = appearances[-1]
                key = (last["board"], yr)
                if key not in seen:
                    seen.add(key)
                    appearances.append({"board": last["board"], "year": yr})
            continue
        tokens = re.findall(r"[A-Za-z]+", part)
        for t in tokens:
            u = t.upper()
            if u in ("GI", "G1", "GII", "G2", "G"):
                continue
            b = _normalize_board(t)
            if b: current_boards.append(b)

def extract_appearances_from_text(text: str) -> List[Dict[str, Any]]:
    if not text or not text.strip(): return []
    text = text.replace("&amp;", "&").replace("&#39;", "'")
    appearances = []
    seen = set()
    for block in re.findall(r"\([^)]*\)", text):
        _extract_from_paren_block(block[1:-1], seen, appearances)
    rest = re.sub(r"\([^)]*\)", " ", text)
    for segment in re.split(r"\s*[)\(]\s*", rest):
        segment = segment.strip()
        if not segment or len(segment) < 5: continue
        _extract_from_paren_block(segment, seen, appearances)
    for ym in re.finditer(r"\b(201[4-9]|202[0-3])\b", text):
        yr = int(ym.group(1))
        left = text[max(0, ym.start() - 40) : ym.start()]
        tokens = re.findall(r"[A-Za-z]{2,4}", left)
        for t in reversed(tokens):
            b = _normalize_board(t)
            if b:
                key = (b, yr)
                if key not in seen:
                    seen.add(key)
                    appearances.append({"board": b, "year": yr})
                break
    return appearances


# ---------------------------------------------------------------------------
# Markdown Parser
# ---------------------------------------------------------------------------

CHAPTER_TITLES = [
    ("PHYSICAL QUANTITIES AND MEASUREMENT", 1), ("KINEMATICS", 2),
    ("DYNAMICS", 3), ("TURNING EFFECT", 4), ("GRAVITATION", 5),
    ("WORK AND ENERGY", 6), ("PROPERTIES OF MATTER", 7),
    ("THERMAL", 8), ("TRANSFER OF HEAT", 9),
]

@dataclass
class ParseContext:
    chapter_no: int = 1
    chapter_name: str = ""
    section: str = "mcq"
    topic_numbers: List[str] = field(default_factory=list)
    topic_names: List[str] = field(default_factory=list)

def _match_chapter_title(line: str) -> Optional[Tuple[int, str]]:
    line = line.strip().upper()
    for name, num in CHAPTER_TITLES:
        if name in line and not line.startswith("## 1.") and not line.startswith("## 2."):
            if re.match(r"^#+\s*" + re.escape(name), line, re.IGNORECASE):
                return (num, name.replace(" AND ", " and ").title())
    return None

def _match_topic_heading(line: str) -> Optional[Tuple[List[str], List[str]]]:
    stripped = line.strip()
    if not stripped.startswith("##"):
        return None
    rest = stripped[2:].strip()
    # Strip any extra leading '#' (handles ## and ### and #### headings)
    while rest.startswith("#"):
        rest = rest[1:].strip()
    # Strip $...$ LaTeX wrapper around topic range (e.g. '$1.1+1.2+1.3$')
    rest = re.sub(r"^\$([^$]+)\$", r"\1", rest)
    num_part = re.match(r"^([\d.]+\s*\+\s*[\d.\s+]+)", rest)
    if num_part:
        num_str = num_part.group(1)
        nums = re.findall(r"\d+\.\d+", num_str)
        after_nums = rest[len(num_str):].strip()
        names = [n.strip() for n in re.split(r"\s*\+\s*", after_nums) if n.strip()] if after_nums else []
        return (nums, names)
    # Single topic heading, e.g. '1.7 Significant Figures' or '1.7: Significant Figures'
    single = re.match(r"^(\d+\.\d+)\s*[:\-\+]?\s*(.+)", rest)
    if single:
        return ([single.group(1)], [single.group(2).strip()])
    return None

def _is_section_heading(line: str) -> Optional[str]:
    upper = line.upper()
    if "CHAPTER WISE" in upper or "CHAPTERWISE" in upper or "CHAPTER-WISE" in upper:
        return "chapter_paper"
    if "EXERCISE" in upper and ("MULTIPLE CHOICE" in upper or "MULIPLE CHOICE" in upper or "MULTIPLE (HOICE" in upper):
        return "exercise_mcq"
    if "EXERCISE" in upper and "SHORT" in upper:
        return "exercise_short"
    if "SHORT QUESTIONS" in upper and ("DEVELOPED" in upper or "ACOORDING" in upper or "ACCORDING" in upper):
        return "short_question"
    if "MULTIPLE CHOICE" in upper and "DEVELOPED" in upper:
        return "mcq"
    return None

def _is_garbage_line(line: str) -> bool:
    lu = re.sub(r"\s+", "", line.upper())
    if "QUESTIONSTAKENFROMPREVIOUSPAPERS" in lu: return True
    if "SARGODHA,RAWALPINDI" in lu or "BOARDS(2014" in lu: return True
    if "MULTIPLECHOICEQUESTIONSDEVELOPED" in lu: return True
    if "SHORTQUESTIONSDEVELOPED" in lu: return True
    if "HOMDARDUP-TO-DATEPAPERS" in lu or "HAMDARDUP-TO-DATEPAPERS" in lu: return True
    if "ENCIRCLETHECORRECTANSWER" in lu or "ENCIRCLETHECORRECTOPTION" in lu: return True
    if "KNOWLEDGE,UNDERSTANDING,APPLICATION" in lu and "EDUCATIONDEPARTMENT" in lu: return True
    if re.match(r"^\s*PHYSICS\s*$", line.upper()): return True
    if re.match(r"^\s*\d+\s*$", line): return True
    if re.match(r"^\d+\.\d+\s+Encircle", line, re.IGNORECASE): return True
    if re.match(r"^\d+\s+Encircle", line, re.IGNORECASE): return True
    return False


def _is_citation_only_line(line: str) -> bool:
    """True if line looks like only board/year citation (e.g. (GRW. Gl, 2023))."""
    s = line.strip()
    if not s or len(s) > 80:
        return False
    if re.match(r"^\d+\.\s+", s):
        return False
    if re.match(r"^\([^)]*\)\s*$", s) and re.search(r"20[0-2][0-9]|LHR|GRW|FSD|RWP|MLN|SWL|BWP|SGD|DGK", s, re.IGNORECASE):
        return True
    if re.search(r"\b(?:LHR|GRW|FSD|RWP|MLN|SWL|BWP|SGD|DGK)\b", s.upper()) and re.search(r"20[12][0-9]", s) and len(s) < 60:
        return True
    return False


def _looks_like_answer_key_line(line: str) -> bool:
    """True if line looks like answer key: '9. mechanics 2. Latin' or '10. thermodynamics'."""
    s = line.strip()
    if not s or s.startswith("## "):
        return False
    m = re.match(r"^(\d+)\.\s+(.+)$", s)
    if not m:
        return False
    rest = m.group(2).strip()
    if not rest:
        return False
    if re.match(r"^\([a-dA-D]\)", rest):
        return False
    if len(rest) > 100:
        return False
    return True


def _is_answer_key_block(question_text: str, options: List[str]) -> bool:
    """True if this MCQ block is actually an answer-key line (no options, short text)."""
    if options:
        return False
    t = question_text.strip()
    if not t or len(t) > 150:
        return False
    if re.search(r"\([A-D]\)", t, re.IGNORECASE):
        return False
    return True

def parse_markdown_blocks(content: str) -> Iterator[Tuple[ParseContext, str, List[str], bool]]:
    lines = content.split("\n")
    ctx = ParseContext()
    orphan_lines = []
    pending_line = None
    i = 0
    while i < len(lines):
        consumed_line = True
        if pending_line is not None:
            stripped = pending_line
            pending_line = None
            consumed_line = False
        else:
            line = lines[i]
            stripped = line.strip()

        if stripped.startswith("##"):
            orphan_lines = []  # Reset on new headers
            ch = _match_chapter_title(stripped)
            if ch:
                # New chapter: reset context for section and topics
                ctx.chapter_no, ctx.chapter_name = ch
                ctx.section = "mcq"
                ctx.topic_numbers = []
                ctx.topic_names = []
                if consumed_line:
                    i += 1
                continue
            topic = _match_topic_heading(stripped)
            if topic:
                # Only update topic context outside exercise sections.
                # exercise_mcq / exercise_short topic headings should not re-tag questions.
                # chapter_paper is allowed because a new chapter's topics start appearing
                # inside the previous chapter's chapter_paper boundary.
                if ctx.section not in ("exercise_mcq", "exercise_short"):
                    ctx.topic_numbers, ctx.topic_names = topic
                    m = re.match(r"^(\d+)\.", topic[0][0]) if topic[0] else None
                    if m:
                        new_chap = int(m.group(1))
                        if new_chap != ctx.chapter_no:
                            ctx.chapter_no = new_chap
                            # Also update chapter_name so it stays in sync
                            for cname, cnum in CHAPTER_TITLES:
                                if cnum == new_chap:
                                    ctx.chapter_name = cname.replace(" AND ", " and ").title()
                                    break
                            # A new chapter's topic appearing inside chapter_paper means
                            # we've transitioned past the sample paper into new content.
                            if ctx.section == "chapter_paper":
                                ctx.section = "mcq"
                if consumed_line:
                    i += 1
                continue
            sec = _is_section_heading(stripped)
            if sec:
                # Entering a new section. Clear topics when entering exercise or
                # chapter_paper sections; also clear orphan_lines on chapter_paper
                # to avoid Roll No./bubble-sheet noise getting prepended to questions.
                ctx.section = sec
                if sec in ("exercise_mcq", "exercise_short", "chapter_paper"):
                    ctx.topic_numbers = []
                    ctx.topic_names = []
                if sec == "chapter_paper":
                    orphan_lines = []
                if consumed_line:
                    i += 1
                continue
            if bool(re.match(r"^#+\s*Answers?\s*", stripped, re.IGNORECASE)) or "Answersi." in stripped:
                while i < len(lines) and (not lines[i].strip().startswith("##") or lines[i].strip() == stripped):
                    i += 1
                continue
            # Generic header (e.g. '## As we know', '## Formula:', etc.).
            # Do NOT clear topic context here — minor content headers inside a
            # topic section should not wipe the current topic assignment.
            if consumed_line:
                i += 1
            continue

        mcq_start = re.match(r"^(\d+\.|\s*[ivxIVX]+\.)\s*(.*)", stripped)
        if mcq_start and ctx.section in ("mcq", "exercise_mcq"):
            rest = (mcq_start.group(2) or "").strip()
            if _is_garbage_line(rest) or (rest and "ENCIRCLE" in rest.upper()):
                orphan_lines = []
                if consumed_line:
                    i += 1
                continue
            q_lines = orphan_lines + ([rest] if rest else [])
            orphan_lines = []
            j = i + 1
            options = []
            trailing_citations = []
            while j < len(lines):
                ll = lines[j].strip()
                if not ll:
                    j += 1
                    continue
                if ll.startswith("##"):
                    break
                if _is_garbage_line(ll):
                    j += 1
                    continue
                next_q = re.match(r"^(\d+\.|\s*[ivxIVX]+\.)\s*", ll)
                if next_q and j > i:
                    break
                is_opt = bool(re.match(r"^(?:-)?\s*\([a-dA-D]\)", ll))
                if options and (ll.startswith("-") or re.match(r"^\s*\([a-dA-D]\)", ll)):
                    is_opt = True
                if options and _is_citation_only_line(ll):
                    trailing_citations.append(ll)
                    j += 1
                    continue
                if not options and _is_citation_only_line(ll):
                    q_lines.append(ll)
                    j += 1
                    continue
                if is_opt:
                    opt_line = ll
                    j += 1
                    while j < len(lines) and lines[j].strip().startswith("![]("):
                        opt_line += "\n" + lines[j].strip()
                        j += 1
                    options.append(opt_line)
                    continue
                is_citation = bool(re.search(r"\b(?:LHR|GRW|FSD|RWP|MLN|SWL|BWP|SGD|DGK)\b", ll.upper())) and len(ll) < 60
                if not is_citation:
                    q_lines.append(ll)
                j += 1
            question_text = " ".join(q_lines)
            if _is_answer_key_block(question_text, options) and j < len(lines) and _looks_like_answer_key_line(lines[j].strip()):
                while j < len(lines):
                    line_j = lines[j].strip()
                    if line_j.startswith("##"):
                        break
                    if not _looks_like_answer_key_line(line_j):
                        break
                    j += 1
                i = j
                continue
            trailing_text = " ".join(trailing_citations) if trailing_citations else None
            yield (ParseContext(**ctx.__dict__), question_text, options, True, trailing_text)
            i = j
            continue

        # Q\d+ long questions (e.g. "Q5. (a) Define... (b) ...") from chapter-wise papers.
        # These appear in various section contexts; yield them so main() can split by (a)/(b).
        q_long = re.match(r"^Q(\d+)\.\s*(.*)", stripped)
        if q_long and ctx.section not in ("exercise_mcq",):
            q_lines = [stripped]
            orphan_lines = []
            j = i + 1
            while j < len(lines):
                ll = lines[j].strip()
                if ll.startswith("##"): break
                if re.match(r"^Q\d+\.", ll): break
                if ll and not _is_garbage_line(ll):
                    q_lines.append(ll)
                j += 1
            yield (ParseContext(**ctx.__dict__), "\n".join(q_lines), [], False, None)
            i = j
            continue

        if ctx.section in ("short_question", "exercise_short") and stripped:
            # Match numbered question formats:
            #   "1. text"        – plain numbered short question
            #   "1.2: text"      – textbook exercise question (n.m: format)
            #   "Q.1: text"      – long-form exercise question (Q.n: format)
            sq_num = (re.match(r"^(\d+(?:\.\d+)?)[.:]\s+(.+)", stripped)
                      or re.match(r"^Q\.(\d+)[:.]\s*(.*)", stripped))
            if sq_num:
                q_lines = orphan_lines + [sq_num.group(2)]
                orphan_lines = []
                j = i + 1
                while j < len(lines):
                    ll = lines[j].strip()
                    if re.match(r"^\d+(?:\.\d+)?[.:]\s+", ll) and j > i + 1: break
                    if re.match(r"^Q\.\d+[:.]\s*", ll) and j > i + 1: break
                    if ll.startswith("##"): break
                    if ll and not _is_garbage_line(ll):
                        m = re.search(r"\s+(\d+)\.\s+(.+)", ll)
                        if m and j > i + 1:
                            before = ll[: m.start()].strip()
                            if before:
                                q_lines.append(before)
                            pending_line = m.group(1) + ". " + m.group(2)
                            j += 1
                            break
                        q_lines.append(ll)
                    j += 1
                yield (ParseContext(**ctx.__dict__), "\n".join(q_lines), [], False, None)
                i = j
                continue
        
        if stripped:
            if not _is_garbage_line(stripped):
                orphan_lines.append(stripped)
        if consumed_line:
            i += 1


# ---------------------------------------------------------------------------
# Chunk Builder
# ---------------------------------------------------------------------------

def strip_citation_from_question(text: str) -> str:
    if not text: return text
    def replace_paren(m):
        if re.search(r"[A-Z]{2,4}[.\s]*G[I1]+|20[0-2][0-9]", m.group(1)): return " "
        return m.group(0)
    text = re.sub(r"\(([^)]*)\)", replace_paren, text)
    text = re.sub(r"\(\s*[A-Z]{2,4}[.\s]*G[Il12]+[^)]*?$", " ", text)
    text = re.sub(r"\s+[A-Z]{2,4}\d*[A-Z]*\s*$", " ", text)
    text = " ".join(text.split()).strip()
    if re.match(r"^-\s+", text) and not re.match(r"^-\s*\([a-dA-D]\)", text, re.IGNORECASE):
        text = text.lstrip("- ").strip()
    return text

def build_chunk(ctx: ParseContext, raw_question_block: str, options: list, is_mcq: bool, chunk_id: str, appearances_from_previous: Optional[str] = None):
    apps = list(extract_appearances_from_text(appearances_from_previous or "")) if appearances_from_previous else []
    seen = {(a["board"], a["year"]) for a in apps}
    for a in extract_appearances_from_text(raw_question_block):
        k = (a["board"], a["year"])
        if k not in seen:
            seen.add(k)
            apps.append(a)
    boards = sorted(list(set(a["board"] for a in apps)))
    years = sorted(list(set(a["year"] for a in apps)))

    question_block_only = raw_question_block
    if is_mcq and options:
        lines = raw_question_block.split("\n")
        q_lines = []
        for L in lines:
            if re.match(r"^\s*(?:-)?\s*\([a-dA-D]\)", L.strip()): break
            q_lines.append(L)
        question_block_only = "\n".join(q_lines)

    question_clean = strip_citation_from_question(question_block_only)
    if not question_clean and raw_question_block:
        first_line = raw_question_block.split("\n")[0].strip()
        question_clean = strip_citation_from_question(first_line)
    if not question_clean or len(question_clean) < 5:
        return None

    if is_mcq and options:
        opt_texts = [re.sub(r"^\s*-\s*(?:\([A-Za-z]\)\s*)?", "", o).strip() for o in options if re.sub(r"^\s*-\s*(?:\([A-Za-z]\)\s*)?", "", o).strip()]
        doc = question_clean + "\n" + "\n".join(opt_texts)
    else:
        doc = question_clean

    metadata = {
        "chapter_no": ctx.chapter_no,
        "chapter_name": ctx.chapter_name or f"Chapter {ctx.chapter_no}",
        "section": ctx.section,
        # ChromaDB < 0.4.24 does not support list metadata out of the box,
        # so we dump them to JSON strings. They can be loaded back on query.
        "topic_numbers": json.dumps(ctx.topic_numbers if ctx.topic_numbers else []),
        "topic_names": json.dumps(ctx.topic_names if ctx.topic_names else []),
        "boards": json.dumps(boards),
        "years": json.dumps(years),
        # Store MCQ options (as JSON string for Chroma compatibility).
        "options": json.dumps(options if is_mcq else []),
    }
    
    topics = []
    if ctx.section not in ("exercise_mcq", "exercise_short") and ctx.topic_numbers and ctx.topic_names:
        for n, name in zip(ctx.topic_numbers, ctx.topic_names):
            topics.append({"number": n, "name": name})
    elif ctx.section not in ("exercise_mcq", "exercise_short") and ctx.topic_numbers:
        topics = [{"number": n, "name": ""} for n in ctx.topic_numbers]

    return {
        "id": chunk_id,
        "document": doc,
        "metadata": metadata,
        "appearances": apps,
        "question_text": question_clean,
        "options": options if is_mcq else [],
        "is_mcq": is_mcq,
        "topics": topics,
    }


# ---------------------------------------------------------------------------
# Main Pipeline
# ---------------------------------------------------------------------------

def main():
    base = Path(__file__).resolve().parent
    md_path = base / MD_FILE
    if not md_path.exists():
        print(f"Error: Could not find {md_path}")
        return

    content = md_path.read_text(encoding="utf-8", errors="replace")
    print(f"Loaded markdown: {len(content)} characters.")
    
    chunks = []
    chunk_index = 0
    last_trailing_citations = None
    for ctx, q_text, opts, is_mcq, trailing_citations in parse_markdown_blocks(content):
        raw_block = q_text + ("\n" + "\n".join(opts) if opts else "")

        # Special handling for composite long questions in chapter-wise papers, e.g.:
        # "Q5. (a) ... (boards...) (b) ... (boards...)"
        # These can appear in short_question, exercise_short, chapter_paper, or mcq sections.
        if (not is_mcq and not opts
                and re.match(r"Q\d+\.", q_text.lstrip())):
            # Split into sub-questions by letter parts (a), (b), (c)...
            segments = re.split(r"(\([a-dA-D]\))", raw_block)
            current = ""
            subblocks = []
            for seg in segments:
                if re.fullmatch(r"\([a-dA-D]\)", seg.strip()):
                    if current.strip():
                        subblocks.append(current.strip())
                    current = seg
                else:
                    current += seg
            if current.strip():
                subblocks.append(current.strip())

            for sub in subblocks:
                m_letter = re.match(r"\(([a-dA-D])\)", sub.strip())
                if not m_letter:
                    continue
                letter = m_letter.group(1).lower()
                # Remove leading "Q<number>." if present
                sub_clean = re.sub(r"^Q\d+\.\s*", "", sub).strip()
                # Skip fragments that are MCQ option values rather than actual long question parts.
                # Strip all LaTeX math and keep only plain alphabetic text; if there are
                # fewer than 3 real words (3+ chars), the fragment is just a formula or short option.
                plain = re.sub(r"\$[^$]+\$", " ", sub_clean)   # remove inline LaTeX
                plain = re.sub(r"[^a-zA-Z\s]", " ", plain)     # keep only letters + spaces
                if len(re.findall(r"[a-zA-Z]{3,}", plain)) < 3:
                    continue
                chunk_id = f"ch{ctx.chapter_no}_{ctx.section}_{chunk_index:04d}_{letter}"
                rec = build_chunk(ctx, sub_clean, [], False, chunk_id, appearances_from_previous=last_trailing_citations)
                if rec:
                    chunks.append(rec)
                chunk_index += 1
            last_trailing_citations = trailing_citations
            continue

        # Normal path for MCQs and simple short/exercise questions
        chunk_id = f"ch{ctx.chapter_no}_{ctx.section}_{chunk_index:04d}"
        rec = build_chunk(ctx, raw_block, opts, is_mcq, chunk_id, appearances_from_previous=last_trailing_citations)
        last_trailing_citations = trailing_citations
        if rec:
            chunks.append(rec)
        chunk_index += 1

    print(f"Generated {len(chunks)} question chunks.")

    # Save to JSON
    json_path = base / JSON_OUT
    out_list = []
    for c in chunks:
        out_list.append({
            "id": c["id"],
            "question_text": c["question_text"],
            "options": c["options"],
            "chapter_no": c["metadata"]["chapter_no"],
            "chapter_name": c["metadata"]["chapter_name"],
            "section": c["metadata"]["section"],
            "topics": c["topics"],
            "appearances": c["appearances"]
        })
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(out_list, f, indent=2, ensure_ascii=False)
    print(f"Saved chunks to {json_path}")

    # Generate Embeddings & save to Chroma in math/text folders
    # Rebuild vector store folder from scratch to avoid mixing old data
    chroma_path = base / OUTPUT_DIR
    if chroma_path.exists():
        print(f"\nRemoving old vector DB folder: {chroma_path}")
        shutil.rmtree(chroma_path, ignore_errors=True)
    chroma_path.mkdir(exist_ok=True)

    math_docs = []
    text_docs = []

    for c in chunks:
        doc = Document(page_content=c["document"], metadata=c["metadata"])
        # Check for LaTeX-style math markers
        if "$$" in c["document"] or "\\[" in c["document"] or "\\]" in c["document"]:
            math_docs.append(doc)
        else:
            text_docs.append(doc)

    print("\nChunk distribution:")
    print(f"  Total chunks: {len(chunks)}")
    print(f"  Math chunks:  {len(math_docs)}")
    print(f"  Text chunks:  {len(text_docs)}")

    if math_docs:
        print("\nBuilding MathBERT vector store for past papers...")
        math_embeddings = MathBERTEmbeddings()
        Chroma.from_documents(
            documents=math_docs,
            embedding=math_embeddings,
            persist_directory=str(chroma_path / "math"),
            collection_name="math_docs",
        )
        print("  [OK] Math vector store created.")
    else:
        print("\n[INFO] No math chunks detected – skipping MathBERT store.")

    if text_docs:
        print("\nBuilding text vector store with SentenceTransformer (all-MiniLM-L6-v2)...")

        class SentenceTransformerEmbeddings:
            def __init__(self):
                self.model = SentenceTransformer("all-MiniLM-L6-v2")

            def embed_documents(self, texts: List[str]):
                return self.model.encode(texts).tolist()

            def embed_query(self, text: str):
                return self.model.encode([text])[0].tolist()

        text_embeddings = SentenceTransformerEmbeddings()
        Chroma.from_documents(
            documents=text_docs,
            embedding=text_embeddings,
            persist_directory=str(chroma_path / "text"),
            collection_name="text_docs",
        )
        print("  [OK] Text vector store created.")

    print(f"\nSuccessfully saved embedded chunks to ChromaDB at ./{OUTPUT_DIR}")

if __name__ == "__main__":
    main()
