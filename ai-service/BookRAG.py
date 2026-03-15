import os
import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json
from dotenv import load_dotenv

from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage, SystemMessage

from mathbert_embeddings import MathBERTEmbeddings
from SentenceTransformerEmbeddings import SentenceTransformerEmbeddings

load_dotenv()


# ============================================================================
# Query Classification & Parsing
# ============================================================================

class QueryType(Enum):
    SPECIFIC_REFERENCE = "specific_reference"
    CONCEPTUAL = "conceptual"
    EXERCISE_REQUEST = "exercise_request"
    TOPIC_BASED = "topic_based"


@dataclass
class ParsedQuery:
    query_type: QueryType
    original_query: str
    chapter_number: Optional[int] = None
    topic_number: Optional[str] = None
    example_number: Optional[str] = None
    exercise_number: Optional[str] = None
    table_number: Optional[str] = None
    figure_number: Optional[str] = None
    activity_number: Optional[str] = None
    section_kinds: List[str] = None
    exercise_section: Optional[str] = None
    keywords: List[str] = None

    def __post_init__(self):
        if self.section_kinds is None: self.section_kinds = []
        if self.keywords is None: self.keywords = []


class QueryParser:
    EXERCISE_TYPE_PATTERNS = {
        'exercise_short': [
            r'(?:short\s+question|short\s+q|s\.?\s*q\.?|sq)\s+(\d+\.?\d*)',
            r'(\d+\.?\d*)\s+(?:short\s+question|short\s+q|sq)',
            r'\bsq\s+(\d+\.?\d*)',
            r'\bs\.q\.?\s+(\d+\.?\d*)',
        ],
        'exercise_mcq': [
            r'(?:mcq|mcqs|m\.?\s*c\.?\s*q\.?|multiple\s+choice|tick)\s+(\d+\.?\d*)',
            r'(\d+\.?\d*)\s+(?:mcq|mcqs|multiple\s+choice)',
        ],
        'exercise_numerical': [
            r'(?:numerical|num\.?|numerical\s+problem|numerical\s+question)\s+(\d+\.?\d*)',
            r'(\d+\.?\d*)\s+(?:numerical|numerical\s+problem)',
        ],
        'exercise_constructed': [
            r'(?:constructed\s+response|constructed|long\s+question|long\s+q)\s+(\d+\.?\d*)',
            r'(\d+\.?\d*)\s+(?:constructed\s+response|long\s+question)',
        ],
        'exercise_comprehensive': [
            r'(?:comprehensive|comprehensive\s+question)\s+(\d+\.?\d*)',
            r'(\d+\.?\d*)\s+comprehensive',
        ],
    }
    REFERENCE_PATTERNS = {
        'example': r'(?:example|ex\.?)\s+(\d+\.?\d*)',
        'table': r'(?:table|tab\.?)\s+(\d+\.?\d*)',
        'figure': r'(?:figure|fig\.?)\s+(\d+\.?\d*)',
        'chapter': r'(?:chapter|ch\.?)\s+(\d+)',
        'topic': r'(?:topic|section)\s+(\d+\.?\d*)',
        'activity': r'(?:activity|act\.?)\s+(\d+\.?\d*)',
    }
    GENERIC_EXERCISE_PATTERN = r'(?:exercise|question|q\.?|problem)\s+(\d+\.?\d*)'
    SECTION_KIND_KEYWORDS = {
        'mcq': ['exercise_mcq'], 'mcqs': ['exercise_mcq'],
        'multiple choice': ['exercise_mcq'], 'tick': ['exercise_mcq'],
        'short question': ['exercise_short'], 'short questions': ['exercise_short'],
        'short q': ['exercise_short'], 'short answer': ['exercise_short'],
        'sq': ['exercise_short'], 's.q': ['exercise_short'],
        'numerical': ['exercise_numerical'], 'numerical problem': ['exercise_numerical'],
        'numericals': ['exercise_numerical'], 'num': ['exercise_numerical'],
        'constructed': ['exercise_constructed'], 'constructed response': ['exercise_constructed'],
        'long question': ['exercise_constructed'], 'long answer': ['exercise_constructed'],
        'comprehensive': ['exercise_comprehensive'],
        'example': ['example'], 'theory': ['theory'],
        'activity': ['activity'], 'table': ['table'], 'key points': ['key_points'],
    }

    def parse(self, query: str) -> ParsedQuery:
        q = query.lower()
        parsed = ParsedQuery(query_type=QueryType.CONCEPTUAL, original_query=query)
        if not self.extract_exercise_types(q, parsed):
            self.extract_references(q, parsed)
        parsed.query_type = self.classify_query(q, parsed)
        self.extract_section_kinds(q, parsed)
        parsed.keywords = self.extract_keywords(query)
        return parsed

    def extract_exercise_types(self, q: str, parsed: ParsedQuery) -> bool:
        for section_kind, patterns in self.EXERCISE_TYPE_PATTERNS.items():
            for pattern in patterns:
                m = re.search(pattern, q, re.IGNORECASE)
                if m:
                    parsed.exercise_number = m.group(1)
                    parsed.section_kinds = [section_kind]
                    return True
        m = re.search(self.GENERIC_EXERCISE_PATTERN, q)
        if m:
            parsed.exercise_number = m.group(1)
            return True
        return False

    def classify_query(self, q: str, parsed: ParsedQuery) -> QueryType:
        if parsed.example_number or parsed.exercise_number or \
                parsed.table_number or parsed.figure_number:
            return QueryType.SPECIFIC_REFERENCE
        inds = ['give me', 'show me', 'find', 'list', 'practice', 'what is explained in']
        exts = ['mcq', 'question', 'exercise', 'problem', 'numerical', 'short', 'comprehensive question']
        if any(i in q for i in inds) and any(e in q for e in exts):
            return QueryType.EXERCISE_REQUEST
        if 'chapter' in q or 'topic' in q:
            return QueryType.TOPIC_BASED
        return QueryType.CONCEPTUAL

    def extract_references(self, q: str, parsed: ParsedQuery):
        for ref_type, pattern in self.REFERENCE_PATTERNS.items():
            m = re.search(pattern, q)
            if m:
                n = m.group(1)
                if ref_type == 'chapter':
                    parsed.chapter_number = int(n)
                elif ref_type == 'topic':
                    parsed.topic_number = n
                elif ref_type == 'example':
                    parsed.example_number = n
                elif ref_type == 'table':
                    parsed.table_number = n
                elif ref_type == 'figure':
                    parsed.figure_number = n
                elif ref_type == 'activity':
                    parsed.activity_number = n

    def extract_section_kinds(self, q: str, parsed: ParsedQuery):
        if parsed.example_number or parsed.exercise_number or \
                parsed.table_number or parsed.figure_number or parsed.activity_number:
            return
        if parsed.section_kinds:
            return
        for keyword, kinds in self.SECTION_KIND_KEYWORDS.items():
            if keyword in q:
                parsed.section_kinds.extend(kinds)
        parsed.section_kinds = list(set(parsed.section_kinds))

    def extract_keywords(self, query: str) -> List[str]:
        stopwords = {
            'what', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
            'or', 'but', 'give', 'me', 'show', 'find', 'explain', 'describe', 'tell', 'about',
            'how', 'why', 'when', 'short', 'question', 'mcq', 'numerical', 'exercise'
        }
        return [w for w in query.lower().split() if w not in stopwords and len(w) > 2]


# ============================================================================
# JSON Index
# ============================================================================

class JSONBookIndex:
    def __init__(self, json_path: str = "Book_Final.json"):
        self.json_path = json_path
        self._example_index: Dict[tuple, List[Document]] = {}
        self._exercise_index: Dict[tuple, List[Document]] = {}
        self._table_index: Dict[tuple, List[Document]] = {}
        self._figure_index: Dict[tuple, List[Document]] = {}
        self._activity_index: Dict[tuple, List[Document]] = {}
        self._loaded = False

    def build(self) -> bool:
        if not os.path.exists(self.json_path):
            print(f"[JSONBookIndex] {self.json_path} not found.")
            return False
        with open(self.json_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)
        for chunk in chunks:
            meta = chunk.get("metadata", {})
            content = chunk.get("page_content", chunk.get("content", ""))
            doc = Document(page_content=content, metadata=meta)
            ch = self._n(meta.get("chapter_number"))
            ex = self._n(meta.get("example_number"))
            exq = self._n(meta.get("exercise_question_number"))
            tbl = self._n(meta.get("table_number"))
            fig = self._n(meta.get("figure_number"))
            act = self._n(meta.get("activity_number"))
            sk = self._n(meta.get("section_kind"))
            if ex:  self._example_index.setdefault((ch, ex), []).append(doc)
            if exq:
                self._exercise_index.setdefault((ch, exq), []).append(doc)
                if sk: self._exercise_index.setdefault((ch, exq, sk), []).append(doc)
            if tbl: self._table_index.setdefault((ch, tbl), []).append(doc)
            if fig: self._figure_index.setdefault((ch, fig), []).append(doc)
            if act: self._activity_index.setdefault((ch, act), []).append(doc)
        self._loaded = True
        return True

    def lookup(self, parsed: ParsedQuery) -> List[Document]:
        if not self._loaded: return []
        ch = self._n(parsed.chapter_number)
        sk = self._n(parsed.section_kinds[0]) if parsed.section_kinds else None
        if parsed.example_number:
            docs = self._example_index.get((ch, self._n(parsed.example_number)), [])
            if docs: return self.by_page(docs)
        if parsed.exercise_number:
            exq = self._n(parsed.exercise_number)
            if sk:
                docs = self._exercise_index.get((ch, exq, sk), [])
                if docs: return self.by_page(docs)
            docs = self._exercise_index.get((ch, exq), [])
            if docs:
                if sk:
                    filtered = [d for d in docs if self._n(d.metadata.get("section_kind")) == sk]
                    return self.by_page(filtered or docs)
                return self.by_page(docs)
        if parsed.table_number:
            docs = self._table_index.get((ch, self._n(parsed.table_number)), [])
            if docs: return self.by_page(docs)
        if parsed.figure_number:
            docs = self._figure_index.get((ch, self._n(parsed.figure_number)), [])
            if docs: return self.by_page(docs)
        if parsed.activity_number:
            docs = self._activity_index.get((ch, self._n(parsed.activity_number)), [])
            if docs: return self.by_page(docs)
        return []

    @staticmethod
    def by_page(docs: List[Document]) -> List[Document]:
        def key(d):
            try:
                return int(d.metadata.get("page_start", 0))
            except:
                return 0

        return sorted(docs, key=key)

    @staticmethod
    def _n(v) -> Optional[str]:
        return None if v is None else str(v).strip().lower()

    @property
    def is_available(self) -> bool:
        return self._loaded


# ============================================================================
# Metadata Retriever
# ============================================================================

class MetadataRetriever:
    def __init__(self, math_vectorstore: Chroma, text_vectorstore: Chroma, json_index: JSONBookIndex = None):
        self.math_vectorstore = math_vectorstore
        self.text_vectorstore = text_vectorstore
        self.query_parser = QueryParser()
        self._json_index = json_index
        self._last_chapter = None
        self._last_topic = None
        self._last_example = None
        self._last_exercise = None
        self._last_section_kind = None
        self._last_docs: List[Document] = []

    def retrieve(self, query: str, k: int = 5) -> List[Document]:
        parsed = self.query_parser.parse(query)
        if parsed.query_type == QueryType.SPECIFIC_REFERENCE:
            candidates = self.retrieve_specific(parsed, k)
        elif parsed.query_type == QueryType.EXERCISE_REQUEST:
            candidates = self.retrieve_exercises(parsed, k)
        else:
            candidates = self.retrieve_semantic(parsed, k)

        ranked = self.rerank(candidates)
        if ranked:
            self._last_chapter = ranked[0].metadata.get('chapter_number')
            self._last_topic = ranked[0].metadata.get('topic_number')
            self._last_example = ranked[0].metadata.get('example_number')
            self._last_exercise = ranked[0].metadata.get('exercise_question_number')
            self._last_section_kind = ranked[0].metadata.get('section_kind')

        if parsed.query_type == QueryType.SPECIFIC_REFERENCE and ranked:
            result = self.expand(ranked, parsed)[:k]
        else:
            result = ranked[:k]

        self._last_docs = result
        return result

    def retrieve_specific(self, parsed: ParsedQuery, k: int) -> List[Tuple[Document, float]]:
        if self._json_index and self._json_index.is_available:
            docs = self._json_index.lookup(parsed)
            if docs:
                return [(doc, 10.0) for doc in docs]
        candidates = []
        for doc in (self.filtered_docs(self.math_vectorstore, parsed) +
                    self.filtered_docs(self.text_vectorstore, parsed)):
            s = self.score(doc, parsed)
            if s > 0: candidates.append((doc, s))
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates or self.retrieve_semantic(parsed, k * 3)

    def retrieve_exercises(self, parsed: ParsedQuery, k: int) -> List[Tuple[Document, float]]:
        if not parsed.section_kinds:
            parsed.section_kinds = ['exercise_mcq', 'exercise_short', 'exercise_numerical',
                                    'exercise_constructed', 'exercise_comprehensive']
        all_docs = (self.filtered_docs(self.math_vectorstore, parsed, 50) +
                    self.filtered_docs(self.text_vectorstore, parsed, 50))
        candidates = [(doc, 0.5 + sum(0.2 for kw in parsed.keywords
                                      if kw in doc.page_content.lower()))
                      for doc in all_docs]
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates

    def retrieve_semantic(self, parsed: ParsedQuery, k: int) -> List[Tuple[Document, float]]:
        theory_only = parsed.query_type in (QueryType.CONCEPTUAL, QueryType.TOPIC_BASED)
        candidates, seen = [], set()
        for vs in [self.math_vectorstore, self.text_vectorstore]:
            if not vs: continue
            try:
                filter_dict = {"section_kind": "theory"} if theory_only else None
                results = vs.similarity_search_with_score(
                    parsed.original_query, k=k * 2, filter=filter_dict
                )
                for doc, dist in results:
                    h = hash(doc.page_content)
                    if h not in seen:
                        seen.add(h)
                        candidates.append((doc, 1.0 / (1.0 + dist)))
            except Exception as e:
                print(f"[ERROR] Semantic search: {e}")

        # If theory-only search returned too few results, top up with all chunks
        if theory_only and len(candidates) < k:
            for vs in [self.math_vectorstore, self.text_vectorstore]:
                if not vs: continue
                try:
                    for doc, dist in vs.similarity_search_with_score(parsed.original_query, k=k * 2):
                        h = hash(doc.page_content)
                        if h not in seen:
                            seen.add(h)
                            candidates.append((doc, 1.0 / (1.0 + dist)))
                except Exception as e:
                    print(f"[ERROR] Semantic fallback: {e}")

        return candidates

    def expand(self, docs: List[Document], parsed: ParsedQuery) -> List[Document]:
        if not docs:
            return docs

        existing_contents = {d.page_content for d in docs}
        expanded = list(docs)

        # JSON path (no embedding)
        if self._json_index and self._json_index.is_available:
            all_ref_docs = self._json_index.lookup(parsed)
            for d in all_ref_docs:
                if d.page_content not in existing_contents:
                    expanded.append(d)
                    existing_contents.add(d.page_content)
            return expanded

        # Chroma fallback (only if JSON unavailable)
        meta = docs[0].metadata
        filt = {'chapter_number': meta.get('chapter_number')}
        limit = 5 if parsed.example_number else 3
        if parsed.example_number:
            filt['example_number'] = parsed.example_number
        else:
            filt['exercise_question_number'] = parsed.exercise_number
        for ctx in self.context_docs(filt, limit):
            if ctx.page_content not in existing_contents:
                expanded.append(ctx)
                existing_contents.add(ctx.page_content)
        return expanded

    def context_docs(self, filt: Dict, limit: int = 5) -> List[Document]:
        docs = []
        for vs in [self.math_vectorstore, self.text_vectorstore]:
            if not vs: continue
            try:
                docs.extend(vs.similarity_search("", k=limit, filter=filt))
            except:
                pass
        return docs

    def filtered_docs(self, vs: Chroma, parsed: ParsedQuery, limit: int = 100) -> List[Document]:
        if not vs: return []
        filt = {}
        if parsed.chapter_number is not None: filt['chapter_number'] = parsed.chapter_number
        if parsed.topic_number is not None: filt['topic_number'] = parsed.topic_number
        if parsed.example_number is not None: filt['example_number'] = parsed.example_number
        if parsed.exercise_number is not None: filt['exercise_question_number'] = parsed.exercise_number
        if parsed.table_number is not None: filt['table_number'] = parsed.table_number
        try:
            docs = vs.similarity_search(parsed.original_query, k=limit, filter=filt if filt else None)
            if parsed.section_kinds:
                docs = [d for d in docs if d.metadata.get('section_kind') in parsed.section_kinds]
            return docs
        except:
            return []

    def score(self, doc: Document, parsed: ParsedQuery) -> float:
        s, m = 0.0, doc.metadata
        if parsed.example_number and m.get('example_number') == parsed.example_number:  s += 10.0
        if parsed.exercise_number and m.get('exercise_question_number') == parsed.exercise_number: s += 10.0
        if parsed.table_number and m.get('table_number') == parsed.table_number:    s += 10.0
        if parsed.section_kinds and m.get('section_kind') in parsed.section_kinds:               s += 5.0
        if parsed.chapter_number and m.get('chapter_number') == parsed.chapter_number:            s += 2.0
        if parsed.topic_number and m.get('topic_number') == parsed.topic_number:              s += 2.0
        return s

    def rerank(self, candidates: List[Tuple[Document, float]]) -> List[Document]:
        candidates.sort(key=lambda x: x[1], reverse=True)
        return [doc for doc, _ in candidates]


# ============================================================================
# Prompts
# ============================================================================

SYSTEM_PROMPT = """You are a physics textbook assistant.

                    FORMAT RULES (mandatory):
                    - No LaTeX, no markdown, no bullet lists, no bold text, no headings.
                    - Write all math inline using Unicode: ², √, ×, ÷, °, π, Δ, θ, ∑, α, β.
                    - No numbered steps or section labels.

                    ANSWER STRUCTURE:
                    State given values in sentences. Write formulas inline. Substitute and compute
                    step by step, one line per step. State the final answer clearly.
                    Present tables in plain tabular form. For numericals, the bracketed value at
                    the end of the problem statement is the expected answer, derive it step by step.

                    LANGUAGE:
                    Detect the language of the CURRENT QUESTION only (ignore previous conversation language).
                    - If the current question is in English → respond in English.
                    - If the current question is in Roman Urdu (Urdu written in English letters) → respond in Roman Urdu.
                    - If the current question is in Urdu script → respond in Urdu script.
                    Do NOT carry over the language from previous turns.

                    TONE:
                    Calm and supportive. Simplify if the user seems confused or asks for easy explanation.
                    End every response with a brief line inviting further questions.

                    SCOPE:
                    Only answer questions about this physics textbook.
                    If the question is outside the book's content, say exactly: "I don't know."

                    IMPORTANT:
                    The retrieved context IS the exact content asked for. Never say it is missing or unavailable.
                    If the retrieved context does not match the current question but the answer is clear from
                    the conversation history, answer from the conversation history instead of the retrieved context.
                    Never answer from retrieved context that is clearly about a different topic than what was asked."""

CONDENSE_PROMPT = """You are a query rewriter for a physics textbook chatbot.
                    Given the conversation history and the new question, classify and rewrite it.  
                    CLASSIFICATION RULES, apply in this exact order:

                    1. SPECIFIC REFERENCE, if the message contains a textbook reference like
                       "example 3.2", "numerical 5.3", "SQ 1.2", "table 4.1":
                       → Label NEW: and return the reference EXACTLY as written.

                    2. CHAT, if the message is a pure social pleasantry with NO learning intent:
                       greetings, thanks, bye, acknowledgements like "ok", "great", "acha", "theek hai",
                       "shukriya", "thanks", "got it" (when not confused).
                       → Label CHAT: and write a short friendly reply.

                    3. FOLLOWUP, if the message expresses confusion, asks for elaboration, or
                       references something from the previous answer, even in broken language:
                       "samjh n aya", "samjh nhi", "kya?", "explain more", "dobara", "why",
                       "how", "mazeed", "aur batao", "nhi smjha", "please explain again".
                       Expressions of NOT understanding are ALWAYS FOLLOWUP, never CHAT.
                       → Label FOLLOWUP: and rewrite as a standalone question incorporating
                         the topic from conversation history.

                    4. NEW TOPIC, completely unrelated to the conversation:
                       → Label NEW: and return the question as-is.

                    IMPORTANT: Start response with exactly "FOLLOWUP:", "NEW:", or "CHAT:" then a space.

                    Examples:
                      FOLLOWUP: Please re-explain what torque is and how it is calculated.
                      FOLLOWUP: Explain in more detail how T2 produces zero torque in Example 4.5.
                      NEW: What is Hooke's law?
                      NEW: numerical 5.3
                      CHAT: You're welcome! Feel free to ask if you have more questions.

                    Conversation history:
                    {history}

                    New question: {question}

                    Response:"""


def doc_header(doc: Document) -> str:
    m = doc.metadata
    if m.get('example_number'):
        return f"[Example {m['example_number']}]"
    if m.get('exercise_question_number'):
        kind = m.get('section_kind', '').replace('exercise_', '').replace('_', ' ').title()
        return f"[{kind} Question {m['exercise_question_number']}]"
    if m.get('table_number'):
        return f"[Table {m['table_number']}]"
    return ""


# ===================
# BookRAG
# ===================

class BookRAG:
    def __init__(self, persist_dir: str = "/mnt/chroma/chromadb_physicsBook9"):
        self.persist_dir = persist_dir
        self.math_vectorstore = None
        self.text_vectorstore = None
        self.retriever = None
        self._llm = None
        self._figure_lookup: Dict[tuple, list] = {}
        self._history: List[Dict] = []

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------

    def load_vectorstores(self):
        math_path = os.path.join(self.persist_dir, "math")
        text_path = os.path.join(self.persist_dir, "text")

        if os.path.exists(math_path):
            self.math_vectorstore = Chroma(
                persist_directory=math_path,
                embedding_function=MathBERTEmbeddings(),
                collection_name="math_docs"
            )
        else:
            print("Math collection not found")

        if os.path.exists(text_path):
            self.text_vectorstore = Chroma(
                persist_directory=text_path,
                embedding_function=SentenceTransformerEmbeddings(),
                collection_name="text_docs"
            )
        else:
            print("Text collection not found")

        json_index = JSONBookIndex("/mnt/chroma/Book_Final.json")
        json_index.build()
        self.retriever = MetadataRetriever(
            self.math_vectorstore, self.text_vectorstore, json_index
        )
        # Figure asset lookup (separate from content retrieval)
        if os.path.exists("/mnt/chroma/Book_Final.json"):
            with open("/mnt/chroma/Book_Final.json", "r", encoding="utf-8") as f:
                chunks = json.load(f)
            for chunk in chunks:
                meta = chunk.get("metadata", {})
                fig_assets = meta.get("figure_assets", [])
                if not fig_assets: continue
                ch = meta.get("chapter_number")
                ex = meta.get("example_number")
                tbl = meta.get("table_number")
                ex_q = meta.get("exercise_question_number")
                topic = meta.get("topic_number")
                page = meta.get("page_start")
                if ex:    self._figure_lookup[("example", ch, ex)] = fig_assets
                if tbl:   self._figure_lookup[("table", ch, tbl)] = fig_assets
                if ex_q:  self._figure_lookup[("exercise", ch, ex_q)] = fig_assets

                if not ex and not tbl and not ex_q and topic:
                    self._figure_lookup[("theory", ch, topic, page)] = fig_assets
        else:
            print("Book_Final.json not found, figures unavailable")

    def setup_qa(self):
        self._llm = ChatOpenAI(model="gpt-4o-mini")

    def prepare_rag(self):
        self.load_vectorstores()
        self.setup_qa()

    # ------------------------------------------------------------------
    # ask()
    # ------------------------------------------------------------------

    def ask(self, question: str) -> Dict[str, List[str]]:
        if self._history:
            history_text = "\n".join(
                f"User: {t['question']}\nAssistant: {t['answer'][:300]}…"
                if len(t['answer']) > 300 else
                f"User: {t['question']}\nAssistant: {t['answer']}"
                for t in self._history[-3:]
            )
            condense_prompt = CONDENSE_PROMPT.format(
                history=history_text,
                question=question
            )
            try:
                raw = self._llm.invoke([HumanMessage(content=condense_prompt)]).content.strip()
                if raw.upper().startswith("CHAT:"):
                    answer = raw[len("CHAT:"):].strip()
                    self._history.append({"question": question, "answer": answer})
                    return {"answer": answer, "figures": []}
                elif raw.upper().startswith("FOLLOWUP:"):
                    is_followup = True
                    condensed = raw[len("FOLLOWUP:"):].strip()
                elif raw.upper().startswith("NEW:"):
                    is_followup = False
                    condensed = raw[len("NEW:"):].strip()
                else:
                    is_followup = False
                    condensed = raw
            except Exception as e:
                print(f"[WARN] Condense failed: {e}")
                is_followup = False
                condensed = question
        else:
            is_followup = False
            condensed = question

        # For followups: reuse the exact same docs from the previous turn.
        if is_followup and self.retriever._last_docs:
            docs = self.retriever._last_docs
        else:
            docs = self.retriever.retrieve(condensed, k=7)

        context = "\n\n---\n\n".join(
            ((doc_header(d) + "\n\n") if doc_header(d) else "") + d.page_content
            for d in docs
        )

        messages : List[BaseMessage] = [SystemMessage(content=SYSTEM_PROMPT)]
        for turn in self._history[-3:]:
            messages.append(HumanMessage(content=turn["question"]))
            messages.append(AIMessage(content=turn["answer"]))
        messages.append(HumanMessage(content=(
            f"[Retrieved context]\n{context}\n\n"
            f"[Current question]\n{question}"  # original question for natural answer tone
        )))

        response = self._llm.invoke(messages)
        answer = response.content

        self._history.append({"question": question, "answer": answer})

        figures = self.print_figures(docs)

        return {
            "answer": answer,
            "figures": figures,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def print_figures(self, docs: List[Document]):
        if not docs:
            return

        seen_urls: set = set()
        figures: list = []

        primary = docs[0].metadata
        anchor_example = primary.get("example_number")
        anchor_exercise = primary.get("exercise_question_number")
        anchor_table = primary.get("table_number")
        anchor_ch = primary.get("chapter_number")

        def is_on_topic(m: dict) -> bool:
            if anchor_example and m.get("example_number") == anchor_example \
                    and m.get("chapter_number") == anchor_ch:
                return True
            if anchor_exercise and m.get("exercise_question_number") == anchor_exercise \
                    and m.get("chapter_number") == anchor_ch:
                return True
            if anchor_table and m.get("table_number") == anchor_table \
                    and m.get("chapter_number") == anchor_ch:
                return True
            # No specific reference on primary doc → allow all (conceptual query)
            if not anchor_example and not anchor_exercise and not anchor_table:
                return True
            return False

        for doc in docs:
            m = doc.metadata
            if not is_on_topic(m):
                continue

            ch = m.get("chapter_number")

            # Path 1: lookup via figure_lookup dict (examples, exercises, tables)
            for key in [
                ("example", ch, m.get("example_number")),
                ("table", ch, m.get("table_number")),
                ("exercise", ch, m.get("exercise_question_number")),
            ]:
                if key[2] is None: continue
                for fig in self._figure_lookup.get(key, []):
                    new_urls = [u for u in fig.get("urls", []) if u not in seen_urls]
                    if new_urls:
                        seen_urls.update(new_urls)
                        figures.append({
                            "figure_number": fig.get("figure_number"),
                            "caption": fig.get("caption", ""),
                            "urls": new_urls,
                        })

            # Path 2: theory chunks, look up by (chapter, topic, page_start)
            if not m.get("example_number") and not m.get("exercise_question_number") \
                    and not m.get("table_number"):
                theory_key = ("theory", ch, m.get("topic_number"), m.get("page_start"))
                for fig in self._figure_lookup.get(theory_key, []):
                    new_urls = [u for u in fig.get("urls", []) if u not in seen_urls]
                    if new_urls:
                        seen_urls.update(new_urls)
                        figures.append({
                            "figure_number": fig.get("figure_number"),
                            "caption": fig.get("caption", ""),
                            "urls": new_urls,
                        })

            # Path 3: inline URLs in page_content (fallback)
            for url in re.findall(r'https://cdn\.mathpix\.com/\S+', doc.page_content):
                url = url.rstrip('.,)')
                if url not in seen_urls:
                    seen_urls.add(url)
                    figures.append({"figure_number": None, "caption": "", "urls": [url]})

        if not figures: return []
        print("\n" + "=" * 80)
        print(f"FIGURES ({len(figures)}):")
        print("=" * 80)
        for fig in figures:
            n = fig.get("figure_number")
            cap = fig.get("caption", "")
            lbl = (f"Fig. {n}" if n else "Figure") + (f" — {cap}" if cap else "")
            print(f"\n  {lbl}")
            for url in fig.get("urls", []):
                print(f"  {url}")
        return figures

    def clear_history(self):
        self._history.clear()
        self.retriever._last_chapter = None
        self.retriever._last_topic = None
        self.retriever._last_example = None
        self.retriever._last_exercise = None
        self.retriever._last_section_kind = None
        self.retriever._last_docs = []
        print("[History cleared]")

