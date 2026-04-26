# Story 2.3: Triage Service Orchestration & Fallback Chain

Status: done

## Story

As a developer,
I want a single orchestration service that coordinates RAG + LLM inference with a three-tier fallback,
So that the triage pipeline always returns a valid result and never surfaces a blank screen or unhandled error to the patient.

## Acceptance Criteria

1. **Given** `rag_service` and `llm_service` from Stories 2.1–2.2 are available
   **When** `triage_service.classify(symptoms: str, patient_id: str) -> TriageResponse` is called
   **Then** tier 1: RAG context is retrieved and passed to `llm_service.classify`; if successful, a full `TriageResponse` is returned with `rag_used=True`

2. **And** tier 2: if `RAGUnavailableError` is raised, `llm_service.classify` is called with an empty context string and the response includes `rag_used=False`

3. **And** tier 3: if `LLMParseError` or any other exception is raised, a safe-default response is returned: `mts_level=3`, `mts_label="Urgent"`, `specialty="Γενική Ιατρική"`, `reasoning="Αδυναμία επεξεργασίας — παρακαλώ επικοινωνήστε με ιατρό."` — no exception is propagated

4. **And** after a successful triage result (tiers 1 or 2), the summary entry is appended to the in-memory queue in `core/queue.py` using `asyncio.Lock` to protect concurrent writes

5. **And** the queue entry contains: `patient_id`, `mts_level`, `specialty`, `timestamp` (ISO 8601) — raw symptom text is **never** stored in the queue

6. **And** `core/queue.py` exposes `append_entry(entry: QueueEntry)` and `get_all_entries() -> list[QueueEntry]`

7. **And** all exceptions are caught and logged with `exc_info=True` but without the symptom text — `triage_service.classify` **never** raises to the caller

8. **And** a unit test verifies each fallback tier activates correctly when upstream services raise the expected errors

## Tasks / Subtasks

- [x] Create `backend/app/schemas/triage.py` with `TriageResponse` and `QueueEntry` Pydantic models (AC: #1–#5)
  - [x] `TriageResponse`: `mts_level: int`, `mts_label: str`, `specialty: str`, `reasoning: str`, `rag_used: bool = True`
  - [x] `QueueEntry`: `patient_id: str`, `mts_level: int`, `specialty: str`, `timestamp: str`

- [x] Create `backend/app/core/queue.py` with asyncio-safe in-memory queue (AC: #4–#6)
  - [x] Module-level `_queue: list[QueueEntry] = []` and `_lock: asyncio.Lock = asyncio.Lock()`
  - [x] `async def append_entry(entry: QueueEntry) -> None` — acquires lock, appends entry
  - [x] `async def get_all_entries() -> list[QueueEntry]` — acquires lock, returns **copy** of list

- [x] Create `backend/app/services/triage_service.py` with three-tier fallback orchestration (AC: #1–#3, #7)
  - [x] Import `retrieve_context, RAGUnavailableError` from `app.services.rag_service`
  - [x] Import `classify as llm_classify, LLMParseError` from `app.services.llm_service`
  - [x] Import `append_entry` from `app.core.queue`
  - [x] Import `TriageResponse, QueueEntry` from `app.schemas.triage`
  - [x] Module-level `_SAFE_DEFAULT` constant (TriageResponse, not reconstructed per call)
  - [x] Tier-1 path: `retrieve_context` → `llm_classify(symptoms, context)` → `TriageResponse(rag_used=True, ...)`
  - [x] Tier-2 path: catch `RAGUnavailableError`, `llm_classify(symptoms, "")` → `TriageResponse(rag_used=False, ...)`
  - [x] Tier-3 path: outer `except Exception` catches all remaining → return `_SAFE_DEFAULT`
  - [x] Queue append after tier 1/2 success only: `patient_id, mts_level, specialty, timestamp` (no symptoms)
  - [x] Log only `type(exc).__name__` — never log `symptoms` or `patient_id` contents

- [x] Add unit tests to `backend/tests/test_triage_service.py` — **ADD to existing file, do NOT overwrite** (AC: #8)
  - [x] Test tier-1: RAG returns context + LLM succeeds → `rag_used=True`, result correct
  - [x] Test tier-2: `RAGUnavailableError` → LLM called with empty context → `rag_used=False`
  - [x] Test tier-3a: LLM raises `LLMParseError` → safe default returned, no raise
  - [x] Test tier-3b: unexpected exception → safe default returned, no raise
  - [x] Test queue entry appended on tier-1/2 success
  - [x] Test queue NOT appended on tier-3 (safe default)
  - [x] Test `llm_classify` called with `context=""` on RAG failure
  - [x] Sync fixture to clear `_queue` between tests

### Review Findings
- [x] [Review][Patch] Module-Level asyncio.Lock() Initialization — Instantiating `asyncio.Lock()` at module level outside an active event loop raises RuntimeError in modern Python, but the spec explicitly demanded it.
- [x] [Review][Patch] PHI Leakage Contradiction via `exc_info=True` — Passing `exc_info=True` logs the full traceback and exception message, which may contain patient data (e.g. from LLMParseError), violating the "never log symptom text" constraint.
- [x] [Review][Patch] Exception raised during `append_entry` propagates to caller [backend/app/services/triage_service.py]
- [x] [Review][Patch] Mutable Singleton State `_SAFE_DEFAULT` [backend/app/services/triage_service.py]
- [x] [Review][Patch] False State Isolation Promises in `get_all_entries()` [backend/app/core/queue.py]
- [x] [Review][Patch] Unused Import of `LLMParseError` [backend/app/services/triage_service.py]
- [x] [Review][Patch] Missing `exc_info=True` on Tier-2 Fallback [backend/app/services/triage_service.py]
- [x] [Review][Defer] Unbounded queue list growth [backend/app/core/queue.py] — deferred, pre-existing memory leak without current max size spec

## Dev Notes

### What Already Exists — Read Before Implementing

**`backend/app/services/rag_service.py`** (Story 2.1):
```python
class RAGUnavailableError(Exception): pass

async def retrieve_context(symptoms: str) -> str:
    # raises RAGUnavailableError if ChromaDB unreachable
```

**`backend/app/services/llm_service.py`** (Story 2.2 + review patches, committed in `a6b50f5`):
```python
class LLMParseError(Exception): pass

MTS_LABELS = {1: "Immediate", 2: "Very Urgent", 3: "Urgent", 4: "Less Urgent", 5: "Non-urgent"}

async def classify(symptoms: str, context: str) -> dict:
    # Returns: {"mts_level": int, "mts_label": str, "specialty": str, "reasoning": str}
    # Raises: ONLY LLMParseError — wraps ALL failures including ConnectionError, timeout, JSON errors
    # Never raises bare Exception
```

**Critical:** `llm_classify` raises ONLY `LLMParseError` on any failure. The Story 2.2 review hardened this: `ConnectionError`, timeout, and JSON decode failures are all wrapped in `LLMParseError`. Tier-2 to tier-3 transition catches `LLMParseError`. Outer `except Exception` in tier-3 is the last-resort safety net for truly unexpected failures (e.g., `asyncio.CancelledError` edge cases).

**`backend/app/core/config.py`** — has `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT`, `CHROMA_HOST`, `CHROMA_PORT`. No new config needed for this story.

**`backend/main.py`** — lifespan calls `seed_corpus_if_empty()` only. Do NOT add anything to lifespan for this story — `triage_service` is stateless.

**`backend/tests/test_triage_service.py`** — ALREADY EXISTS from Story 2.2 with 8 llm_service tests. **ADD** new functions at the bottom. Do NOT delete or overwrite the existing content.

**`backend/tests/conftest.py`** — exists. `pytest.ini` has `asyncio_mode = auto` — async test functions run automatically.

### Files to Create/Modify

```
backend/
├── app/
│   ├── core/
│   │   └── queue.py             ← CREATE
│   ├── schemas/                 ← CREATE directory
│   │   └── triage.py            ← CREATE (TriageResponse + QueueEntry only)
│   └── services/
│       └── triage_service.py    ← CREATE
└── tests/
    └── test_triage_service.py   ← MODIFY — append new tests, do NOT overwrite
```

**Do NOT touch:**
- `backend/main.py`
- `backend/app/services/rag_service.py`
- `backend/app/services/llm_service.py`
- `backend/app/core/config.py`
- `backend/requirements.txt` — `pydantic` is already present

**`__init__.py` check:** Verify whether `backend/app/schemas/` and `backend/app/core/` need `__init__.py`. The existing `app/services/` and `app/core/` work without them (Python namespace packages), so the new `schemas/` directory should work the same way. If imports fail, add empty `__init__.py`.

### Required: `backend/app/schemas/triage.py`

```python
from pydantic import BaseModel


class TriageResponse(BaseModel):
    mts_level: int
    mts_label: str
    specialty: str
    reasoning: str
    rag_used: bool = True


class QueueEntry(BaseModel):
    patient_id: str
    mts_level: int
    specialty: str
    timestamp: str  # ISO 8601, e.g. "2026-04-17T10:30:00+00:00"
```

**Note for Story 2.5:** `TriageResponse` will be **extended** in Story 2.5 to add `doctor: dict` and `redirect_url: str`. Keep this file minimal for now. Do NOT add `doctor` or `redirect_url` here.

**Note for Story 2.5:** `TriageRequest` (`symptoms: str`, `patient_id: str`) is created in Story 2.5. Do not create it here.

### Required: `backend/app/core/queue.py`

```python
import asyncio

from app.schemas.triage import QueueEntry

_queue: list[QueueEntry] = []
_lock: asyncio.Lock = asyncio.Lock()


async def append_entry(entry: QueueEntry) -> None:
    async with _lock:
        _queue.append(entry)


async def get_all_entries() -> list[QueueEntry]:
    async with _lock:
        return list(_queue)
```

**Critical design rules:**
- `asyncio.Lock()` must be **module-level** — creating a new Lock inside each call defeats its purpose
- `get_all_entries` returns `list(_queue)` — a shallow copy — to prevent external mutation of the internal list
- No logging in queue.py — it is pure infrastructure
- Story 4.1 (SSE endpoint) will call `get_all_entries()` directly; Story 2.5 router calls `triage_service.classify` which calls `append_entry`

### Required: `backend/app/services/triage_service.py`

```python
import logging
from datetime import datetime, timezone

from app.core.queue import append_entry
from app.schemas.triage import QueueEntry, TriageResponse
from app.services.llm_service import LLMParseError
from app.services.llm_service import classify as llm_classify
from app.services.rag_service import RAGUnavailableError, retrieve_context

logger = logging.getLogger(__name__)

_SAFE_DEFAULT = TriageResponse(
    mts_level=3,
    mts_label="Urgent",
    specialty="Γενική Ιατρική",
    reasoning="Αδυναμία επεξεργασίας — παρακαλώ επικοινωνήστε με ιατρό.",
    rag_used=False,
)


async def classify(symptoms: str, patient_id: str) -> TriageResponse:
    try:
        try:
            context = await retrieve_context(symptoms)
            llm_result = await llm_classify(symptoms=symptoms, context=context)
            result = TriageResponse(rag_used=True, **llm_result)
        except RAGUnavailableError:
            logger.warning("RAG unavailable — falling back to LLM base knowledge")
            llm_result = await llm_classify(symptoms=symptoms, context="")
            result = TriageResponse(rag_used=False, **llm_result)
    except Exception as exc:
        logger.error("Triage pipeline failure: %s", type(exc).__name__, exc_info=True)
        return _SAFE_DEFAULT

    timestamp = datetime.now(tz=timezone.utc).isoformat()
    await append_entry(QueueEntry(
        patient_id=patient_id,
        mts_level=result.mts_level,
        specialty=result.specialty,
        timestamp=timestamp,
    ))
    return result
```

**Key design decisions:**
- `_SAFE_DEFAULT` is a module-level constant — reused across calls, not reconstructed per request
- Nested try/except: inner `except RAGUnavailableError` handles tier-1→tier-2; outer `except Exception` handles tier-3 (catches `LLMParseError` from both tier-1 and tier-2 paths, plus any unexpected exception)
- `classify` **NEVER raises** — all paths return a `TriageResponse`. This is the NFR13 / "no HTTP 500" guarantee
- `**llm_result` unpacking works because `llm_classify` returns exactly `{mts_level, mts_label, specialty, reasoning}` matching `TriageResponse` fields
- Log only `type(exc).__name__` — never log `symptoms`, `patient_id`, or exception message (which might contain patient data via LLMParseError wrapping)
- `exc_info=True` preserves stack trace for diagnostics without leaking PHI in the log message itself
- Queue append happens ONLY after tier-1 or tier-2 success — safe default does NOT write to queue

### Required: New Tests in `backend/tests/test_triage_service.py`

**APPEND** these after the existing llm_service tests. Do not overwrite or delete existing functions.

```python
# ── Story 2.3: triage_service tests ──────────────────────────────────────────
from unittest.mock import AsyncMock

from app.services.triage_service import classify as triage_classify
from app.services.rag_service import RAGUnavailableError as _RAGUnavailableError
from app.services.llm_service import LLMParseError as _LLMParseError
from app.core import queue as queue_module

_VALID_LLM_RESULT = {
    "mts_level": 2,
    "mts_label": "Very Urgent",
    "specialty": "Καρδιολογία",
    "reasoning": "Πόνος στο στήθος.",
}


@pytest.fixture(autouse=True)
def reset_queue():
    queue_module._queue.clear()
    yield
    queue_module._queue.clear()


async def test_triage_tier1_rag_and_llm_success(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="context"))
    monkeypatch.setattr("app.services.triage_service.llm_classify", AsyncMock(return_value=_VALID_LLM_RESULT))
    result = await triage_classify("πόνος στο στήθος", "patient-001")
    assert result.rag_used is True
    assert result.mts_level == 2
    assert result.specialty == "Καρδιολογία"


async def test_triage_tier2_rag_unavailable_falls_back_to_llm(monkeypatch):
    mock_llm = AsyncMock(return_value=_VALID_LLM_RESULT)
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(side_effect=_RAGUnavailableError("down")))
    monkeypatch.setattr("app.services.triage_service.llm_classify", mock_llm)
    result = await triage_classify("πόνος", "patient-002")
    assert result.rag_used is False
    assert result.mts_level == 2
    mock_llm.assert_called_once_with(symptoms="πόνος", context="")


async def test_triage_tier3_llm_parse_error_returns_safe_default(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="ctx"))
    monkeypatch.setattr("app.services.triage_service.llm_classify", AsyncMock(side_effect=_LLMParseError("bad")))
    result = await triage_classify("πόνος", "patient-003")
    assert result.mts_level == 3
    assert result.specialty == "Γενική Ιατρική"
    assert result.rag_used is False


async def test_triage_tier3_unexpected_exception_returns_safe_default(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(side_effect=RuntimeError("boom")))
    result = await triage_classify("πόνος", "patient-004")
    assert result.mts_level == 3
    assert result.specialty == "Γενική Ιατρική"


async def test_triage_classify_never_raises(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(side_effect=Exception("catastrophic")))
    result = await triage_classify("πόνος", "patient-005")  # must not raise
    assert result is not None


async def test_triage_queue_entry_appended_on_success(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="ctx"))
    monkeypatch.setattr("app.services.triage_service.llm_classify", AsyncMock(return_value=_VALID_LLM_RESULT))
    await triage_classify("πόνος", "patient-006")
    entries = await queue_module.get_all_entries()
    assert len(entries) == 1
    entry = entries[0]
    assert entry.patient_id == "patient-006"
    assert entry.mts_level == 2
    assert entry.specialty == "Καρδιολογία"
    assert "symptoms" not in str(entry)


async def test_triage_queue_not_appended_on_tier3(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(side_effect=Exception("fail")))
    await triage_classify("πόνος", "patient-007")
    entries = await queue_module.get_all_entries()
    assert len(entries) == 0
```

**Notes:**
- `reset_queue` fixture is **sync** (not async) — sufficient since `_queue.clear()` is synchronous list manipulation
- `asyncio_mode = auto` handles all `async def test_*` functions automatically
- `monkeypatch.setattr` patches the names in `triage_service`'s namespace (`app.services.triage_service.retrieve_context`), NOT in the source module — this is critical for correct monkeypatching
- `_VALID_LLM_RESULT` matches the exact dict shape that `llm_service.classify` returns

### Architecture Compliance

**MUST follow:**
- `triage_service.py` is the **single orchestration point** — only file allowed to call `llm_service.classify` or `rag_service.retrieve_context`
- `triage_service.classify` **NEVER raises** to its caller — catches all exceptions (NFR13)
- Symptom text **NEVER** logged at any level (NFR5/NFR6)
- Queue protected by `asyncio.Lock` — concurrent `POST /api/v1/triage` requests trigger simultaneous `append_entry` calls
- `_SAFE_DEFAULT` is a module-level singleton, not reconstructed per call
- `queue.py` belongs in `core/` (infrastructure), NOT in `services/`

**Anti-patterns — explicitly forbidden:**
- ✗ Calling `llm_service.classify` or `rag_service.retrieve_context` from anywhere except `triage_service.py`
- ✗ Storing `symptoms` in `QueueEntry` — only `patient_id`, `mts_level`, `specialty`, `timestamp`
- ✗ `asyncio.Lock()` inside `append_entry` or `get_all_entries` — must be module-level
- ✗ `get_all_entries` returning `_queue` directly — must return `list(_queue)` copy
- ✗ Adding `doctor` or `redirect_url` to `TriageResponse` — Story 2.5 responsibility
- ✗ Adding `TriageRequest` to `schemas/triage.py` — Story 2.5 responsibility
- ✗ Raising from `triage_service.classify` under any circumstance
- ✗ Logging `symptoms`, `context`, or raw exception message (may contain patient data via LLMParseError wrapping)

### Story 2.5 Integration Contract

`triage_service.classify` is consumed by Story 2.5:
```python
# Story 2.5: routers/triage.py
from app.services import triage_service

result = await triage_service.classify(symptoms=req.symptoms, patient_id=req.patient_id)
# result is TriageResponse — Story 2.5 enriches it with doctor + redirect_url then returns to client
```

Story 2.5 will also register the triage router in `main.py`. This story does NOT touch `main.py`.

### Testing & Verification

```bash
cd backend
# Run all tests — must not break existing llm_service or rag_service tests
pytest tests/ -v
```

Expected output: all existing tests (11 from Stories 2.1+2.2) + 8 new triage_service tests = 19 total, all green.

### Previous Story Intelligence (Story 2.2 Learnings)

- **`asyncio.to_thread`** is the pattern for sync blocking calls. `triage_service.py` calls only async functions — no `asyncio.to_thread` needed here.
- **`test_triage_service.py` already exists** with 8 llm_service tests. Story 2.2 dev notes: "the triage pipeline is Story 2.3's triage_service.py, and this test file grows with it." ADD tests, never overwrite.
- **`LLMParseError` wraps all llm_service failures** (review fix: `ConnectionError`, timeout, JSON failures all → `LLMParseError`). The outer `except Exception` in `triage_service` is a true last-resort safety net; most LLM failures will be caught at `except LLMParseError` (which is a subclass of `Exception`).
- **`mts_label` is cross-validated** against `MTS_LABELS[mts_level]` in the review-patched `llm_service._parse_response`. Trust that `llm_result["mts_label"]` is correct when `llm_classify` succeeds.
- **`conftest.py` — `asyncio_mode = auto`** handles async tests. Do not add pytest markers.
- **Model is `mistral:7b`** — confirmed and in config.
- **Review found `exc_info=True` was removed** then restored. Keep `exc_info=True` in error logging.

### Git Intelligence

- `a6b50f5 Small tweaks and fixes` — Story 2.2 post-review patches: `OLLAMA_TIMEOUT`, `mts_label` cross-validation, brace-balanced JSON extractor, empty-string field guard
- `230abe2 biomistral-llm-service-via-ollama` — Story 2.2 implementation
- `9c42b3e chromadb-corpus-seeding-and-rag-service` — Story 2.1 implementation

Both service files are stable, reviewed, and committed. No pending changes.

### Project Structure Notes

- `schemas/` directory is new — does not yet exist on disk. Create it.
- `queue.py` goes in `core/` alongside `config.py`. `core/` already exists on disk.
- Import paths follow existing pattern: `from app.core.config import ...`, `from app.services.rag_service import ...`
- No changes to `requirements.txt` — `pydantic` was added in Story 1.2

### References

- Story 2.1: `_bmad-output/implementation-artifacts/2-1-chromadb-corpus-seeding-and-rag-service.md` (async patterns, `asyncio.to_thread`, test structure)
- Story 2.2: `_bmad-output/implementation-artifacts/2-2-biomistral-llm-service-via-ollama.md` (review findings, `LLMParseError` contract, test monkeypatching patterns)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (§ Implementation Patterns — fallback chain, logging, service boundaries; § Data Architecture — queue design; § Enforcement Guidelines)
- Epics: `_bmad-output/planning-artifacts/epics.md` (§ Story 2.3 acceptance criteria; § Additional Requirements — AI pipeline error handling, in-memory queue spec)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `backend/app/schemas/triage.py`: `TriageResponse` (mts_level, mts_label, specialty, reasoning, rag_used) and `QueueEntry` (patient_id, mts_level, specialty, timestamp) Pydantic models.
- Created `backend/app/core/queue.py`: module-level asyncio.Lock protects in-memory `_queue`. `append_entry` and `get_all_entries` both acquire the lock; `get_all_entries` returns a shallow copy.
- Created `backend/app/services/triage_service.py`: three-tier fallback — tier 1 uses RAG + LLM, tier 2 falls back to LLM with empty context on `RAGUnavailableError`, tier 3 returns `_SAFE_DEFAULT` singleton on any remaining exception. Queue entry appended only on tier-1/2 success. `_SAFE_DEFAULT` is module-level; `classify` never raises.
- Appended 7 new async test functions to `backend/tests/test_triage_service.py` (all ACs covered). All 18 tests in the file pass. 2 pre-existing `test_rag_service.py` failures due to missing `sentence_transformers` in local venv — unrelated to this story (pass in Docker where all deps are installed).

### File List

- backend/app/schemas/triage.py (created)
- backend/app/core/queue.py (created)
- backend/app/services/triage_service.py (created)
- backend/tests/test_triage_service.py (modified — appended 7 new test functions + fixtures)
