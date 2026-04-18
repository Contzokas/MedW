# Architecture — Backend (FastAPI)

> Generated: 2026-04-18 | Part: `backend` | Language: Python 3.11 | Framework: FastAPI

---

## Executive Summary

The MedW backend is a Python FastAPI service that exposes a REST + SSE API for AI-powered medical triage. It implements a three-tier orchestration pipeline: RAG context retrieval (ChromaDB) → LLM classification (Mistral-7B via Ollama) → doctor matching (static dataset). Results are streamed to nurse dashboards via Server-Sent Events through an in-memory async queue. The architecture follows a clean layered pattern: routers handle HTTP, services own business logic, and core provides shared infrastructure.

---

## Technology Stack

| Category | Technology | Version |
|---|---|---|
| Language | Python | 3.11 |
| Framework | FastAPI | latest |
| ASGI Server | Uvicorn | latest (standard) |
| Data validation | Pydantic | latest |
| LLM integration | LangChain | 1.2.15 |
| LLM runtime | Ollama (Mistral-7B) | via HTTP |
| Vector store | ChromaDB | 1.5.7 |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | ≥2.2.2 |
| HTTP client | httpx | latest |
| Testing | pytest + pytest-asyncio | latest |
| Containerization | Docker (python:3.11-slim) | — |

---

## Architecture Pattern

**Clean Layered Architecture** with three distinct layers:

```
Routers (HTTP boundary)
   └─► Services (business logic)
           ├─► Core (shared infrastructure)
           └─► External services (Ollama, ChromaDB)
```

No cross-layer dependencies: routers never call core directly; services never import routers.

---

## Layer Breakdown

### Routers (`app/routers/`)

Thin HTTP handlers. Parse requests, delegate to services, return responses. No business logic.

| Router | Endpoints | Responsibility |
|---|---|---|
| `health.py` | `GET /api/v1/health` | Liveness probe |
| `doctors.py` | `GET /api/v1/doctors` | List/filter doctors |
| `triage.py` | `POST /api/v1/triage` | Submit triage |
| `triage.py` | `GET /api/v1/triage/queue` | SSE queue stream |

### Services (`app/services/`)

All business logic lives here. No FastAPI imports — pure async Python.

| Service | Responsibility |
|---|---|
| `triage_service.py` | Orchestrates the full pipeline: RAG → LLM → doctor match → queue append. Implements fail-safe fallback chain. |
| `llm_service.py` | Builds and manages the LangChain `ChatOllama` chain. Parses and validates JSON responses. Raises `LLMParseError` on malformed output. |
| `rag_service.py` | Manages ChromaDB client (lazy singleton). Seeds corpus from `data/corpus/*.md` on startup. Retrieves top-3 similar documents for a symptom query. Raises `RAGUnavailableError` on failure. |
| `doctor_service.py` | Loads `data/doctors.json` into an in-memory specialty index. Matches LLM specialty output to an available doctor. Falls back to General Practitioner if no match found. |

### Core (`app/core/`)

Shared infrastructure — no business logic.

| Module | Responsibility |
|---|---|
| `config.py` | Reads all environment variables at import time. Provides typed constants used by services. |
| `queue.py` | Thread-safe in-memory async deque (`asyncio.Lock`) with `asyncio.Event` signalling for SSE push notification. Max size bounded by `QUEUE_MAX_ENTRIES`. |

### Schemas (`app/schemas/`)

Pydantic models — single source of truth for all request/response contracts.

See [data-models-backend.md](./data-models-backend.md) for full schema documentation.

---

## Triage Pipeline — Fail-Safe Chain

```python
async def classify(symptoms, patient_id):
    try:
        context = await rag_service.retrieve_context(symptoms)   # Step 1: RAG
        result = await llm_service.classify(symptoms, context)   # Step 2: LLM (with context)
    except RAGUnavailableError:
        result = await llm_service.classify(symptoms, context="")  # Fallback: LLM base knowledge
    except Exception:
        return _SAFE_DEFAULT  # Final fallback: hardcoded safe response (MTS 3, GP referral)
    
    doctor = doctor_service.get_match(result["specialty"])       # Step 3: Doctor match
    # Build response, append to SSE queue, return
```

Three safety levels:
1. **Happy path:** RAG context + LLM inference
2. **RAG fallback:** LLM inference without context (base knowledge only)
3. **Hard fallback:** `_SAFE_DEFAULT` — MTS level 3 ("Urgent"), GP referral, Greek error note

---

## SSE Queue Architecture

```
POST /api/v1/triage
  └─► triage_service.classify()
        └─► queue.append_entry(QueueEntry)  → asyncio.Event.set()

GET /api/v1/triage/queue
  └─► _sse_queue_generator() (infinite async generator)
        ├── 1. Drain existing entries (replay on connect)
        └── 2. Loop:
              ├── wait_for_new_entry(timeout=1s)
              ├── yield new entries as SSE events
              └── yield `: ping\n\n` every 15 s of silence
```

The queue is a `collections.deque(maxlen=QUEUE_MAX_ENTRIES)` — oldest entries are evicted when full. **Limitation:** single-process only; not suitable for multi-instance horizontal scaling.

---

## Application Startup (Lifespan)

```python
@asynccontextmanager
async def lifespan(app):
    await seed_corpus_if_empty()    # ChromaDB corpus seeding
    doctor_service.load_doctors()   # Doctor dataset loading
    yield
```

Startup failures in `load_doctors()` raise `RuntimeError` and abort startup. Corpus seeding failures are logged as errors but do not abort startup (graceful degradation to RAG-unavailable mode).

---

## CORS Configuration

```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
```

**Warning:** `allow_origins=["*"]` is suitable for demo/hackathon use. Production deployments should restrict to the frontend origin.

---

## Testing Strategy

| Test file | Scope | Mocking strategy |
|---|---|---|
| `test_triage_router.py` | Router layer | `triage_service.classify` mocked with `AsyncMock` |
| `test_sse_queue.py` | SSE queue + generator | Queue reset via fixture; monkeypatching for timing tests |
| `test_triage_service.py` | Service orchestration | LLM and RAG services mocked |
| `test_rag_service.py` | RAG service | ChromaDB client mocked with dummy embedding function |
| `test_doctor_service.py` | Doctor dataset + matching | Loaded from real fixture data |

All tests use `pytest-asyncio` with `asyncio_mode = auto`.
