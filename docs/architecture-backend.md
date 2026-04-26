# Architecture — Backend (FastAPI)

> Generated: 2026-04-26 | Part: `backend` | Language: Python 3.11 | Framework: FastAPI

---

## Executive Summary

FastAPI REST API that orchestrates AI-powered medical triage. Combines RAG (Retrieval-Augmented Generation) via ChromaDB with LLM classification via Ollama to produce Manchester Triage System (MTS) urgency levels. Features real-time nurse dashboard updates via SSE, comprehensive debug endpoints, and graceful multi-level fallback handling.

---

## Architecture Pattern

**Layered service architecture:**

```
main.py (FastAPI app + lifespan)
├── routers/     → HTTP endpoint handlers (thin layer)
├── services/    → Business logic (triage, LLM, RAG, doctors)
├── schemas/     → Pydantic request/response models
└── core/        → Infrastructure (config, queue)
```

---

## Startup Lifecycle (`lifespan`)

On application startup:
1. Load `.env` variables
2. Add CORS middleware (allow all origins)
3. Seed ChromaDB corpus if empty (idempotent)
4. Load doctor dataset from JSON
5. Warm up Ollama model (configurable retries)

---

## Triage Pipeline

```
POST /api/v1/triage
        │
        ▼
  triage_service.classify()
        │
        ├──► rag_service.retrieve_context(symptoms)
        │       └──► ChromaDB query (TOP_K=3 chunks)
        │
        ├──► llm_service.classify(symptoms, context, language)
        │       └──► Ollama (medgemma:27b) via LangChain
        │       └──► JSON extraction + MTS validation
        │
        ├──► doctor_service.get_match(specialty)
        │       └──► Filter by specialty → first available → GP fallback
        │
        └──► queue.append_entry(result)
                └──► Signals SSE waiters
```

### Fallback Chain

1. **RAG unavailable** → Proceed with LLM base knowledge only (`rag_used: false`)
2. **LLM parse error** → Safe default response (MTS 3, General Practice)
3. **Unexpected exception** → GP fallback with logged error

---

## SSE Queue (`core/queue.py`)

- In-memory `deque(maxlen=QUEUE_MAX_ENTRIES)` — default 1000
- `asyncio.Lock` for thread-safe appends
- `asyncio.Event` signals new entries to waiting SSE streams
- Generator function yields existing entries then waits for new ones
- Ping every 15 seconds to keep connections alive

---

## RAG Service

- **ChromaDB client:** Lazy singleton via HTTP (`chromadb:8000`)
- **Embedding function:** `SentenceTransformerEmbeddingFunction` (`all-MiniLM-L6-v2`)
- **Collection:** `clinical_context`
- **Seeding:** Reads `mts_guidelines.md` + `specialty_reference.md`, splits by `\n\n`
- **Retrieval:** `collection.query(query_texts, n_results=3)`

---

## LLM Service

- **Ollama integration:** LangChain `ChatOllama` via `langchain-ollama`
- **Model:** `medgemma:27b` (configurable via `OLLAMA_MODEL`)
- **Warmup:** Configurable retry loop on startup (`OLLAMA_WARMUP_ENABLED`)
- **Prompt:** System prompt with MTS guidelines + retrieved RAG context
- **Output parsing:** Regex-based JSON extraction from prose, with MTS level/specialty validation
- **Bilingual:** Greek/English language parameter affects output and specialty names

---

## Debug System (`rag_debug.py`)

11 debug endpoints gated behind `RAG_DEBUG_ENABLED=true`. Features:
- ChromaDB health assessment
- Corpus vs database comparison
- Embedding quality analysis (zero vectors, duplicates, magnitudes)
- Full pipeline tracing with per-stage timing
- In-memory circular buffer for traces (max 200)
- Aggregate statistics (success rate, error rate, latency percentiles)

---

## Testing

**Framework:** pytest + pytest-asyncio + httpx

| Test File | Coverage |
|---|---|
| `test_triage_router.py` | API contract (request/response validation) |
| `test_triage_service.py` | Orchestration + fallback chains |
| `test_rag_service.py` | RAG retrieval (in-memory ChromaDB) |
| `test_rag_debug.py` | Debug pipeline (in-memory ChromaDB) |
| `test_doctor_service.py` | Doctor matching + GP fallback |
| `test_sse_queue.py` | SSE queue signaling + streaming |
