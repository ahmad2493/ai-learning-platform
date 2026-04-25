# test_engine.py
"""
Physics Test Generation Engine — wrapped for FastAPI.
Returns structured JSON instead of plain text paper.

LLM call budget (hard limit = 4 per request):
  Call 1 — ALL MCQs generated in one batch (all chapters, all slots)
  Call 2 — ALL short questions in one batch
  Call 3 — ALL long questions in one batch
  Call 4 — Classification of all MCQs (topic assignment)
"""

import json, os, re, random
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Literal, Optional, Tuple

from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

load_dotenv()

# ─────────────────────────────────────────────
# Paths & constants
# ─────────────────────────────────────────────
BASE_DIR = "/mnt/chroma"
BOOK_JSON_PATH = os.path.join(BASE_DIR, "Book_Final.json")
CHUNK_RANGES_PATH = os.path.join(BASE_DIR, "chunk_ranges.json")
DEFAULT_CHROMA_DIR = os.path.join(BASE_DIR, "chromadb_Book")

MAX_CHUNK_CHARS = 800
CHUNKS_PER_SLOT_IN_BATCH = 2
THEORY_KINDS = {"theory", "example"}
NUMERICAL_KINDS = {"exercise_numerical", "example"}
NUMERICAL_CAPABLE_CHAPTERS = {1, 2, 3, 4, 5, 6, 7}
MCQ_SHORT_KINDS = {"theory", "example", "exercise_mcq", "exercise_short"}
MAX_MCQ = 20
MAX_SHORT = 20
MAX_LONG = 4

BOARD_DURATION_MINUTES = 120

SYSTEM_PROMPT = (
    "You are an AI Test Generation Engine for 9th Grade Punjab Board Physics.\n"
    "Generate exam-style questions STRICTLY from the given contexts.\n"
    "Never copy source questions verbatim; paraphrase or compose new questions.\n"
    "Do NOT include answers, answer keys, hints, or meta-commentary."
)


# ─────────────────────────────────────────────
# Dataclasses
# ─────────────────────────────────────────────
@dataclass
class TopicSelection:
    chapter: int
    topic_number: str


@dataclass
class TestConfig:
    mode: Literal["board", "custom"]
    mcq_count: int = 0
    short_count: int = 0
    long_count: int = 0
    full_chapters: List[int] = field(default_factory=list)
    topic_selections: List[TopicSelection] = field(default_factory=list)


@dataclass
class ChapterSelection:
    chapter_number: int
    selection_mode: Literal["none", "partial", "full"]
    selected_topics: List[str] = field(default_factory=list)


@dataclass
class QuestionSlot:
    qid: str
    kind: Literal["mcq", "short", "long_theory", "long_numerical"]
    chapters: List[int]
    preferred_topics: Optional[List[str]] = None


# ─────────────────────────────────────────────
# Engine
# ─────────────────────────────────────────────
class TestGenerationEngine:

    def __init__(self, chroma_dir: str = DEFAULT_CHROMA_DIR):
        self.book_chunks: List[Dict] = []
        self.chunk_ranges: Dict[str, Any] = {}
        self.chapters_meta: Dict[int, Dict] = {}
        self.allowed_indices: Dict[int, List[int]] = {}
        self.llm: Optional[ChatOpenAI] = None
        self.vectorstore: Optional[Chroma] = None
        self.chroma_dir = chroma_dir
        self._llm_calls = 0
        self._load()

    # ── Startup ──────────────────────────────────────────────────────

    def _load(self):
        print("[ENGINE] Loading book chunks...")
        with open(BOOK_JSON_PATH, "r", encoding="utf-8") as f:
            self.book_chunks = json.load(f)
        self.chunk_ranges = self._load_chunk_ranges(CHUNK_RANGES_PATH)
        self.chapters_meta = self._load_book_structure()
        self.llm = self._build_llm()
        self.vectorstore = self._init_chroma()
        print(f"[ENGINE] Ready. {len(self.book_chunks)} chunks, {len(self.chapters_meta)} chapters.")

    def _load_chunk_ranges(self, path: str) -> Dict[str, Any]:
        if not os.path.exists(path):
            print(f"[WARN] chunk_ranges.json not found at {path}.")
            return {}
        with open(path, "rb") as f:
            raw = f.read()
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = raw.decode("utf-16")
        return json.loads(text)

    def _load_book_structure(self) -> Dict[int, Dict]:
        chapters: Dict[int, Dict] = {}
        for entry in self.book_chunks:
            meta = entry.get("metadata", {})
            ch_num = meta.get("chapter_number")
            if ch_num is None:
                continue
            ch = chapters.setdefault(
                ch_num,
                {"chapter_number": ch_num, "chapter_name": meta.get("chapter_name"), "topics": {}},
            )
            t = self._effective_topic(meta)
            t_name = meta.get("topic_name")
            if t and t not in ch["topics"]:
                ch["topics"][t] = {"topic_number": t, "topic_name": t_name}
        return chapters

    def _build_llm(self) -> Optional[ChatOpenAI]:
        if not os.getenv("OPENAI_API_KEY"):
            print("[WARN] OPENAI_API_KEY not set. Questions will be placeholders.")
            return None
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        return ChatOpenAI(model=model, temperature=0.4)

    def _init_chroma(self) -> Optional[Chroma]:
        if not os.path.exists(self.chroma_dir):
            print(f"[WARN] Chroma directory not found: {self.chroma_dir}. Using Book_Final.json only.")
            return None
        if not os.getenv("OPENAI_API_KEY"):
            return None
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        return Chroma(persist_directory=self.chroma_dir, embedding_function=embeddings)

    # ── Public API ───────────────────────────────────────────────────

    def generate(self, config_dict: Dict) -> Dict:
        config = self._parse_config_dict(config_dict)
        selections = self._build_chapter_selections(config)
        involved = self._compute_involved_chapters(selections)
        self.allowed_indices = self._build_allowed_indices(selections)

        if config.mode == "board":
            return self._run_board(config, selections, involved)
        else:
            return self._run_custom(config, selections, involved)

    # ── Duration ─────────────────────────────────────────────────────

    def _calculate_duration(self, config: TestConfig) -> int:
        if config.mode == "board":
            return BOARD_DURATION_MINUTES
        return (config.mcq_count * 1) + (config.short_count * 2) + (config.long_count * 5)

    # ── Config parsing ───────────────────────────────────────────────

    def _parse_config_dict(self, raw: Dict) -> TestConfig:
        topic_selections = []
        for t in raw.get("topic_selections", []):
            ch = int(t["chapter"])
            tnum = str(t["topic_number"])
            valid_topics = set(self.chapters_meta.get(ch, {}).get("topics", {}).keys())
            if tnum not in valid_topics:
                print(f"[WARN] Topic {tnum} not in chapter {ch}. Skipping.")
                continue
            topic_selections.append(TopicSelection(chapter=ch, topic_number=tnum))

        valid_chapters = set(self.chapters_meta.keys())
        full_chapters = []
        for ch in raw.get("full_chapters", []):
            ch = int(ch)
            if ch not in valid_chapters:
                print(f"[WARN] Chapter {ch} not found. Skipping.")
            else:
                full_chapters.append(ch)

        config = TestConfig(
            mode=raw.get("mode", "board"),
            mcq_count=min(int(raw.get("mcq_count", 0)), MAX_MCQ),
            short_count=min(int(raw.get("short_count", 0)), MAX_SHORT),
            long_count=min(int(raw.get("long_count", 0)), MAX_LONG),
            full_chapters=full_chapters,
            topic_selections=topic_selections,
        )

        if not config.full_chapters and not config.topic_selections:
            config.full_chapters = list(self.chapters_meta.keys())

        return config

    # ── test_details ─────────────────────────────────────────────────

    def _build_test_details(self, config: TestConfig, selections: Dict[int, ChapterSelection]) -> Dict:
        duration = self._calculate_duration(config)

        selected_chapters = []
        for ch in config.full_chapters:
            ch_meta = self.chapters_meta.get(ch, {})
            selected_chapters.append({
                "chapter_number": ch,
                "chapter_name": ch_meta.get("chapter_name", f"Chapter {ch}"),
                "selection_type": "full"
            })

        selected_topics = []
        for t in config.topic_selections:
            ch_meta = self.chapters_meta.get(t.chapter, {})
            topic_meta = ch_meta.get("topics", {}).get(t.topic_number, {})
            selected_topics.append({
                "chapter_number": t.chapter,
                "chapter_name": ch_meta.get("chapter_name", f"Chapter {t.chapter}"),
                "topic_number": t.topic_number,
                "topic_name": topic_meta.get("topic_name", t.topic_number),
                "selection_type": "partial"
            })

        # expires_at = generated_at + duration_minutes.
        # Stored in DB and returned to frontend so the countdown timer
        # can run locally — frontend never needs to call an API for time.
        generated_dt = datetime.utcnow()
        expires_dt = generated_dt + timedelta(minutes=duration)
        generated_at = generated_dt.isoformat() + "Z"
        expires_at = expires_dt.isoformat() + "Z"

        return {
            "mode": config.mode,
            "duration_minutes": duration,
            "generated_at": generated_at,
            "expires_at": expires_at,
            "selected_chapters": selected_chapters,
            "selected_topics": selected_topics,
            "mcq_count": 12 if config.mode == "board" else config.mcq_count,
            "short_count": 24 if config.mode == "board" else config.short_count,
            "long_count": 3 if config.mode == "board" else config.long_count,
        }

    # ── Selection helpers ────────────────────────────────────────────

    def _effective_topic(self, meta: Dict) -> Optional[str]:
        return meta.get("topic_number") or meta.get("parent_topic_number")

    def _build_chapter_selections(self, config: TestConfig) -> Dict[int, ChapterSelection]:
        topic_map: Dict[int, List[str]] = defaultdict(list)
        for t in config.topic_selections:
            topic_map[t.chapter].append(t.topic_number)

        selections: Dict[int, ChapterSelection] = {}
        for ch in self.chapters_meta.keys():
            if ch in config.full_chapters:
                selections[ch] = ChapterSelection(chapter_number=ch, selection_mode="full")
            elif ch in topic_map:
                selections[ch] = ChapterSelection(
                    chapter_number=ch,
                    selection_mode="partial",
                    selected_topics=topic_map[ch],
                )
            else:
                selections[ch] = ChapterSelection(chapter_number=ch, selection_mode="none")
        return selections

    def _compute_involved_chapters(self, selections: Dict[int, ChapterSelection]) -> List[int]:
        return sorted(ch for ch, sel in selections.items() if sel.selection_mode != "none")

    def _build_allowed_indices(self, selections: Dict[int, ChapterSelection]) -> Dict[int, List[int]]:
        max_idx = len(self.book_chunks) - 1
        allowed: Dict[int, List[int]] = {}
        chapters_info = self.chunk_ranges.get("chapters", {})

        for ch, sel in selections.items():
            if sel.selection_mode == "none":
                continue
            ch_str = str(ch)
            ch_info = chapters_info.get(ch_str)

            if ch_info:
                indices: List[int] = []
                if sel.selection_mode == "full":
                    start = ch_info.get("start_chunk", 0)
                    end = ch_info.get("end_chunk", max_idx)
                    indices = list(range(start, min(end, max_idx) + 1))
                elif sel.selection_mode == "partial":
                    topics_info = ch_info.get("topics", {})
                    for tnum in sel.selected_topics:
                        t_info = topics_info.get(tnum)
                        if not t_info:
                            for i, entry in enumerate(self.book_chunks):
                                if self._effective_topic(entry.get("metadata", {})) == tnum:
                                    indices.append(i)
                            continue
                        start = t_info.get("start_chunk", 0)
                        end = t_info.get("end_chunk", max_idx)
                        indices.extend(range(start, min(end, max_idx) + 1))
                if indices:
                    allowed[ch] = sorted(set(i for i in indices if 0 <= i <= max_idx))
            else:
                indices = [
                    i for i, entry in enumerate(self.book_chunks)
                    if entry.get("metadata", {}).get("chapter_number") == ch
                    and (
                        sel.selection_mode == "full"
                        or self._effective_topic(entry.get("metadata", {})) in sel.selected_topics
                    )
                ]
                if indices:
                    allowed[ch] = sorted(set(indices))

        return allowed

    # ── Blueprint builders ───────────────────────────────────────────

    def _topics_for_chapter(self, ch: int, selections: Dict[int, ChapterSelection]) -> Optional[List[str]]:
        sel = selections.get(ch)
        if sel is None or sel.selection_mode == "none":
            return None
        if sel.selection_mode == "partial":
            return sel.selected_topics
        return sorted(self.chapters_meta.get(ch, {}).get("topics", {}).keys())

    def _build_board_blueprint(self, selections: Dict[int, ChapterSelection]) -> List[QuestionSlot]:
        involved = self._compute_involved_chapters(selections)
        full_book = set(involved) == set(range(1, 10))
        slots: List[QuestionSlot] = []
        cycle = involved or [1]

        for i in range(12):
            ch = cycle[i % len(cycle)]
            slots.append(QuestionSlot(
                qid=f"Q1_mcq_{i+1}", kind="mcq",
                chapters=[ch],
                preferred_topics=self._topics_for_chapter(ch, selections),
            ))

        def bucket(q: int) -> List[int]:
            if not full_book:
                return involved
            return {2: [1, 2, 3], 3: [4, 5, 6], 4: [7, 8, 9]}[q]

        for q in [2, 3, 4]:
            b = [c for c in bucket(q) if c in involved] or cycle
            for i in range(8):
                ch = b[i % len(b)]
                slots.append(QuestionSlot(
                    qid=f"Q{q}_short_{i+1}", kind="short",
                    chapters=[ch],
                    preferred_topics=self._topics_for_chapter(ch, selections),
                ))

        for q in [5, 6, 7]:
            slots.append(QuestionSlot(qid=f"Q{q}a", kind="long_theory",    chapters=involved))
            slots.append(QuestionSlot(qid=f"Q{q}b", kind="long_numerical", chapters=involved))

        return slots

    def _build_custom_blueprint(self, config: TestConfig, selections: Dict[int, ChapterSelection]) -> List[QuestionSlot]:
        involved = self._compute_involved_chapters(selections) or [1]
        slots: List[QuestionSlot] = []

        num_capable = [ch for ch in involved if ch in NUMERICAL_CAPABLE_CHAPTERS]
        if not num_capable:
            num_capable = involved
            print(f"[WARN] No numerical chapters in {involved}.")

        for i in range(config.mcq_count):
            ch = involved[i % len(involved)]
            slots.append(QuestionSlot(
                qid=f"MCQ_{i+1}", kind="mcq",
                chapters=[ch],
                preferred_topics=self._topics_for_chapter(ch, selections),
            ))
        for i in range(config.short_count):
            ch = involved[i % len(involved)]
            slots.append(QuestionSlot(
                qid=f"SQ_{i+1}", kind="short",
                chapters=[ch],
                preferred_topics=self._topics_for_chapter(ch, selections),
            ))
        for i in range(config.long_count):
            a_ch = involved[i % len(involved)]
            b_ch = num_capable[i % len(num_capable)]
            slots.append(QuestionSlot(qid=f"LQ_{i+1}a", kind="long_theory",    chapters=[a_ch]))
            slots.append(QuestionSlot(qid=f"LQ_{i+1}b", kind="long_numerical", chapters=[b_ch]))

        return slots

    # ── Retrieval ────────────────────────────────────────────────────

    def _get_chunks_for_chapter(self, ch: int, kind_filter: Optional[set] = None) -> List[Dict]:
        idx_list = self.allowed_indices.get(ch)
        if idx_list:
            candidates = [self.book_chunks[i] for i in idx_list if 0 <= i < len(self.book_chunks)]
        else:
            candidates = [c for c in self.book_chunks if c.get("metadata", {}).get("chapter_number") == ch]
        if kind_filter:
            candidates = [c for c in candidates if c.get("metadata", {}).get("section_kind") in kind_filter]
        return candidates

    def _get_mcq_context_for_topic(self, ch: int, topic_number: str) -> List[Dict]:
        ch_info = self.chunk_ranges.get("chapters", {}).get(str(ch), {})
        t_info = ch_info.get("topics", {}).get(topic_number)

        if t_info:
            start = t_info.get("start_chunk", 0)
            end = min(t_info.get("end_chunk", start), len(self.book_chunks) - 1)
            chunks = [self.book_chunks[i] for i in range(start, end + 1)]
        else:
            chunks = [
                c for c in self.book_chunks
                if c.get("metadata", {}).get("chapter_number") == ch
                and self._effective_topic(c.get("metadata", {})) == topic_number
            ]

        return [
            c for c in chunks
            if c.get("metadata", {}).get("section_kind") in MCQ_SHORT_KINDS
        ]

    def _get_full_chapter_context(self, ch: int) -> List[Dict]:
        ch_info = self.chunk_ranges.get("chapters", {}).get(str(ch), {})
        start = ch_info.get("start_chunk", 0)
        end = min(ch_info.get("end_chunk", start), len(self.book_chunks) - 1)
        return [
            self.book_chunks[i] for i in range(start, end + 1)
            if self.book_chunks[i].get("metadata", {}).get("section_kind") in MCQ_SHORT_KINDS
        ]

    def _get_numerical_pool_for_chapter(self, ch: int, selected_topics: List[str], all_ch_chunks: List[Dict]) -> List[Dict]:
        if not selected_topics:
            candidates = [c for c in all_ch_chunks if c.get("metadata", {}).get("section_kind") == "example"]
        else:
            candidates = [
                c for c in all_ch_chunks
                if c.get("metadata", {}).get("section_kind") == "example"
                and self._effective_topic(c.get("metadata", {})) in selected_topics
            ]
        seen: set = set()
        unique: List[Dict] = []
        for c in candidates:
            ex_num = c.get("metadata", {}).get("example_number")
            key = (ch, ex_num)
            if key not in seen:
                seen.add(key)
                unique.append(c)
        return unique

    def _retrieve_for_slot(self, slot: QuestionSlot, kind_filter: Optional[set], top_k: int = 8) -> List[Any]:
        class SimpleDoc:
            def __init__(self, content: str, metadata: Dict):
                self.page_content = content
                self.metadata = metadata

        candidates = []
        for ch in slot.chapters:
            candidates.extend(self._get_chunks_for_chapter(ch, kind_filter))

        if not candidates and self.vectorstore is not None:
            query = f"9th grade physics chapter {slot.chapters[0]} question"
            try:
                docs = self.vectorstore.similarity_search(
                    query, k=top_k,
                    filter={"chapter_number": {"$in": slot.chapters}},
                )
                return docs
            except Exception as e:
                print(f"[WARN] Chroma fallback failed for {slot.qid}: {e}")

        random.shuffle(candidates)
        return [SimpleDoc(c.get("content", ""), c.get("metadata", {})) for c in candidates[:top_k]]

    # ── Context builders ─────────────────────────────────────────────

    def _truncate(self, text: str, max_chars: int = MAX_CHUNK_CHARS) -> str:
        if len(text) <= max_chars:
            return text
        cut = text[:max_chars]
        last_space = cut.rfind(" ")
        return (cut[:last_space] if last_space > max_chars // 2 else cut) + "…"

    def _build_context_block(self, docs: List[Any], max_docs: int = CHUNKS_PER_SLOT_IN_BATCH) -> str:
        blocks = []
        for d in docs[:max_docs]:
            meta = getattr(d, "metadata", {}) or {}
            text = self._truncate(getattr(d, "page_content", ""))
            ch = meta.get("chapter_number", "?")
            topic = self._effective_topic(meta) or "—"
            kind = meta.get("section_kind", "—")
            blocks.append(f"[ch{ch} | topic {topic} | {kind}]\n{text}")
        return "\n---\n".join(blocks)

    # ── LLM call ─────────────────────────────────────────────────────

    def _call_llm(self, messages) -> str:
        if self.llm is None:
            return ""
        self._llm_calls += 1
        resp = self.llm.invoke(messages)
        return resp.content if hasattr(resp, "content") else str(resp)

    # ── Output parsing ───────────────────────────────────────────────

    def _split_numbered_blocks(self, text: str, n: int) -> List[str]:
        pattern = re.compile(r"^\s*(\d{1,2})[.)]\s+", re.MULTILINE)
        matches = list(pattern.finditer(text))

        if not matches:
            return [text.strip()] + ["(Question placeholder.)"] * (n - 1)

        blocks = []
        for i, m in enumerate(matches):
            start = m.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            block = text[start:end].strip()
            if block:
                blocks.append(block)

        while len(blocks) < n:
            blocks.append("(Question placeholder.)")
        return blocks[:n]

    def _parse_mcq_block(self, raw_block: str) -> Dict:
        correct_option = None
        answer_match = re.search(r"\bANSWER\s*:\s*([a-dA-D])\b", raw_block)
        if answer_match:
            correct_option = answer_match.group(1).lower()
            raw_block = raw_block[:answer_match.start()] + raw_block[answer_match.end():]

        topic_number = None
        topic_match = re.search(r"\bTOPIC\s*:\s*([\d]+\.[\d]+)\b", raw_block)
        if topic_match:
            topic_number = topic_match.group(1).strip()
            raw_block = raw_block[:topic_match.start()] + raw_block[topic_match.end():]

        raw_block = raw_block.strip()
        lines = [l.strip() for l in raw_block.splitlines() if l.strip()]
        options = {}
        stem_lines = []
        option_pattern = re.compile(r"^([a-dA-D])[.)]\s*(.+)$")

        for line in lines:
            m = option_pattern.match(line)
            if m:
                options[m.group(1).lower()] = m.group(2).strip()
            else:
                stem_lines.append(line)

        question = " ".join(stem_lines).strip()
        for opt in ["a", "b", "c", "d"]:
            options.setdefault(opt, "")

        return {
            "question": question,
            "options": options,
            "correct_option": correct_option,
            "topic_number": topic_number,
        }

    def _parse_long_parts(self, text: str, part_ids: List[str]) -> Dict[str, str]:
        result: Dict[str, str] = {}
        label_map = {}
        for pid in part_ids:
            q_num = pid[1:-1]
            part = pid[-1]
            label_map[f"Q{q_num}({part})"] = pid

        label_pattern = re.compile(
            r"(" + "|".join(re.escape(k) for k in label_map) + r")\s*[:\-]?\s*",
            re.IGNORECASE,
        )

        parts = label_pattern.split(text.strip())
        i = 1
        while i < len(parts) - 1:
            raw_label = parts[i].strip()
            content = parts[i + 1].strip()
            for lbl, pid in label_map.items():
                if raw_label.upper() == lbl.upper():
                    result[pid] = content
                    break
            i += 2

        for pid in part_ids:
            result.setdefault(pid, f"(Long question part {pid} placeholder.)")
        return result

    # ── Plan long slots ──────────────────────────────────────────────

    def _plan_long_slots(
        self,
        long_pairs: List[Tuple[QuestionSlot, QuestionSlot]],
        selections: Dict,
        chapter_assignments: Optional[Dict[str, int]] = None,
        q_start_number: int = 3,
    ) -> List[Dict]:
        ch_pools: Dict[int, List[Dict]] = {}

        def get_pool(ch: int, topics: List[str]) -> List[Dict]:
            if ch not in ch_pools:
                all_ch = [c for c in self.book_chunks if c.get("metadata", {}).get("chapter_number") == ch]
                ch_pools[ch] = self._get_numerical_pool_for_chapter(ch, topics, all_ch)
            return ch_pools[ch]

        plans = []
        for i, (a_slot, b_slot) in enumerate(long_pairs):
            q_num = q_start_number + i

            if chapter_assignments:
                a_ch = chapter_assignments.get(f"Q{q_num}a", a_slot.chapters[0])
                b_ch = chapter_assignments.get(f"Q{q_num}b", b_slot.chapters[0])
                a_slot = QuestionSlot(qid=a_slot.qid, kind="long_theory",    chapters=[a_ch])
                b_slot = QuestionSlot(qid=b_slot.qid, kind="long_numerical", chapters=[b_ch])

            b_ch = b_slot.chapters[0]
            b_sel = selections.get(b_ch)
            b_topics = b_sel.selected_topics if b_sel and b_sel.selection_mode == "partial" else []

            pool = get_pool(b_ch, b_topics)

            if pool:
                b_chunk = pool.pop(0)
                b_type = "numerical"
                print(f"[INFO] Q{q_num}(b): numerical ex={b_chunk.get('metadata',{}).get('example_number','?')}")
            else:
                b_chunk = None
                b_type = "theory"
                print(f"[INFO] Q{q_num}(b): no numericals for ch{b_ch} -> theory fallback")

            plans.append({
                "q_num":    q_num,
                "a_slot":   a_slot,
                "b_slot":   b_slot,
                "b_type":   b_type,
                "b_chunk":  b_chunk,
                "b_topics": b_topics,
            })

        return plans

    # ── Build classification topic map ───────────────────────────────

    def _build_classification_topic_map(
        self,
        selections: Dict[int, ChapterSelection],
    ) -> Dict[str, str]:
        """
        {topic_number: topic_name} for ALL topics in scope.
        full chapter  -> all topics of that chapter
        partial       -> only selected topics
        none          -> skip
        """
        topic_map: Dict[str, str] = {}
        for ch_num, sel in selections.items():
            if sel.selection_mode == "none":
                continue
            ch_topics = self.chapters_meta.get(ch_num, {}).get("topics", {})
            if sel.selection_mode == "full":
                for tnum, tdata in ch_topics.items():
                    topic_map[tnum] = tdata.get("topic_name", tnum)
            elif sel.selection_mode == "partial":
                for tnum in sel.selected_topics:
                    t_name = ch_topics.get(tnum, {}).get("topic_name", tnum)
                    topic_map[tnum] = t_name
        return topic_map

    # ── MCQ topic assignment helper ──────────────────────────────────

    def _assign_mcq_topics_uniformly(self, slots: List[QuestionSlot]) -> Dict[int, Optional[str]]:
        """
        Deterministically spread MCQ slots across preferred topics per chapter.
        Returns: {slot_index: assigned_topic_number_or_none}
        """
        assignments: Dict[int, Optional[str]] = {}
        chapter_slot_indices: Dict[int, List[int]] = defaultdict(list)

        for idx, slot in enumerate(slots):
            ch = slot.chapters[0] if slot.chapters else None
            if ch is None:
                assignments[idx] = None
                continue
            chapter_slot_indices[ch].append(idx)

        for ch, indices in chapter_slot_indices.items():
            if not indices:
                continue

            first_slot = slots[indices[0]]
            topics = list(dict.fromkeys(first_slot.preferred_topics or []))
            if not topics:
                for idx in indices:
                    assignments[idx] = None
                continue

            for offset, idx in enumerate(indices):
                assignments[idx] = topics[offset % len(topics)]

        return assignments

    # ── Single classification call for ALL MCQs ──────────────────────

    def _classify_all_mcqs(
        self,
        mcq_blocks: Dict[int, str],
        topic_map: Dict[str, str],
    ) -> Dict[int, str]:
        """
        ONE dedicated LLM call — always exactly 1 regardless of chapter count.
        Classifies all MCQs (max 20) at once using full topic name list.
        """
        if self.llm is None or not mcq_blocks or not topic_map:
            return {}

        name_to_num: Dict[str, str] = {name: tnum for tnum, name in topic_map.items()}
        name_to_num_lower: Dict[str, str] = {k.lower().strip(): v for k, v in name_to_num.items()}

        sorted_indices = sorted(mcq_blocks.keys())

        stem_lines: List[str] = []
        for pos, orig_idx in enumerate(sorted_indices):
            block = mcq_blocks[orig_idx]
            stem_parts = []
            for line in block.splitlines():
                line = line.strip()
                if re.match(r"^[a-dA-D][.)]\s+", line):
                    break
                if re.match(r"^ANSWER\s*:", line, re.IGNORECASE):
                    break
                if re.match(r"^TOPIC\s*:", line, re.IGNORECASE):
                    break
                if line:
                    stem_parts.append(line)
            stem_lines.append(f"Q{pos + 1}: {' '.join(stem_parts).strip()}")

        questions_text = "\n".join(stem_lines)
        topic_list = "\n".join(f"  {name}" for name in topic_map.values())

        classify_prompt = (
            "You are a physics topic classifier for 9th grade Punjab Board.\n\n"
            "Below are MCQ question stems and a list of topic names.\n"
            "For each question, pick the ONE topic name it most closely belongs to.\n"
            "Copy the topic name EXACTLY as written — do not change spelling or wording.\n\n"
            f"TOPIC NAMES:\n{topic_list}\n\n"
            f"QUESTIONS:\n{questions_text}\n\n"
            "OUTPUT FORMAT (one line per question, nothing else):\n"
            "TOPIC_Q1: <exact topic name>\n"
            "TOPIC_Q2: <exact topic name>\n"
            "...etc."
        )

        resp = self._call_llm([
            ("system", "You are a precise topic classifier. Output only the required TOPIC_Qn lines, nothing else."),
            ("user", classify_prompt),
        ])

        assignments: Dict[int, str] = {}
        pattern = re.compile(r"TOPIC_Q(\d+)\s*:\s*(.+)")
        for match in pattern.finditer(resp):
            pos = int(match.group(1)) - 1
            if pos < 0 or pos >= len(sorted_indices):
                continue
            orig_idx = sorted_indices[pos]
            matched_name = match.group(2).strip()

            if matched_name in name_to_num:
                assignments[orig_idx] = name_to_num[matched_name]
            else:
                lower = matched_name.lower().strip()
                if lower in name_to_num_lower:
                    assignments[orig_idx] = name_to_num_lower[lower]
                else:
                    for name, tnum in name_to_num.items():
                        if name.lower() in lower or lower in name.lower():
                            assignments[orig_idx] = tnum
                            break

        return assignments

    # ── MCQ generation — ONE call for ALL slots, ALL chapters ────────

    def _generate_all_mcqs(self, slots: List[QuestionSlot]) -> List[str]:
        """
        CALL 1 of 4.
        All MCQ slots from all chapters in a single LLM call.
        Each slot gets its own context block labelled with chapter + topic.
        No per-chapter splitting — always exactly 1 call.
        """
        n = len(slots)
        if n == 0:
            return []

        if self.llm is None:
            return [
                f"Which of the following is correct regarding chapter {s.chapters[0]}?\n"
                "a) option A\nb) option B\nc) option C\nd) option D\nANSWER: a"
                for s in slots
            ]

        class SimpleDoc:
            def __init__(self, content: str, metadata: Dict):
                self.page_content = content
                self.metadata = metadata

        # Cache full-chapter contexts — one fetch per chapter, not per slot
        full_ch_cache: Dict[int, List[Dict]] = {}

        def get_full_ch(ch: int) -> List[Dict]:
            if ch not in full_ch_cache:
                full_ch_cache[ch] = self._get_full_chapter_context(ch)
            return full_ch_cache[ch]

        mcq_topic_assignments = self._assign_mcq_topics_uniformly(slots)

        context_blocks: List[str] = []
        for i, slot in enumerate(slots, start=1):
            slot_idx = i - 1
            ch = slot.chapters[0]
            ch_name = self.chapters_meta.get(ch, {}).get("chapter_name", f"Chapter {ch}")
            assigned_topic = mcq_topic_assignments.get(slot_idx)

            if assigned_topic:
                chunks = self._get_mcq_context_for_topic(ch, assigned_topic)
                if not chunks:
                    chunks = [
                        c for c in get_full_ch(ch)
                        if self._effective_topic(c.get("metadata", {})) == assigned_topic
                    ]
                # Pad sparse topics with full chapter context
                if len(chunks) < 3:
                    full_chunks = get_full_ch(ch)
                    existing_ids = {id(c) for c in chunks}
                    padding = [c for c in full_chunks if id(c) not in existing_ids]
                    chunks = chunks + padding[:6]
                t_name = self.chapters_meta.get(ch, {}).get("topics", {}).get(
                    assigned_topic, {}
                ).get("topic_name", assigned_topic)
                label = f"Chapter {ch} ({ch_name}) | Topic: {t_name}"
            else:
                chunks = get_full_ch(ch)
                label = f"Chapter {ch} ({ch_name})"

            random.shuffle(chunks)
            docs = [SimpleDoc(c.get("content", ""), c.get("metadata", {}))
                    for c in chunks[:6]]
            ctx = self._build_context_block(docs, max_docs=6)
            context_blocks.append(f"--- CONTEXT FOR Q{i} ({label}) ---\n{ctx}")

        all_contexts = "\n\n".join(context_blocks)

        gen_task = (
            f"Generate exactly {n} MCQs for 9th grade Punjab Board physics.\n"
            "Each question has its own context block labelled with chapter and topic.\n"
            "Write question N using ONLY the content in its own context block.\n\n"
            "Output format for each MCQ:\n"
            "N. [question stem]\n"
            "a) ...\nb) ...\nc) ...\nd) ...\n"
            "ANSWER: x\n\n"
            f"CONTEXTS:\n{all_contexts}"
        )

        resp = self._call_llm([("system", SYSTEM_PROMPT), ("user", gen_task)])
        return self._split_numbered_blocks(resp, n)

    # ── Short generation — ONE call for ALL short slots ──────────────

    def _generate_all_shorts(self, slots: List[QuestionSlot]) -> List[str]:
        """
        CALL 2 of 4.
        All short question slots in a single LLM call.
        """
        n = len(slots)
        if n == 0:
            return []

        if self.llm is None:
            return [f"Explain a key concept from chapter {s.chapters[0]}." for s in slots]

        context_parts = []
        for i, slot in enumerate(slots, start=1):
            docs = self._retrieve_for_slot(slot, MCQ_SHORT_KINDS, top_k=6)
            ch = slot.chapters[0]
            ch_name = self.chapters_meta.get(ch, {}).get("chapter_name", f"Chapter {ch}")
            ctx = self._build_context_block(docs)
            context_parts.append(f"=== Context for Q{i} (Chapter {ch}: {ch_name}) ===\n{ctx}")

        combined = "\n\n".join(context_parts)
        task = (
            f"Generate exactly {n} short questions (2 marks each) for 9th grade Punjab Board physics.\n"
            "- Question i uses ONLY its own context.\n"
            "- Vary styles: 'Define X.', 'What is meant by X?', 'Describe X.', "
            "'Differentiate between X and Y.', 'Why does X happen?', 'Give two examples of X.'\n"
            "- Do NOT always start with 'Define' or 'Write a short note'.\n"
            "- Do NOT copy exercise questions verbatim.\n"
            f"- Number as: 1) 2) ... {n})."
        )
        resp = self._call_llm([("system", SYSTEM_PROMPT), ("user", f"{task}\n\nREFERENCE CONTEXTS:\n\n{combined}")])
        return self._split_numbered_blocks(resp, n)

    # ── Long question generation ─────────────────────────────────────

    def _generate_long_batch(
        self,
        long_pairs: List[Tuple[QuestionSlot, QuestionSlot]],
        q_start_number: int,
        chapter_assignments: Optional[Dict[str, int]] = None,
        selections: Optional[Dict] = None,
    ) -> Dict[str, str]:
        """CALL 3 of 4."""
        if not long_pairs:
            return {}

        plans = self._plan_long_slots(
            long_pairs, selections or {},
            chapter_assignments=chapter_assignments,
            q_start_number=q_start_number,
        )

        part_ids = []
        for p in plans:
            part_ids += [f"Q{p['q_num']}a", f"Q{p['q_num']}b"]

        if self.llm is None:
            return {pid: f"(Long question {pid} placeholder.)" for pid in part_ids}

        context_parts = []
        part_list_lines = []

        for p in plans:
            q_num    = p["q_num"]
            a_slot   = p["a_slot"]
            b_slot   = p["b_slot"]
            b_type   = p["b_type"]
            b_chunk  = p["b_chunk"]
            b_topics = p["b_topics"]

            a_ch = a_slot.chapters[0]
            b_ch = b_slot.chapters[0]
            a_name = self.chapters_meta.get(a_ch, {}).get("chapter_name", f"Chapter {a_ch}")
            b_name = self.chapters_meta.get(b_ch, {}).get("chapter_name", f"Chapter {b_ch}")

            theory_docs = self._retrieve_for_slot(a_slot, THEORY_KINDS, top_k=6)
            sec_d_docs = [
                c for c in self.book_chunks
                if c.get("metadata", {}).get("chapter_number") == a_ch
                and c.get("metadata", {}).get("section_kind") == "exercise_comprehensive"
            ]
            random.shuffle(sec_d_docs)
            theory_ctx = self._build_context_block(theory_docs, max_docs=3)
            sec_d_ctx  = "\n".join(f"- {c.get('content','').strip()[:200]}" for c in sec_d_docs[:4])

            part_list_lines.append(f"  Q{q_num}(a) [4 marks — THEORY]")

            if b_type == "numerical":
                num_content = b_chunk.get("content", "").strip()[:MAX_CHUNK_CHARS]
                ex_num = b_chunk.get("metadata", {}).get("example_number", "?")
                ex_topic = self._effective_topic(b_chunk.get("metadata", {})) or "N/A"
                topic_hint = f"Topics: {', '.join(b_topics)}" if b_topics else "Full chapter"

                context_parts.append(
                    f"=== Q{q_num}(a) — Chapter {a_ch}: {a_name} [THEORY] ===\n"
                    f"CONTENT FROM BOOK:\n{theory_ctx}\n\n"
                    f"SAMPLE LONG QUESTION STYLE:\n{sec_d_ctx}\n\n"
                    f"=== Q{q_num}(b) — Chapter {b_ch}: {b_name} [NUMERICAL] ===\n"
                    f"BASE THIS NUMERICAL EXACTLY on the following book example ({topic_hint}).\n"
                    f"Change numbers slightly but keep the same concept and formula.\n\n"
                    f"[example {ex_num} | topic={ex_topic}]\n{num_content}"
                )
                part_list_lines.append(f"  Q{q_num}(b) [5 marks — NUMERICAL]")
            else:
                b_theory_docs = self._retrieve_for_slot(
                    QuestionSlot(qid=b_slot.qid, kind="long_theory", chapters=[b_ch]),
                    THEORY_KINDS, top_k=6,
                )
                b_theory_ctx = self._build_context_block(b_theory_docs, max_docs=3)

                context_parts.append(
                    f"=== Q{q_num}(a) — Chapter {a_ch}: {a_name} [THEORY] ===\n"
                    f"CONTENT FROM BOOK:\n{theory_ctx}\n\n"
                    f"SAMPLE LONG QUESTION STYLE:\n{sec_d_ctx}\n\n"
                    f"=== Q{q_num}(b) — Chapter {b_ch}: {b_name} [THEORY — no numericals available] ===\n"
                    f"Topics: {', '.join(b_topics) if b_topics else 'full chapter'}.\n"
                    f"CONTENT FROM BOOK:\n{b_theory_ctx}"
                )
                part_list_lines.append(f"  Q{q_num}(b) [5 marks — THEORY]")

        combined  = "\n\n".join(context_parts)
        parts_str = "\n".join(part_list_lines)

        long_system_prompt = (
            "You are an expert Physics exam paper setter for 9th Grade Punjab Board (Pakistan).\n"
            "Write LONG QUESTIONS strictly grounded in the provided book content.\n\n"
            "RULES:\n"
            "1. THEORY parts: Short stem (1-2 sentences). Ask ONLY what the book covers.\n"
            "   Mix styles: 'Define X and explain...', 'Describe...', 'Differentiate X and Y.'\n"
            "   NEVER invent content not in the provided text.\n"
            "2. NUMERICAL parts: Base on the provided book example.\n"
            "   Change numbers slightly, keep same formula and concept.\n"
            "   Write as a natural word problem — no Given/Find headings.\n"
            "3. THEORY fallback (marked 'THEORY — no numericals available'):\n"
            "   Write a second theory question on a DIFFERENT aspect than part (a).\n"
            "4. No answers, solutions, hints, or mark labels in output."
        )

        user_prompt = (
            f"Generate these long question parts:\n{parts_str}\n\n"
            f"Label EXACTLY as: Q{q_start_number}(a), Q{q_start_number}(b), "
            f"Q{q_start_number+1}(a), Q{q_start_number+1}(b), etc.\n\n"
            f"REFERENCE CONTEXTS:\n\n{combined}"
        )

        resp = self._call_llm([("system", long_system_prompt), ("user", user_prompt)])
        return self._parse_long_parts(resp, part_ids)

    # ── clean helper ─────────────────────────────────────────────────

    def _clean(self, text: str) -> str:
        if text.startswith("[") and "]" in text:
            text = text[text.find("]") + 1:].lstrip(" :")
        text = re.sub(r"^\s*\d{1,2}[.)]\s+", "", text.strip())
        return text.strip()

    # ── Structured assembly ──────────────────────────────────────────

    def _assemble_structured(
        self,
        config: TestConfig,
        selections: Dict[int, ChapterSelection],
        mcq_slots: List[QuestionSlot],
        mcq_texts: List[str],
        short_slots: List[QuestionSlot],
        short_texts: List[str],
        long_results: Dict[str, str],
        long_plans: List[Dict],
        mcq_topic_assignments: Optional[Dict[int, str]] = None,
    ) -> Dict:

        # Build topic map across all involved chapters
        all_topic_map: Dict[str, Tuple[int, str, str]] = {}
        for ch_num, ch_data in self.chapters_meta.items():
            sel = selections.get(ch_num)
            if sel is None or sel.selection_mode == "none":
                continue
            ch_name_t = ch_data.get("chapter_name", f"Chapter {ch_num}")
            for tnum, tdata in ch_data.get("topics", {}).items():
                all_topic_map[tnum] = (ch_num, ch_name_t, tdata.get("topic_name", tnum))

        # ── MCQs ─────────────────────────────────────────────────────
        mcqs = []
        for idx, (slot, raw_text) in enumerate(zip(mcq_slots, mcq_texts)):
            parsed = self._parse_mcq_block(self._clean(raw_text))

            ch = slot.chapters[0]
            ch_meta = self.chapters_meta.get(ch, {})
            ch_name = ch_meta.get("chapter_name", f"Chapter {ch}")

            topic_number = None
            topic_name = None
            resolved_ch = ch
            resolved_ch_name = ch_name

            # Step 1: use dedicated classification result
            if mcq_topic_assignments is not None:
                classified = mcq_topic_assignments.get(idx)
                if classified and classified in all_topic_map:
                    t_ch, t_ch_name, t_name = all_topic_map[classified]
                    if t_ch == ch:
                        topic_number = classified
                        resolved_ch = t_ch
                        resolved_ch_name = t_ch_name
                        topic_name = t_name
                    else:
                        print(f"[WARN] MCQ {idx+1}: classifier returned {classified} (ch{t_ch}) but slot is ch{ch}. Rejecting.")

            # Step 2: fallback — guarantees no nulls
            if topic_number is None and slot.preferred_topics:
                for candidate in slot.preferred_topics:
                    if candidate in all_topic_map:
                        topic_number = candidate
                        resolved_ch, resolved_ch_name, topic_name = all_topic_map[topic_number]
                        print(f"[FALLBACK] MCQ {idx+1}: assigned {topic_number} from preferred_topics")
                        break

            mcqs.append({
                "question_number": idx + 1,
                "chapter_number": resolved_ch,
                "chapter_name": resolved_ch_name,
                "topic_number": topic_number,
                "topic_name": topic_name,
                "question": parsed["question"],
                "options": parsed["options"],
                "correct_option": parsed["correct_option"],
                "student_answer": None,
            })

        # ── Short questions ──────────────────────────────────────────

        if config.mode == "board":
            groups: Dict[str, List] = defaultdict(list)
            for slot, text in zip(short_slots, short_texts):
                prefix = slot.qid.split("_")[0]
                groups[prefix].append((slot, text))

            short_questions = {}
            for q_label in ["Q2", "Q3", "Q4"]:
                if q_label not in groups:
                    continue
                arr = []
                for idx, (slot, text) in enumerate(groups[q_label], start=1):
                    arr.append({
                        "question_number": idx,
                        "question": self._clean(text),
                    })
                short_questions[q_label] = arr
        else:
            short_questions = []
            for idx, (slot, text) in enumerate(zip(short_slots, short_texts), start=1):
                short_questions.append({
                    "question_number": idx,
                    "question": self._clean(text),
                })

        # ── Long questions ───────────────────────────────────────────
        long_questions = []
        for plan in long_plans:
            q_num = plan["q_num"]
            a_ch  = plan["a_slot"].chapters[0]
            b_ch  = plan["b_slot"].chapters[0]

            long_questions.append({
                "question_number": q_num,
                "part_a": {
                    "marks": 4,
                    "type": "theory",
                    "chapter_number": a_ch,
                    "chapter_name": self.chapters_meta.get(a_ch, {}).get("chapter_name", f"Chapter {a_ch}"),
                    "question": self._clean(long_results.get(f"Q{q_num}a", "")),
                },
                "part_b": {
                    "marks": 5,
                    "type": plan["b_type"],
                    "chapter_number": b_ch,
                    "chapter_name": self.chapters_meta.get(b_ch, {}).get("chapter_name", f"Chapter {b_ch}"),
                    "question": self._clean(long_results.get(f"Q{q_num}b", "")),
                },
            })

        print(f"[ENGINE] Done. LLM calls this request: {self._llm_calls}")

        return {
            "test_details": self._build_test_details(config, selections),
            "mcqs": mcqs,
            "short_questions": short_questions,
            "long_questions": long_questions,
        }

    # ── Board runner ─────────────────────────────────────────────────

    def _run_board(self, config, selections, involved):
        blueprint = self._build_board_blueprint(selections)
        full_book = set(involved) == set(range(1, 10))

        mcq_slots   = [s for s in blueprint if s.kind == "mcq"]
        short_slots = [s for s in blueprint if s.kind == "short"]

        if full_book:
            six = random.sample(range(1, 10), 6)
            chapter_assignments = {
                "Q5a": six[0], "Q5b": six[1],
                "Q6a": six[2], "Q6b": six[3],
                "Q7a": six[4], "Q7b": six[5],
            }
        else:
            chapter_assignments = None

        long_pairs = [
            (
                QuestionSlot(qid="Q5a", kind="long_theory",    chapters=[chapter_assignments["Q5a"]] if chapter_assignments else involved),
                QuestionSlot(qid="Q5b", kind="long_numerical", chapters=[chapter_assignments["Q5b"]] if chapter_assignments else involved),
            ),
            (
                QuestionSlot(qid="Q6a", kind="long_theory",    chapters=[chapter_assignments["Q6a"]] if chapter_assignments else involved),
                QuestionSlot(qid="Q6b", kind="long_numerical", chapters=[chapter_assignments["Q6b"]] if chapter_assignments else involved),
            ),
            (
                QuestionSlot(qid="Q7a", kind="long_theory",    chapters=[chapter_assignments["Q7a"]] if chapter_assignments else involved),
                QuestionSlot(qid="Q7b", kind="long_numerical", chapters=[chapter_assignments["Q7b"]] if chapter_assignments else involved),
            ),
        ]

        # Sort short slots by their Q prefix for board mode grouping
        q2 = [s for s in short_slots if s.qid.startswith("Q2_")]
        q3 = [s for s in short_slots if s.qid.startswith("Q3_")]
        q4 = [s for s in short_slots if s.qid.startswith("Q4_")]
        ordered_short_slots = q2 + q3 + q4

        # 3 parallel generation calls + 1 classification = 4 total
        with ThreadPoolExecutor(max_workers=3) as ex:
            fut_mcq   = ex.submit(self._generate_all_mcqs, mcq_slots)
            fut_short = ex.submit(self._generate_all_shorts, ordered_short_slots)
            fut_longs = ex.submit(self._generate_long_batch, long_pairs, 5, chapter_assignments, selections)

            mcq_texts   = fut_mcq.result()
            short_texts = fut_short.result()
            long_results = fut_longs.result()

        # Build {orig_idx: raw_block} for classification
        mcq_blocks = {i: mcq_texts[i] for i in range(len(mcq_texts))}
        classification_topic_map = self._build_classification_topic_map(selections)
        mcq_topic_assignments = self._classify_all_mcqs(mcq_blocks, classification_topic_map)

        long_plans = self._plan_long_slots(long_pairs, selections, chapter_assignments, q_start_number=5)

        return self._assemble_structured(
            config, selections,
            mcq_slots, mcq_texts,
            ordered_short_slots, short_texts,
            long_results, long_plans,
            mcq_topic_assignments=mcq_topic_assignments,
        )

    # ── Custom runner ────────────────────────────────────────────────

    def _run_custom(self, config, selections, involved):
        blueprint = self._build_custom_blueprint(config, selections)

        mcq_slots         = [s for s in blueprint if s.kind == "mcq"]
        short_slots       = [s for s in blueprint if s.kind == "short"]
        long_theory_slots = [s for s in blueprint if s.kind == "long_theory"]
        long_num_slots    = [s for s in blueprint if s.kind == "long_numerical"]
        long_pairs        = list(zip(long_theory_slots, long_num_slots))

        # 3 parallel generation calls + 1 classification = 4 total
        with ThreadPoolExecutor(max_workers=3) as ex:
            fut_mcq   = ex.submit(self._generate_all_mcqs, mcq_slots)
            fut_short = ex.submit(self._generate_all_shorts, short_slots) if short_slots else None
            fut_longs = ex.submit(self._generate_long_batch, long_pairs, 3, None, selections) if long_pairs else None

            mcq_texts   = fut_mcq.result()
            short_texts = fut_short.result() if fut_short else []
            long_results = fut_longs.result() if fut_longs else {}

        # Build {orig_idx: raw_block} for classification
        mcq_blocks = {i: mcq_texts[i] for i in range(len(mcq_texts))}
        classification_topic_map = self._build_classification_topic_map(selections)
        mcq_topic_assignments = self._classify_all_mcqs(mcq_blocks, classification_topic_map)

        long_plans = self._plan_long_slots(long_pairs, selections, None, q_start_number=3) if long_pairs else []

        return self._assemble_structured(
            config, selections,
            mcq_slots, mcq_texts,
            short_slots, short_texts,
            long_results, long_plans,
            mcq_topic_assignments=mcq_topic_assignments,
        )