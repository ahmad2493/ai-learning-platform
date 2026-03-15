"""
Physics Book Metadata Pipeline v2 (No LLM, Chapter-aware)

Goal
-----
- Create high-quality, structure-aware chunks for the 9th class Physics book.
- Attach rich metadata so you can answer queries like:
  - "Explain topic 1.5"
  - "Explain the subheading Measuring cylinder"
  - "Explain example 2.3"
  - "Explain numerical 1.7"
  - "Explain the exercise of chapter 4"
- Initially process only selected chapters (e.g. 1 and 2) so you can validate quality
  before running for the whole book.

Key design decisions
---------------------
- NO LLM is used in this pipeline. All structure is inferred via regex and markdown
  patterns from `PhysicsBook_docling.md`.
- Chunk boundaries follow the textbook structure:
  - Chapter introduction, student learning outcomes
  - Main topics (e.g. 1.3 International System of Units)
  - Subtopics (e.g. Derived Units, SI Prefixes)
  - Quick Quiz, For Your Information, Activities
  - Examples (Example 1.1, Example 2.3, etc.)
  - Exercise sections A–E (MCQs, short, constructed, comprehensive, numerical problems)
  - Individual exercise questions (1.1, 1.2, ..., 1.10, etc.) are each separate chunks.
- Each chunk carries metadata fields tailored for your use‑cases.

How to run (example)
---------------------
    cd ai-service
    python physics_book_metadata_v2.py

By default this will:
  - Read `PhysicsBook_docling.md`
  - Parse ONLY chapters 1 and 2
  - Create a new Chroma DB under `./chromadb_with_metadata_v2`
    (math and text subfolders)

Later you can change `CHAPTERS_TO_INCLUDE` below to process more chapters.
"""

from __future__ import annotations

import os
import re
import json
import shutil
from dataclasses import dataclass, asdict
from typing import Dict, Iterable, List, Optional, Tuple

from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
from langchain_community.vectorstores.utils import filter_complex_metadata
from sentence_transformers import SentenceTransformer

from mathbert_embeddings import MathBERTEmbeddings


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MARKDOWN_FILE = "PhysicsBook_docling.md"

# New output directory so you do not overwrite the previous DB
OUTPUT_DIR = "./chromadb_with_metadata_v2"

# The PDF was converted in batches of 5 pages with "---" separators
PAGES_PER_BATCH = 5

# None = whole book; or e.g. {1, 2} for chapters 1–2 only
CHAPTERS_TO_INCLUDE: Optional[Iterable[int]] = None


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class ChapterInfo:
    number: int
    title: str
    start_page: int


@dataclass
class ParseState:
    chapter_number: Optional[int] = None
    chapter_name: Optional[str] = None
    topic_number: Optional[str] = None          # MAIN topic number, e.g. "1.3"
    topic_name: Optional[str] = None            # MAIN topic name
    subtopic_name: Optional[str] = None         # for subheadings
    section_kind: str = "theory"                # theory / example / exercise_mcq / ... / table
    example_number: Optional[str] = None        # e.g. "1.2"
    exercise_section: Optional[str] = None      # "A"..."E"
    exercise_question_number: Optional[str] = None  # e.g. "1.7"
    table_number: Optional[str] = None          # e.g. "1.3" for Table 1.3
    page_start: Optional[int] = None            # batch start page (approximate)
    page_end: Optional[int] = None              # batch end page (approximate)

    def to_metadata(self) -> Dict:
        """
        Convert current state into metadata dict for a chunk.

        For subtopic chunks we store both the subtopic and its parent topic.
        For main-topic chunks subtopic_name will be None.
        """
        is_subtopic = self.subtopic_name is not None

        # User requirement:
        # - For subheadings (no numbering): topic_number should be null
        #   and parent_topic_number should hold the real 1.x number.
        # - For main topics: topic_number is 1.x and parent_* is null.
        if is_subtopic:
            topic_number = None
            topic_name = self.subtopic_name
            parent_topic_number = self.topic_number
            parent_topic_name = self.topic_name
        else:
            topic_number = self.topic_number
            topic_name = self.topic_name
            parent_topic_number = None
            parent_topic_name = None

        metadata = {
            "chapter_number": self.chapter_number,
            "chapter_name": self.chapter_name,
            "topic_number": topic_number,
            "topic_name": topic_name,
            "is_subtopic": is_subtopic,
            "parent_topic_number": parent_topic_number,
            "parent_topic_name": parent_topic_name,
            # High-level content classification
            #   theory / example / exercise_mcq / exercise_short / exercise_constructed /
            #   exercise_comprehensive / exercise_numerical / quick_quiz / activity /
            #   info_box / learning_outcomes / chapter_intro / mini_exercise
            "section_kind": self.section_kind,
            # Numbered references for examples / numericals / exercise questions
            "example_number": self.example_number,
            "exercise_section": self.exercise_section,  # "A".."E"
            "exercise_question_number": self.exercise_question_number,
            "table_number": self.table_number,  # e.g. "1.3" for Table 1.3
            # Approximate page range derived from PDF conversion batches
            "page_start": self.page_start,
            "page_end": self.page_end,
        }

        return metadata


# ---------------------------------------------------------------------------
# Utility: parse table of contents to get chapter titles + starting pages
# ---------------------------------------------------------------------------


def parse_table_of_contents(full_text: str) -> Dict[str, ChapterInfo]:
    """
    Parse the "CONTENTS" table near the top of PhysicsBook_docling.md.

    Returns a mapping from chapter title to ChapterInfo.
    """
    toc_start = full_text.find("## CONTENTS")
    if toc_start == -1:
        raise ValueError("Could not find '## CONTENTS' in markdown.")

    about_idx = full_text.find("## AbouttheAuthor", toc_start)
    if about_idx == -1:
        raise ValueError("Could not find '## AbouttheAuthor' after contents.")

    toc_block = full_text[toc_start:about_idx]
    chapters: Dict[str, ChapterInfo] = {}

    # First column can be digit or single non-digit char (e.g. OCR "了" for chapter 7)
    row_pattern = re.compile(
        r"^\|\s*(\d+|\S)\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|", re.MULTILINE
    )

    for m in row_pattern.finditer(toc_block):
        col1, title, start_page_str = m.group(1), m.group(2).strip(), m.group(3)
        start_page = int(start_page_str)
        if col1.isdigit():
            number = int(col1)
        else:
            # OCR glitch: e.g. "了" instead of 7 for "Thermal Properties of Matter"
            if "Thermal" in title or "Thermal Properties" in title:
                number = 7
            else:
                continue  # skip non-chapter rows like Bibliography
        chapters[title] = ChapterInfo(number=number, title=title, start_page=start_page)

    if not chapters:
        raise ValueError("Failed to parse any chapter rows from contents table.")

    return chapters


# ---------------------------------------------------------------------------
# Core parsing functions
# ---------------------------------------------------------------------------


def iter_lines_with_page_batches(text: str) -> Iterable[Tuple[int, str, int, int]]:
    """
    Iterate over lines with approximate page range.

    The PDF was converted in batches of 5 pages separated by a line containing
    just '---'. We map:
        batch 0 -> pages 1-5
        batch 1 -> pages 6-10
        ...

    Yields: (line_index, line_text, page_start, page_end)
    """
    lines = text.splitlines()
    batch_index = 0
    page_start = 1
    page_end = page_start + PAGES_PER_BATCH - 1

    for idx, raw in enumerate(lines):
        if raw.strip() == "---":
            batch_index += 1
            page_start = batch_index * PAGES_PER_BATCH + 1
            page_end = page_start + PAGES_PER_BATCH - 1
            continue
        yield idx, raw, page_start, page_end


# Regex to extract figure references: Fig. 1.15, Fig. 1.15-a, Fig. 1.4b, 2.1 (a)
# Order matters for assigning fid; (a)(b) patterns before plain number to avoid 1.4 matching inside 1.4b
FIGURE_PATTERNS = [
    (re.compile(r"(?:Fig\.?|Figure)\s*(\d+\.\d+)\s*[-–]\s*([a-d])", re.I), "ab"),   # Fig. 1.15-a
    (re.compile(r"(?:Fig\.?|Figure)\s*(\d+\.\d+)\s*\(([a-d])\)", re.I), "paren"),  # Fig. 1.15 (a)
    (re.compile(r"(?:Fig\.?|Figure)\s*(\d+\.\d+)([a-d])\b", re.I), "ab"),          # Fig. 1.4b (no hyphen)
    (re.compile(r"(?:Fig\.?|Figure)\s*(\d+\.\d+)", re.I), "plain"),                 # Fig. 1.15
    (re.compile(r"\b(\d+\.\d+)\s*\(([a-d])\)"), "paren"),                         # 2.1 (a)
]


def extract_all_figures_from_content(content: str) -> List[str]:
    """
    Extract all figure references in order of first occurrence.
    Returns e.g. ["1.3", "1.4-a", "1.4-b"] for content mentioning Fig. 1.3, Fig. 1.4-a, Fig. 1.4b.
    """
    matches: List[Tuple[int, str]] = []  # (start_pos, fid)
    for pat, kind in FIGURE_PATTERNS:
        for m in pat.finditer(content):
            g = m.groups()
            if len(g) == 2:
                if kind == "ab":
                    fid = f"{g[0]}-{g[1]}"
                else:
                    fid = f"{g[0]} ({g[1]})"
            else:
                fid = g[0]
            matches.append((m.start(), fid))
    matches.sort(key=lambda x: x[0])
    seen: set = set()
    result: List[str] = []
    for _, fid in matches:
        if fid not in seen:
            seen.add(fid)
            result.append(fid)
    return result


def flush_chunk(
    chunks: List[Document],
    buffer: List[str],
    state: ParseState,
) -> None:
    """Create a Document from the current buffer and parsing state."""
    content = "\n".join(buffer).strip()
    if not content:
        buffer.clear()
        return

    # Clean OCR math noise and improve readability (especially for examples/numericals).
    content = clean_ocr_math_noise(content)

    metadata = state.to_metadata()
    metadata["figure_numbers"] = extract_all_figures_from_content(content)

    chunks.append(Document(page_content=content, metadata=metadata))
    buffer.clear()


def clean_ocr_math_noise(text: str) -> str:
    """
    Docling OCR sometimes produces extremely noisy LaTeX:
    - spaced digits: "1 0 ^ { 4 }" instead of "10^{4}"
    - spaced decimals: "2 , 5 7" instead of "2.57"
    - huge repeated arrow/array artifacts like "\\underset{0}{\\longleftrightarrow} ..."

    We keep this intentionally conservative so we don't destroy valid content.
    """
    t = text

    # 1) Remove the worst repeated arrow artifacts (they blow up chunk size).
    t = re.sub(
        r"(\\underset\s*\{\s*0\s*\}\s*\{\s*\\longleftrightarrow\s*\}\s*\\begin\{array\}\s*\{\s*c\s*\}\s*\\leftarrow\s*\\end\{array\}\s*){3,}",
        " ",
        t,
        flags=re.IGNORECASE,
    )
    t = re.sub(r"\\beginuser\s*\{\s*s\s*\}", " ", t, flags=re.IGNORECASE)
    t = re.sub(
        r"(\\underset\s*\{\s*0\s*\}\s*\{\s*\\longmapsto\s*\}\s*){5,}",
        " ",
        t,
        flags=re.IGNORECASE,
    )

    # 2) In LaTeX-y text, merge spaced digits (very common in OCR).
    # Apply repeatedly to collapse long sequences.
    for _ in range(3):
        t = re.sub(r"(?<=\d)\s+(?=\d)", "", t)

    # 3) Fix spaced commas used as decimal separators: "2,57" often becomes "2, 57" or "2 , 57"
    t = re.sub(r"(\d)\s*,\s*(\d)", r"\1.\2", t)

    # 4) Collapse excessive spaces
    t = re.sub(r"[ \t]{2,}", " ", t)

    return t.strip()


def parse_book_to_chunks(
    full_text: str,
    chapter_infos: Dict[str, ChapterInfo],
    chapters_to_include: Optional[Iterable[int]] = None,
) -> List[Document]:
    """
    Main parsing function.

    Walks through the markdown line by line, tracking:
      - current chapter
      - main topic (1.x)
      - subtopic headings
      - examples
      - exercise sections and questions
    Produces a list of Documents with rich metadata.
    """
    # None = whole book; otherwise filter to specified chapters
    if chapters_to_include is None:
        chapters_to_include_set = {
            info.number for info in chapter_infos.values()
            if isinstance(info.number, int) and 1 <= info.number <= 9
        }
    else:
        chapters_to_include_set = set(chapters_to_include)

    def normalize_chapter_title(t: str) -> str:
        """Collapse spaces and fix OCR glues like 'ofMatter' -> 'of Matter' for matching TOC."""
        t = re.sub(r"\s+", " ", t).strip()
        t = re.sub(r"of([A-Z])", r"of \1", t)
        return t

    chapter_title_to_info = {info.title: info for info in chapter_infos.values()}
    chapter_titles = set(chapter_title_to_info.keys())
    chapter_title_lower_to_info = {info.title.lower(): info for info in chapter_infos.values()}
    # Normalized (spaces collapsed, "ofX" -> "of X") for headings like "Thermal Properties ofMatter"
    chapter_title_normalized_to_info = {
        normalize_chapter_title(info.title): info for info in chapter_infos.values()
    }
    chapter_title_normalized_lower_to_info = {
        normalize_chapter_title(info.title).lower(): info for info in chapter_infos.values()
    }

    chapter_number_to_start_page = {info.number: info.start_page for info in chapter_infos.values()}
    chapter_number_to_info = {info.number: info for info in chapter_infos.values()}

    chunks: List[Document] = []
    buffer: List[str] = []
    state = ParseState()

    # When a table appears right after a new numerical question line (e.g. 6.11) in Section E,
    # it often belongs to the *previous* numerical (6.10). We collect it and merge into previous chunk.
    collecting_table_for_previous = False
    table_for_previous_buffer: List[str] = []

    # Regex patterns reused below
    topic_re = re.compile(r"^##\s+(\d+\.\d+)\s+(.+)")
    example_re = re.compile(r"^##\s*Example\s*(\d+\.\d+)", re.IGNORECASE)  # "Example 5.5" or "Example5.5"
    quick_quiz_re = re.compile(r"^##\s*Quick Quiz", re.IGNORECASE)
    info_re = re.compile(r"^##\s*(For Your Information!?|Do You Know\?)", re.IGNORECASE)
    activity_re = re.compile(r"^##\s*Activity", re.IGNORECASE)
    mini_exercise_re = re.compile(r"^##\s*Mini Exercise", re.IGNORECASE)
    key_points_re = re.compile(r"^##\s*Key Points", re.IGNORECASE)

    exercise_heading_re = re.compile(r"^##\s*EXERCISE", re.IGNORECASE)
    section_a_re = re.compile(r"^##\s*A\s+Multiple Choice Questions", re.IGNORECASE)
    section_b_re = re.compile(r"^##\s*B\s+Short Answer Questions", re.IGNORECASE)
    section_c_re = re.compile(r"^##\s*Constructed Response Questions", re.IGNORECASE)
    section_d_re = re.compile(r"^##\s*D\s+Comprehensive Questions", re.IGNORECASE)
    section_e_re = re.compile(r"^##\s*E\s+Numerical Problems", re.IGNORECASE)

    student_outcomes_re = re.compile(r"^##\s*Student Learning Outcomes", re.IGNORECASE)
    table_caption_re = re.compile(r"^Table\s*(\d+\.\d+)\s*:?", re.IGNORECASE)

    # Helper to know when we are inside an exercise block
    in_exercise_block = False
    in_example_block = False
    in_table_block = False
    table_buffer: List[str] = []
    pending_table_number: Optional[str] = None

    # Improve page numbers by aligning the first included chapter to its TOC page.
    # We compute a global offset so that batch-based pages map closer to book pages.
    page_offset: Optional[int] = None

    def apply_page_offset(ps: int, pe: int) -> Tuple[int, int]:
        if page_offset is None:
            return ps, pe
        return ps + page_offset, pe + page_offset

    def set_state_pages(ps: int, pe: int) -> None:
        aps, ape = apply_page_offset(ps, pe)
        state.page_start = aps
        state.page_end = ape

    # Iterator over lines with page batch information
    for _, line, page_start, page_end in iter_lines_with_page_batches(full_text):
        stripped = line.strip()

        # Skip content before the first chapter heading
        if state.chapter_number is None:
            # Detect first chapter heading
            if stripped.startswith("## "):
                title = stripped.lstrip("#").strip()
                ch_info_first = (
                    chapter_title_to_info.get(title)
                    or chapter_title_lower_to_info.get(title.lower())
                    or chapter_title_normalized_to_info.get(normalize_chapter_title(title))
                    or chapter_title_normalized_lower_to_info.get(normalize_chapter_title(title).lower())
                )
                if ch_info_first is not None:
                    ch_info = ch_info_first
                    if (
                        chapters_to_include_set is not None
                        and ch_info.number not in chapters_to_include_set
                    ):
                        # We are still before any chapter of interest
                        state = ParseState()
                        continue

                    state.chapter_number = ch_info.number
                    state.chapter_name = ch_info.title
                    state.section_kind = "chapter_intro"
                    # Compute global page offset from the first included chapter so
                    # our batch-based page ranges roughly match book page numbering.
                    if page_offset is None:
                        desired_start = chapter_number_to_start_page.get(ch_info.number)
                        if desired_start is not None:
                            page_offset = desired_start - page_start

                    set_state_pages(page_start, page_end)

            # If we still do not have a chapter, skip this line
            if state.chapter_number is None:
                continue

        # Once we are inside any chapter, keep page range updated in state
        set_state_pages(page_start, page_end)

        # Handle chapter heading
        if stripped.startswith("## "):
            title = stripped.lstrip("#").strip()

            # A new chapter? (exact, then case-insensitive, then normalized e.g. "Thermal Properties ofMatter")
            ch_info = None
            if title in chapter_titles:
                ch_info = chapter_title_to_info[title]
            elif title.lower() in chapter_title_lower_to_info:
                ch_info = chapter_title_lower_to_info[title.lower()]
            else:
                norm = normalize_chapter_title(title)
                if norm in chapter_title_normalized_to_info:
                    ch_info = chapter_title_normalized_to_info[norm]
                elif norm.lower() in chapter_title_normalized_lower_to_info:
                    ch_info = chapter_title_normalized_lower_to_info[norm.lower()]

            if ch_info is not None:
                # Flush whatever we collected so far
                flush_chunk(chunks, buffer, state)

                if (
                    chapters_to_include_set is not None
                    and ch_info.number not in chapters_to_include_set
                ):
                    # We have moved beyond the chapters of interest – stop parsing
                    break

                # Reset state for new chapter
                state = ParseState(
                    chapter_number=ch_info.number,
                    chapter_name=ch_info.title,
                    section_kind="chapter_intro",
                    page_start=apply_page_offset(page_start, page_end)[0],
                    page_end=apply_page_offset(page_start, page_end)[1],
                )
                in_exercise_block = False
                in_example_block = False
                buffer.clear()
                continue

            # Within a chapter – handle structural headings

            # Student Learning Outcomes
            if student_outcomes_re.match(stripped):
                flush_chunk(chunks, buffer, state)
                state.section_kind = "learning_outcomes"
                state.subtopic_name = "Student Learning Outcomes"
                buffer.clear()
                continue

            # Any ## heading – exit table block if we were in one
            if in_table_block and table_buffer:
                table_content = "\n".join(table_buffer).strip()
                table_content = clean_ocr_math_noise(table_content)
                m_tbl = re.search(r"Table\s*(\d+\.\d+)", table_content, re.I)
                tbl_num = pending_table_number or (m_tbl.group(1) if m_tbl else None)
                state.table_number = tbl_num
                state.section_kind = "table"
                metadata = state.to_metadata()
                metadata["figure_numbers"] = []
                chunks.append(Document(page_content=table_content, metadata=metadata))
                state.table_number = None
                state.section_kind = "theory"
            in_table_block = False
            table_buffer = []
            pending_table_number = None

            # Main topic "1.3 International System of Units"
            m_topic = topic_re.match(stripped)
            if m_topic:
                flush_chunk(chunks, buffer, state)
                topic_no = m_topic.group(1)
                topic_title = m_topic.group(2).strip()
                state.topic_number = topic_no
                state.topic_name = topic_title
                state.subtopic_name = None
                state.section_kind = "theory"
                state.example_number = None
                state.exercise_section = None
                state.exercise_question_number = None
                in_exercise_block = False
                in_example_block = False
                buffer.clear()
                continue

            # Examples (keep topic_number/topic_name so example metadata shows which topic it belongs to)
            m_example = example_re.match(stripped)
            if m_example:
                flush_chunk(chunks, buffer, state)
                state.section_kind = "example"
                state.example_number = m_example.group(1)
                state.subtopic_name = None
                in_example_block = True
                buffer.clear()
                continue

            # Inside an Example, headings like "Solution" are NOT real subtopics.
            # They must remain inside the example chunk.
            if in_example_block and title.lower() in {
                "solve the following:",
                "solve the following",
                "solution",
                "find the value of each of the following quantities:",
            }:
                buffer.append(title)
                continue

            # Quick Quiz / Do You Know / For Your Information:
            # User requirement: these should NOT create separate chunks/headings.
            # We keep them inline inside the current chunk.
            if quick_quiz_re.match(stripped):
                buffer.append("Quick Quiz:")
                continue

            if info_re.match(stripped):
                buffer.append(f"{title}:")
                continue

            if activity_re.match(stripped):
                flush_chunk(chunks, buffer, state)
                state.section_kind = "activity"
                state.subtopic_name = title
                buffer.clear()
                continue

            if mini_exercise_re.match(stripped):
                flush_chunk(chunks, buffer, state)
                state.section_kind = "mini_exercise"
                state.subtopic_name = "Mini Exercise"
                buffer.clear()
                continue

            if key_points_re.match(stripped):
                flush_chunk(chunks, buffer, state)
                # Key Points are chapter-level; not under any single topic.
                state.section_kind = "key_points"
                state.topic_number = None
                state.topic_name = None
                state.subtopic_name = "Key Points"
                state.example_number = None
                state.exercise_section = None
                state.exercise_question_number = None
                in_example_block = False
                in_exercise_block = False
                buffer.clear()
                continue

            # Exercise block starts
            if exercise_heading_re.match(stripped):
                flush_chunk(chunks, buffer, state)
                in_exercise_block = True
                in_example_block = False
                # Exercise is chapter-level; do not attach to the last topic.
                state.topic_number = None
                state.topic_name = None
                state.subtopic_name = None
                state.section_kind = "exercise_overview"
                state.subtopic_name = "Exercise"
                state.example_number = None
                buffer.clear()
                continue

            if in_exercise_block:
                # Exercise subsections A–E
                if section_a_re.match(stripped):
                    flush_chunk(chunks, buffer, state)
                    state.section_kind = "exercise_mcq"
                    state.exercise_section = "A"
                    state.exercise_question_number = None
                    buffer.clear()
                    continue
                if section_b_re.match(stripped):
                    flush_chunk(chunks, buffer, state)
                    state.section_kind = "exercise_short"
                    state.exercise_section = "B"
                    state.exercise_question_number = None
                    buffer.clear()
                    continue
                if section_c_re.match(stripped):
                    flush_chunk(chunks, buffer, state)
                    state.section_kind = "exercise_constructed"
                    state.exercise_section = "C"
                    state.exercise_question_number = None
                    buffer.clear()
                    continue
                if section_d_re.match(stripped):
                    flush_chunk(chunks, buffer, state)
                    state.section_kind = "exercise_comprehensive"
                    state.exercise_section = "D"
                    state.exercise_question_number = None
                    buffer.clear()
                    continue
                if section_e_re.match(stripped):
                    flush_chunk(chunks, buffer, state)
                    state.section_kind = "exercise_numerical"
                    state.exercise_section = "E"
                    state.exercise_question_number = None
                    buffer.clear()
                    continue

                # Question as ## heading (e.g. "## 7.3. Temperature of a substance is:")
                if re.match(r"^\d+\.\d+\.?\s*", title):
                    if state.exercise_question_number is not None:
                        flush_chunk(chunks, buffer, state)
                    state.exercise_question_number = re.match(r"^(\d+\.\d+)\.?\s*", title).group(1)
                    buffer.append(stripped)
                    continue

                # Any other heading inside EXERCISE (like "Tick (V) the correct answer.")
                buffer.append(title)
                continue

            # Any other "##" inside a chapter but not matched above is treated
            # as a subtopic heading.
            flush_chunk(chunks, buffer, state)
            state.subtopic_name = title
            # keep current topic_number/topic_name; just mark content as theory
            state.section_kind = "theory"
            state.example_number = None
            in_example_block = False
            buffer.clear()
            continue

        # Non-heading lines -------------------------------------------------

        # Table block: collect markdown table rows
        if in_table_block:
            if stripped.startswith("|"):
                table_buffer.append(stripped)
                continue
            # Table ended – create table chunk
            if table_buffer:
                table_content = "\n".join(table_buffer).strip()
                table_content = clean_ocr_math_noise(table_content)
                tbl_num = pending_table_number
                if not tbl_num:
                    m_tbl = re.search(r"Table\s*(\d+\.\d+)", table_content, re.I)
                    if m_tbl:
                        tbl_num = m_tbl.group(1)
                state.table_number = tbl_num
                state.section_kind = "table"
                metadata = state.to_metadata()
                metadata["figure_numbers"] = []
                chunks.append(Document(page_content=table_content, metadata=metadata))
                state.table_number = None
                state.section_kind = "theory"  # restore
            in_table_block = False
            table_buffer = []
            pending_table_number = None

        # Standalone "Table X.Y" caption – flush and prepare for table (unless inside exercise)
        if not stripped.startswith("##") and table_caption_re.match(stripped):
            m_tbl = table_caption_re.match(stripped)
            if m_tbl:
                if in_exercise_block and state.section_kind.startswith("exercise_"):
                    buffer.append(stripped)
                    continue
                flush_chunk(chunks, buffer, state)
                pending_table_number = m_tbl.group(1)
                continue

        # Start of markdown table (do not start a new table chunk when inside exercise)
        if stripped.startswith("|"):
            if in_exercise_block and state.section_kind.startswith("exercise_"):
                # Table may belong to *previous* numerical (e.g. 6.10) if current buffer is just the next question (6.11) with no table keywords
                if state.section_kind == "exercise_numerical" and len(buffer) == 1 and state.exercise_question_number:
                    first_line = buffer[0].lower()
                    if not any(k in first_line for k in ("data", "recorded", "table", "following", "draw a graph")):
                        collecting_table_for_previous = True
                        table_for_previous_buffer = [stripped]
                        continue
                if collecting_table_for_previous:
                    table_for_previous_buffer.append(stripped)
                    continue
                buffer.append(stripped)
                continue
            flush_chunk(chunks, buffer, state)
            in_table_block = True
            table_buffer = [stripped]
            continue

        # Table-for-previous ended: merge table into last chunk (previous numerical)
        if collecting_table_for_previous and table_for_previous_buffer:
            if chunks:
                prev = chunks[-1]
                table_content = "\n".join(table_for_previous_buffer).strip()
                table_content = clean_ocr_math_noise(table_content)
                new_content = (prev.page_content.rstrip() + "\n\n" + table_content).strip()
                chunks[-1] = Document(page_content=new_content, metadata=prev.metadata)
            table_for_previous_buffer = []
            collecting_table_for_previous = False
            if stripped:
                chapter_after = re.match(r"^Chapter\s+(\d+)\s*$", stripped, re.IGNORECASE)
                if chapter_after:
                    ch_num = int(chapter_after.group(1))
                    ch_info = chapter_number_to_info.get(ch_num)
                    if ch_info is not None:
                        flush_chunk(chunks, buffer, state)
                        state = ParseState(
                            chapter_number=ch_info.number,
                            chapter_name=ch_info.title,
                            section_kind="chapter_intro",
                            page_start=apply_page_offset(page_start, page_end)[0],
                            page_end=apply_page_offset(page_start, page_end)[1],
                        )
                        in_exercise_block = False
                        in_example_block = False
                        buffer.clear()
                        continue
                buffer.append(stripped)
            continue

        # When we are inside an exercise subsection, we want per-question chunks.
        if in_exercise_block and state.section_kind.startswith("exercise_"):
            q_match = re.match(r"^\s*-?\s*(\d+\.\d+)\.?\s*(.*)", stripped)

            if q_match:
                if state.exercise_question_number is not None:
                    flush_chunk(chunks, buffer, state)

                state.exercise_question_number = q_match.group(1)
                question_text_rest = q_match.group(2)
                line_to_store = question_text_rest or stripped
                buffer.append(line_to_store)
            else:
                if stripped:
                    buffer.append(stripped)
            continue

        # "Chapter N" or chapter title on its own line (e.g. at end of exercise) – update chapter for following content
        chapter_line_match = re.match(r"^Chapter\s+(\d+)\s*$", stripped, re.IGNORECASE)
        if chapter_line_match and state.chapter_number is not None:
            ch_num = int(chapter_line_match.group(1))
            ch_info = chapter_number_to_info.get(ch_num)
            if ch_info is not None:
                flush_chunk(chunks, buffer, state)
                state = ParseState(
                    chapter_number=ch_info.number,
                    chapter_name=ch_info.title,
                    section_kind="chapter_intro",
                    page_start=apply_page_offset(page_start, page_end)[0],
                    page_end=apply_page_offset(page_start, page_end)[1],
                )
                in_exercise_block = False
                in_example_block = False
                buffer.clear()
                continue
        if stripped and normalize_chapter_title(stripped) in chapter_title_normalized_to_info:
            ch_info = chapter_title_normalized_to_info[normalize_chapter_title(stripped)]
            if ch_info is not None and state.chapter_number is not None:
                flush_chunk(chunks, buffer, state)
                state = ParseState(
                    chapter_number=ch_info.number,
                    chapter_name=ch_info.title,
                    section_kind="chapter_intro",
                    page_start=apply_page_offset(page_start, page_end)[0],
                    page_end=apply_page_offset(page_start, page_end)[1],
                )
                in_exercise_block = False
                in_example_block = False
                buffer.clear()
                continue

        # Normal theoretical / example / info text – accumulate into buffer
        if stripped:
            buffer.append(stripped)

    # Flush tail content (including any open table)
    if in_table_block and table_buffer:
        table_content = "\n".join(table_buffer).strip()
        table_content = clean_ocr_math_noise(table_content)
        tbl_num = pending_table_number
        if not tbl_num:
            m_tbl = re.search(r"Table\s*(\d+\.\d+)", table_content, re.I)
            if m_tbl:
                tbl_num = m_tbl.group(1)
        state.table_number = tbl_num
        state.section_kind = "table"
        metadata = state.to_metadata()
        metadata["figure_numbers"] = []
        chunks.append(Document(page_content=table_content, metadata=metadata))
        state.table_number = None
        state.section_kind = "theory"
    flush_chunk(chunks, buffer, state)

    # Filter by desired chapters (defensive in case something slipped through)
    if chapters_to_include_set is not None:
        chunks = [
            doc
            for doc in chunks
            if doc.metadata.get("chapter_number") in chapters_to_include_set
        ]

    # Deduplicate exact-repeated chunks (Docling batch exports can overlap).
    unique: List[Document] = []
    seen = set()
    for d in chunks:
        key = hash(d.page_content)
        if key in seen:
            continue
        seen.add(key)
        unique.append(d)

    return unique


# ---------------------------------------------------------------------------
# Vector store creation (Math + Text)
# ---------------------------------------------------------------------------


def split_math_vs_text(docs: List[Document]) -> Tuple[List[Document], List[Document]]:
    """Separate documents with LaTeX-style math from pure text documents."""
    math_docs: List[Document] = []
    text_docs: List[Document] = []

    for doc in docs:
        content = doc.page_content
        if "$$" in content or "\\[" in content or "\\]" in content:
            math_docs.append(doc)
        else:
            text_docs.append(doc)

    return math_docs, text_docs


def build_vectorstores(docs: List[Document], output_dir: str) -> None:
    """Create Chroma vector stores for math and text documents."""
    os.makedirs(output_dir, exist_ok=True)

    math_docs, text_docs = split_math_vs_text(docs)

    print("\nChunk distribution:")
    print(f"  Total chunks: {len(docs)}")
    print(f"  Math chunks:  {len(math_docs)}")
    print(f"  Text chunks:  {len(text_docs)}")

    # Chroma only allows str, int, float, bool, None in metadata; filter out lists (e.g. figure_numbers)
    math_docs_chroma = filter_complex_metadata(math_docs)
    text_docs_chroma = filter_complex_metadata(text_docs)

    # Math vector store with MathBERT
    if math_docs:
        print("\nBuilding MathBERT vector store...")
        math_embeddings = MathBERTEmbeddings()
        Chroma.from_documents(
            documents=math_docs_chroma,
            embedding=math_embeddings,
            persist_directory=os.path.join(output_dir, "math"),
            collection_name="math_docs",
        )
        print("  [OK] Math vector store created.")
    else:
        print("\n[INFO] No math chunks detected – skipping MathBERT store.")

    # Text vector store with sentence-transformers (free, local)
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
            documents=text_docs_chroma,
            embedding=text_embeddings,
            persist_directory=os.path.join(output_dir, "text"),
            collection_name="text_docs",
        )
        print("  [OK] Text vector store created.")
    else:
        print("\n[INFO] No text chunks detected – skipping text store.")


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------


def main() -> None:
    if not os.path.exists(MARKDOWN_FILE):
        raise FileNotFoundError(f"Markdown file not found: {MARKDOWN_FILE}")

    print("=" * 70)
    print("Physics Book Metadata Pipeline v2 (no LLM)")
    print("=" * 70)
    print(f"Reading markdown: {MARKDOWN_FILE}")

    with open(MARKDOWN_FILE, "r", encoding="utf-8") as f:
        full_text = f.read()

    chapter_infos = parse_table_of_contents(full_text)
    ch_include = set(CHAPTERS_TO_INCLUDE) if CHAPTERS_TO_INCLUDE is not None else None
    print("\nDetected chapters from contents table:")
    for info in sorted(chapter_infos.values(), key=lambda x: x.number):
        if isinstance(info.number, int) and 1 <= info.number <= 9:
            flag = "[X]" if ch_include is None or info.number in ch_include else "[ ]"
            print(f"  {flag} Chapter {info.number}: {info.title} (starts at page {info.start_page})")

    print("\nParsing book into structured chunks...")
    docs = parse_book_to_chunks(
        full_text,
        chapter_infos=chapter_infos,
        chapters_to_include=CHAPTERS_TO_INCLUDE,
    )

    ch_desc = "whole book" if ch_include is None else f"chapters {sorted(ch_include)}"
    print(f"\n[OK] Parsed {len(docs)} chunks for {ch_desc}.")

    # Simple statistics by section_kind
    stats: Dict[str, int] = {}
    for d in docs:
        kind = d.metadata.get("section_kind", "unknown")
        stats[kind] = stats.get(kind, 0) + 1

    print("\nSection kinds:")
    for kind, count in sorted(stats.items(), key=lambda kv: -kv[1]):
        print(f"  {kind:22s}: {count:4d}")

    # ------------------------------------------------------------------
    # Export JSON snapshot for manual inspection / debugging
    # ------------------------------------------------------------------

    ch_list = sorted(CHAPTERS_TO_INCLUDE) if CHAPTERS_TO_INCLUDE is not None else sorted(ch_include) if ch_include else []
    review_path = "metadata_v2_review_chapters_{}.json".format(
        "all" if not ch_list else "_".join(str(c) for c in ch_list)
    )

    print(f"\nWriting JSON review file: {review_path}")

    export_data = []
    for idx, d in enumerate(docs):
        export_data.append(
            {
                "chunk_index": idx,
                "metadata": d.metadata,
                # Store FULL chunk text here so you can inspect everything.
                # No truncation, no "..." added.
                "content": d.page_content,
            }
        )

    with open(review_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)

    print(f"  [OK] JSON written with {len(export_data)} entries.")

    # Rebuild vector store folder from scratch to avoid mixing old data.
    if os.path.exists(OUTPUT_DIR):
        print(f"\nRemoving old vector DB folder: {OUTPUT_DIR}")
        shutil.rmtree(OUTPUT_DIR, ignore_errors=True)

    print(f"\nCreating vector stores under: {OUTPUT_DIR}")
    build_vectorstores(docs, OUTPUT_DIR)

    print("\nDone. You can now point your RAG / TestGenerator to this directory,")
    print("   e.g. TestGeneratorRAG_BookOnly(book_persist_dir='./chromadb_with_metadata_v2').")


if __name__ == "__main__":
    main()

