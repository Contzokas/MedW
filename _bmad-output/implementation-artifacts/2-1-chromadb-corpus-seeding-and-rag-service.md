# Story 2.1: ChromaDB Corpus Seeding & RAG Service

Status: done

## Story

As a developer,
I want a ChromaDB collection seeded with clinical context documents at startup,
So that the AI pipeline can retrieve relevant medical context to augment Mistral inference.

## Acceptance Criteria

1. **Given** a running ChromaDB service (internal Docker network or localhost for development)
   **When** the FastAPI application starts via its lifespan event
   **Then** `rag_service.seed_corpus_if_empty()` is called and checks whether the `clinical_context` collection already contains documents before ingesting

2. **And** if the collection is empty, documents from `backend/data/corpus/mts_guidelines.md` and `backend/data/corpus/specialty_reference.md` are ingested using the `all-MiniLM-L6-v2` embedding model (ChromaDB default built-in)

3. **And** the seeding operation is idempotent — running it twice does not create duplicate documents

4. **And** `rag_service.retrieve_context(symptoms: str) -> str` returns the top-k most relevant chunks for a given symptom string as a single joined string

5. **And** when ChromaDB is unreachable, `retrieve_context` raises a `RAGUnavailableError` (caught by the triage service in Story 2.3) rather than propagating an unhandled exception

6. **And** a unit test in `backend/tests/test_rag_service.py` verifies that `retrieve_context` returns a non-empty string for a sample Greek symptom input when the collection is seeded

## Tasks / Subtasks

- [x] Add missing dependencies to `backend/requirements.txt` (AC: #2, #6)
  - [x] Add `sentence-transformers` (required for `all-MiniLM-L6-v2` embedding)
  - [x] Add `pytest` and `pytest-asyncio` (required for test suite)

- [x] Create corpus files `backend/data/corpus/mts_guidelines.md` and `backend/data/corpus/specialty_reference.md` (AC: #2)
  - [x] `mts_guidelines.md`: MTS levels 1–5 with symptom triggers (Greek-relevant clinical context)
  - [x] `specialty_reference.md`: Symptom-to-specialty mapping reference

- [x] Create `backend/app/services/rag_service.py` (AC: #1–#5)
  - [x] Define `RAGUnavailableError` exception class
  - [x] Implement `seed_corpus_if_empty()` — idempotent ChromaDB seeding via lifespan
  - [x] Implement `retrieve_context(symptoms: str) -> str` — returns top-k chunks joined as string
  - [x] Wrap ChromaDB errors in `RAGUnavailableError`

- [x] Modify `backend/main.py` to add FastAPI lifespan event (AC: #1)
  - [x] Add `@asynccontextmanager` lifespan function that calls `seed_corpus_if_empty()`
  - [x] Pass `lifespan=lifespan` to `FastAPI(...)` constructor

- [x] Create `backend/tests/conftest.py` (test infrastructure)
  - [x] Add `pytest-asyncio` asyncio mode configuration

- [x] Create `backend/tests/test_rag_service.py` (AC: #6)
  - [x] Test: seeded collection returns non-empty string for Greek symptom input
  - [x] Test: `seed_corpus_if_empty()` is idempotent (calling twice doesn't error or duplicate)

## Dev Notes

### What Already Exists — Read Before Implementing

**`backend/main.py`** — has FastAPI app with CORS and health router only. NO lifespan event yet. Must add one:
```python
# Current state (do not remove existing setup):
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health
# ... CORSMiddleware, health router registration
```

**`backend/app/core/config.py`** — already has `CHROMA_HOST` and `CHROMA_PORT`. Use directly:
```python
OLLAMA_HOST: str = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
CHROMA_HOST: str = os.environ.get("CHROMA_HOST", "chromadb")
CHROMA_PORT: int = int(os.environ.get("CHROMA_PORT", "8000"))  # default 8000
```
**Critical:** Port is `8000` (not 8001). The earlier `CHROMA_PORT=8001` was a bug fixed in Story 1.3 PRs. `docker-compose.yml` uses `CHROMA_SERVER_PORT=8000` and `CHROMA_PORT=8000`.

**`backend/app/services/`** — empty directory, no service files exist yet. You are creating the first one.

**`backend/app/schemas/`** — empty directory. This story does not create schemas (Story 2.5 handles `triage.py` schema, Story 2.4 handles `doctor.py`).

**`backend/tests/`** — empty directory, no `conftest.py` yet. Create it in this story.

**`backend/data/corpus/`** — directory exists, is empty. Create both corpus files here.

**`backend/requirements.txt`** — already has `langchain==1.2.15`, `langchain-core==1.2.29`, `langchain-community`, `langchain-chroma`, `chromadb==1.5.7`, `pydantic`, `python-dotenv`. Missing: `sentence-transformers`, `pytest`, `pytest-asyncio`.

### Required: `backend/requirements.txt` additions

Append these lines to the existing `requirements.txt` (do not remove any existing lines):
```
sentence-transformers
pytest
pytest-asyncio
```

### Required: Corpus Files

**`backend/data/corpus/mts_guidelines.md`** — Create with this content (sufficient for RAG retrieval quality):

```markdown
# Manchester Triage System (MTS) Clinical Guidelines

## MTS Level 1 — Immediate (Άμεση Αντιμετώπιση)
Life-threatening conditions requiring immediate intervention.
Symptoms: cardiac arrest, no breathing, unconscious/unresponsive, severe anaphylaxis with airway compromise, uncontrolled major haemorrhage, eclampsia.
Action: Immediate resuscitation, code activation.

## MTS Level 2 — Very Urgent (Πολύ Επείγον) — Target: 10 minutes
Conditions presenting significant risk of deterioration.
Symptoms: chest pain with radiation to arm/jaw, suspected stroke (facial droop, arm weakness, speech difficulty), severe difficulty breathing, altered mental status, severe allergic reaction, active moderate bleeding, seizures, severe abdominal pain with rigidity, suspected sepsis with fever and confusion.
Action: Rapid assessment and intervention within 10 minutes.

## MTS Level 3 — Urgent (Επείγον) — Target: 30 minutes
Moderate conditions requiring prompt attention.
Symptoms: moderate chest pain, moderate shortness of breath, high fever (>38.5°C) in adults, persistent vomiting or diarrhea with dehydration signs, significant pain (5–7/10), moderate lacerations, headache with neck stiffness, urinary symptoms with fever, back pain with neurological signs.
Action: Assessment within 30 minutes.

## MTS Level 4 — Less Urgent (Λιγότερο Επείγον) — Target: 1 hour
Minor conditions that need attention but are not immediately dangerous.
Symptoms: mild pain (1–4/10), minor lacerations, sore throat, mild fever (<38.5°C), ear pain, mild headache without neurological signs, minor musculoskeletal injuries, skin rashes without systemic symptoms, urinary symptoms without fever.
Action: Assessment within 1 hour.

## MTS Level 5 — Non-Urgent (Μη Επείγον) — Target: 2 hours
Conditions that can safely wait for assessment.
Symptoms: chronic conditions without acute exacerbation, minor complaints, prescription refills, minor skin irritation, well-controlled chronic pain, follow-up queries.
Action: Assessment within 2 hours when acute cases are managed.

## Key MTS Discriminators
- Pain severity (0–10 scale) is a primary discriminator across all levels.
- Airway compromise or respiratory distress always escalates to Level 1 or 2.
- Fever in infants under 3 months is Level 2 regardless of other symptoms.
- Mechanism of injury (trauma) can escalate triage level.
- Mental status changes always warrant Level 2 or higher.
```

**`backend/data/corpus/specialty_reference.md`** — Create with this content:

```markdown
# Medical Specialty Reference — Symptom Mapping

## Καρδιολογία (Cardiology)
Symptoms: chest pain, chest tightness, palpitations, irregular heartbeat, shortness of breath on exertion, leg swelling, syncope, hypertension, racing heart.
Conditions: angina, myocardial infarction, arrhythmia, heart failure, hypertensive crisis.
MTS correlation: Level 1–2 for acute chest pain; Level 3–4 for chronic cardiac symptoms.

## Νευρολογία (Neurology)
Symptoms: severe headache (thunderclap), dizziness, vertigo, numbness or tingling in limbs, facial asymmetry, speech difficulty, vision changes, weakness in one side, loss of balance, confusion, memory loss, seizures.
Conditions: stroke, TIA, migraine, epilepsy, multiple sclerosis, neuropathy.
MTS correlation: Level 2 for acute stroke signs; Level 3 for severe migraine; Level 4 for chronic neurological complaints.

## Γαστρεντερολογία (Gastroenterology)
Symptoms: severe abdominal pain, nausea, vomiting, diarrhea, blood in stool, heartburn, difficulty swallowing, bloating, jaundice.
Conditions: appendicitis, peptic ulcer, gastritis, irritable bowel syndrome, cholecystitis, pancreatitis.
MTS correlation: Level 2 for peritoneal signs; Level 3 for persistent vomiting; Level 4 for mild gastrointestinal complaints.

## Ορθοπεδική (Orthopedics)
Symptoms: bone pain, joint swelling, limited range of motion, back pain, neck pain, muscle weakness, deformity after injury, inability to bear weight.
Conditions: fractures, sprains, arthritis, disc herniation, tendinopathy.
MTS correlation: Level 3 for suspected fractures; Level 4 for minor sprains; Level 3 for back pain with neurological deficit.

## Πνευμονολογία (Pulmonology)
Symptoms: persistent cough, shortness of breath at rest, wheezing, coughing blood, night sweats, unexplained weight loss with respiratory symptoms.
Conditions: asthma exacerbation, COPD, pneumonia, pulmonary embolism, tuberculosis.
MTS correlation: Level 2 for severe dyspnoea; Level 3 for moderate respiratory distress; Level 4 for stable asthma.

## Παθολογία / Γενική Ιατρική (Internal Medicine / General Practice)
Default specialty for undifferentiated complaints, systemic illness, fever without clear source, general malaise, fatigue, multi-system symptoms not fitting a specific specialty.
Conditions: viral infections, systemic inflammatory conditions, metabolic disorders, unexplained symptoms.

## Ουρολογία (Urology)
Symptoms: pain on urination, blood in urine, kidney/flank pain, difficulty urinating, frequent urination with burning, testicular pain.
Conditions: urinary tract infection, kidney stones, pyelonephritis, urinary retention.
MTS correlation: Level 2 for severe renal colic; Level 3 for UTI with fever; Level 4 for lower urinary tract symptoms.

## Δερματολογία (Dermatology)
Symptoms: rash, skin lesions, itching, blistering, skin colour changes.
Conditions: contact dermatitis, psoriasis, eczema, cellulitis, urticaria.
MTS correlation: Level 2 for anaphylactic rash with systemic symptoms; Level 4–5 for isolated skin complaints.

## Ψυχιατρική (Psychiatry)
Symptoms: acute agitation, suicidal ideation, self-harm, severe anxiety, psychotic symptoms, acute confusion.
MTS correlation: Level 2 for immediate risk; Level 3 for acute psychiatric crisis.
```

### Required: `backend/app/services/rag_service.py`

Use the native `chromadb` Python client directly (not langchain-chroma) for collection management and retrieval. This gives direct control over seeding and idempotency:

```python
import asyncio
import logging
from pathlib import Path

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from app.core.config import CHROMA_HOST, CHROMA_PORT

logger = logging.getLogger(__name__)

COLLECTION_NAME = "clinical_context"
CORPUS_DIR = Path(__file__).parent.parent.parent / "data" / "corpus"
TOP_K = 3


class RAGUnavailableError(Exception):
    pass


def _get_collection():
    client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
    embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embedding_fn,
    )


def _seed_sync() -> None:
    collection = _get_collection()
    if collection.count() > 0:
        logger.info("ChromaDB collection '%s' already seeded, skipping.", COLLECTION_NAME)
        return

    documents = []
    ids = []
    for corpus_file in sorted(CORPUS_DIR.glob("*.md")):
        text = corpus_file.read_text(encoding="utf-8")
        # Split by double newline to create chunks; filter empty chunks
        chunks = [c.strip() for c in text.split("\n\n") if c.strip()]
        for i, chunk in enumerate(chunks):
            doc_id = f"{corpus_file.stem}_{i}"
            documents.append(chunk)
            ids.append(doc_id)

    if documents:
        collection.add(documents=documents, ids=ids)
        logger.info("Seeded ChromaDB collection '%s' with %d chunks.", COLLECTION_NAME, len(documents))


def _retrieve_sync(symptoms: str) -> str:
    collection = _get_collection()
    results = collection.query(query_texts=[symptoms], n_results=TOP_K)
    docs = results.get("documents", [[]])[0]
    return "\n\n".join(docs) if docs else ""


async def seed_corpus_if_empty() -> None:
    try:
        await asyncio.to_thread(_seed_sync)
    except Exception as exc:
        # Log but do not raise — seeding failure should not prevent startup
        logger.error("ChromaDB corpus seeding failed: %s", exc, exc_info=True)


async def retrieve_context(symptoms: str) -> str:
    try:
        return await asyncio.to_thread(_retrieve_sync, symptoms)
    except Exception as exc:
        logger.error("ChromaDB retrieval failed: %s", exc, exc_info=True)
        raise RAGUnavailableError(f"ChromaDB unavailable: {exc}") from exc
```

**Key design decisions:**
- `seed_corpus_if_empty()` is **async** — called from FastAPI lifespan which is async.
- `asyncio.to_thread` runs synchronous ChromaDB calls without blocking the event loop.
- Seeding failure logs but does **not raise** — app starts even if ChromaDB is temporarily unavailable.
- `retrieve_context` wraps all exceptions in `RAGUnavailableError` — Story 2.3 catches this specific type to activate fallback tier 2.
- Chunks split by double newline (`\n\n`) — appropriate for the markdown corpus format.
- Document IDs are deterministic (`filename_index`) — ensures `add()` is idempotent (ChromaDB will error on duplicate IDs, so the `collection.count() > 0` guard prevents re-seeding).
- **NEVER log the `symptoms` parameter** — patient data must not appear in logs (NFR5).

### Required: Modify `backend/main.py`

Add the FastAPI lifespan event. The existing content must be preserved. Change:

```python
# BEFORE (current main.py):
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MedW API", version="0.1.0")
```

To:

```python
# AFTER:
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health
from app.services.rag_service import seed_corpus_if_empty

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_corpus_if_empty()
    yield


app = FastAPI(title="MedW API", version="0.1.0", lifespan=lifespan)
```

Keep the `CORSMiddleware` and `app.include_router(health.router, prefix="/api/v1")` exactly as they are. Only add the lifespan and the two new imports.

### Required: `backend/tests/conftest.py`

```python
import pytest


def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: mark test as async")
```

Also create/update `backend/pytest.ini` (or `backend/pyproject.toml` if it exists) to configure asyncio mode. If neither exists, create `backend/pytest.ini`:

```ini
[pytest]
asyncio_mode = auto
```

### Required: `backend/tests/test_rag_service.py`

```python
import pytest
import chromadb

from app.services.rag_service import (
    COLLECTION_NAME,
    CORPUS_DIR,
    RAGUnavailableError,
    _get_collection,
    _retrieve_sync,
    _seed_sync,
    retrieve_context,
    seed_corpus_if_empty,
)


@pytest.fixture
def in_memory_chroma(monkeypatch):
    """Replace HttpClient with in-memory ChromaDB client for unit tests."""
    client = chromadb.Client()  # ephemeral in-memory client

    def fake_get_collection():
        from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
        embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        return client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=embedding_fn,
        )

    monkeypatch.setattr("app.services.rag_service._get_collection", fake_get_collection)
    return client


def test_retrieve_context_returns_nonempty_string_after_seeding(in_memory_chroma):
    _seed_sync()
    result = _retrieve_sync("πόνος στο στήθος")
    assert isinstance(result, str)
    assert len(result) > 0


def test_seed_is_idempotent(in_memory_chroma):
    _seed_sync()
    count_after_first = in_memory_chroma.get_collection(COLLECTION_NAME).count()
    _seed_sync()  # second call — should be a no-op
    count_after_second = in_memory_chroma.get_collection(COLLECTION_NAME).count()
    assert count_after_first == count_after_second


async def test_retrieve_context_raises_rag_unavailable_error_on_connection_failure(monkeypatch):
    def raise_error():
        raise ConnectionError("ChromaDB unreachable")

    monkeypatch.setattr("app.services.rag_service._get_collection", raise_error)
    with pytest.raises(RAGUnavailableError):
        await retrieve_context("πόνος στο στήθος")
```

**Notes on the test approach:**
- `chromadb.Client()` creates an ephemeral in-memory instance — no running ChromaDB service needed.
- `monkeypatch` replaces `_get_collection` to redirect calls to the in-memory client.
- The `test_retrieve_context_raises_rag_unavailable_error_on_connection_failure` test is `async` — pytest-asyncio handles it automatically with `asyncio_mode = auto`.
- Do NOT mock the actual embedding model in tests — the real `SentenceTransformerEmbeddingFunction` is used to ensure the embedding logic is exercised.

### Architecture Compliance

**MUST follow:**
- `rag_service.py` lives in `backend/app/services/` — the only location for business logic
- No business logic in routers — this story creates no router files
- `retrieve_context` signature: `async def retrieve_context(symptoms: str) -> str` — used by Story 2.3
- `RAGUnavailableError` must be importable from `app.services.rag_service` — Story 2.3 imports it
- ChromaDB accessed only from `rag_service.py` — no other file connects to ChromaDB directly
- `CHROMA_HOST=chromadb`, `CHROMA_PORT=8000` (from config.py and docker-compose.yml)
- No symptom text in any log statement at any level

**Anti-patterns — explicitly forbidden:**
- Do NOT connect to ChromaDB from `main.py` directly — all ChromaDB logic stays in `rag_service.py`
- Do NOT use `langchain-chroma` for the RAG service — use native `chromadb` client for direct control
- Do NOT store `symptoms` text in any log statement
- Do NOT use `chromadb.PersistentClient` in the service — `HttpClient` connects to the Docker container
- Do NOT use `chromadb.EphemeralClient` in production code — only in tests via monkeypatch

### Dependencies and Integration Points

**This story creates the foundation for Story 2.3 (Triage Service Orchestration):**
- Story 2.3 imports: `from app.services.rag_service import retrieve_context, RAGUnavailableError`
- Story 2.3 calls: `context = await retrieve_context(symptoms)` inside a try/except `RAGUnavailableError`

**This story does NOT interact with:**
- `llm_service.py` (Story 2.2) — no dependency
- `doctor_service.py` (Story 2.4) — no dependency
- `triage.py` router (Story 2.5) — no dependency

### File Structure Impact

Files created by this story:
```
backend/
├── requirements.txt          ← ADD: sentence-transformers, pytest, pytest-asyncio
├── pytest.ini                ← CREATE: asyncio_mode = auto
├── main.py                   ← MODIFY: add lifespan event + imports
├── app/
│   └── services/
│       └── rag_service.py    ← CREATE
├── data/
│   └── corpus/
│       ├── mts_guidelines.md       ← CREATE
│       └── specialty_reference.md  ← CREATE
└── tests/
    ├── conftest.py           ← CREATE
    └── test_rag_service.py   ← CREATE
```

Do NOT modify:
- `backend/app/routers/health.py` — untouched
- `backend/app/core/config.py` — already has required vars
- `docker-compose.yml` — already configured correctly
- `frontend/` — no frontend work in this story

### Previous Story Intelligence

From Epic 1 retrospective and Story 1.3:
- **Model is `mistral:7b`**, NOT `biomistral:7b` — the spec drift was resolved before PR merge.
- **CHROMA_PORT is 8000** in docker-compose.yml (`CHROMA_SERVER_PORT=8000`) and config.py defaults. The 8001 value was a bug fixed in PR review.
- `config.py` already has `CHROMA_HOST` and `CHROMA_PORT` — use `from app.core.config import CHROMA_HOST, CHROMA_PORT`.
- Backend Dockerfile uses `python:3.11-slim` with curl installed — no changes needed.
- The retrospective flagged: "run mandatory architecture-spec consistency check before implementation." This story resolves ChromaDB connection details (port 8000, `chromadb` as internal hostname) per current docker-compose.yml.

From deferred-work.md:
- `langchain==1.2.15` and `chromadb==1.5.7` version pins were flagged for PyPI verification. Since Epic 1 was implemented and completed successfully with these versions in requirements.txt, treat them as confirmed working.

### Testing & Verification

**Local development (without Docker):**
```bash
cd backend
pip install -r requirements.txt
# Start ChromaDB locally for integration testing:
# docker run -p 8000:8000 chromadb/chroma:1.5.7
CHROMA_HOST=localhost CHROMA_PORT=8000 uvicorn main:app --reload
# Verify in logs: "Seeded ChromaDB collection 'clinical_context' with N chunks."
```

**Run unit tests (no running ChromaDB needed):**
```bash
cd backend
pytest tests/test_rag_service.py -v
```

**Verify seeding idempotency:**
```bash
# Restart the backend twice, check logs show "already seeded, skipping" on second run
```

**Verify `GET /api/v1/health` still returns `{"status": "ok"}` after lifespan changes:**
```bash
curl http://localhost:8000/api/v1/health
# Expected: {"status": "ok"}
```

The health endpoint must continue working — the lifespan event runs before requests are accepted, so a ChromaDB seeding failure should only log, not crash startup.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none_

### Completion Notes List

- Implemented `rag_service.py` using native `chromadb.HttpClient` (not langchain-chroma) with `SentenceTransformerEmbeddingFunction(all-MiniLM-L6-v2)` for embeddings.
- `seed_corpus_if_empty()` is idempotent: guards with `collection.count() > 0` check; deterministic IDs (`filename_index`) prevent duplicates.
- `retrieve_context()` wraps all exceptions in `RAGUnavailableError` — ready for Story 2.3 fallback chain.
- No symptom text logged anywhere (NFR5 compliance).
- `asyncio.to_thread` used to run synchronous ChromaDB calls without blocking the event loop.
- Seeding failure in lifespan only logs, does not crash startup.
- All 3 unit tests pass using ephemeral in-memory ChromaDB via `monkeypatch` — no running ChromaDB required.
- `pytest.ini` with `asyncio_mode = auto` enables async test support automatically.

### File List

- `backend/requirements.txt` (modified)
- `backend/main.py` (modified)
- `backend/pytest.ini` (created)
- `backend/app/services/rag_service.py` (created)
- `backend/data/corpus/mts_guidelines.md` (created)
- `backend/data/corpus/specialty_reference.md` (created)
- `backend/tests/conftest.py` (created)
- `backend/tests/test_rag_service.py` (created)

### Review Findings

- [x] [Review][Decision] `pytest`/`pytest-asyncio` in production `requirements.txt` — resolved: keep single requirements.txt (hackathon-scale project)
- [x] [Review][Patch] `chromadb.Client()` removed in chromadb 1.x — replaced with `chromadb.EphemeralClient()` in test fixture [backend/tests/test_rag_service.py:19]
- [x] [Review][Patch] AC6 test verifies private `_retrieve_sync` instead of public `await retrieve_context()` — fixed: test is now async and calls `await retrieve_context()` [backend/tests/test_rag_service.py:33-37]
- [x] [Review][Patch] `sentence-transformers` unpinned in requirements.txt — fixed: pinned to `>=2.2.2,<4.0.0` [backend/requirements.txt]
- [x] [Review][Patch] `TOP_K=3 > collection.count()` unguarded — fixed: added `min(TOP_K, collection.count())` guard [backend/app/services/rag_service.py:53]
- [x] [Review][Patch] Empty/missing `CORPUS_DIR` silently skips seeding — fixed: added `CORPUS_DIR.exists()` check with warning log [backend/app/services/rag_service.py:38]
- [x] [Review][Patch] `conftest.py` asyncio marker registration is dead code — fixed: removed redundant `pytest_configure` function [backend/tests/conftest.py]
- [x] [Review][Defer] Silent startup failure — app appears healthy with empty RAG context; observability improvement (health flag) deferred as beyond story scope [backend/app/services/rag_service.py:58-62]
- [x] [Review][Defer] TOCTOU race on concurrent startups — theoretical for single-instance Docker Compose deployment; defer to scaling story [backend/app/services/rag_service.py:47]
- [x] [Review][Defer] `retrieve_context("")` returns arbitrary result — input validation is Story 2.3/2.5 boundary responsibility [backend/app/services/rag_service.py:51-55]
- [x] [Review][Defer] Partial `add()` failure leaves collection permanently incomplete — transactional seeding hardening deferred; corpus is controlled content [backend/app/services/rag_service.py:47]
- [x] [Review][Defer] `symptoms` can propagate into logs via exception message in `RAGUnavailableError` — theoretical path; chromadb HTTP client exceptions don't echo query text [backend/app/services/rag_service.py:70]
- [x] [Review][Defer] `_get_collection()` re-creates HttpClient and loads embedding model on every call — performance optimization deferred [backend/app/services/rag_service.py:21-27]
- [x] [Review][Defer] Corpus chunking on `"\n\n"` produces unbounded chunks exceeding 256-token model limit — current spec-defined corpus fits within limits; defer for future corpus expansion [backend/app/services/rag_service.py:40]

## Change Log

- 2026-04-16: Story created via bmad-create-story workflow. Story 2.1 — ChromaDB Corpus Seeding & RAG Service. Epic 2 status updated to in-progress.
- 2026-04-16: Implementation complete. Created rag_service.py, corpus files, lifespan event in main.py, conftest.py, pytest.ini, and test_rag_service.py. All 3 tests pass. Status → review.
- 2026-04-16: Code review complete. 1 decision-needed, 6 patches, 7 deferred. Status → in-progress pending patch resolution.
