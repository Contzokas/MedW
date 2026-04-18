# Integration Architecture — MedW

> Generated: 2026-04-18 | Scan: Exhaustive

---

## Overview

MedW is a multi-part system with three logical parts:

1. **backend** — FastAPI REST + SSE API (`backend/`)
2. **frontend** — Next.js patient UI and nurse dashboard (`frontend/`)
3. **ai-pipeline** — Ollama (Mistral-7B) + ChromaDB RAG (Docker services)

All four Docker services communicate over two isolated Docker networks.

---

## Network Topology

```
┌─────────────────────────────────────────────────────────┐
│  medw-external network                                    │
│                                                           │
│   ┌─────────────────┐       ┌─────────────────────────┐  │
│   │    frontend      │       │        backend           │  │
│   │  Next.js :3000  │──────►│   FastAPI :8000          │  │
│   │  (host-exposed) │  HTTP │   (host-exposed)         │  │
│   └─────────────────┘  SSE  └────────────┬────────────┘  │
│                                           │               │
└───────────────────────────────────────────┼───────────────┘
                                            │
┌───────────────────────────────────────────┼───────────────┐
│  medw-internal network                    │               │
│                                           ▼               │
│   ┌─────────────────┐       ┌─────────────────────────┐  │
│   │    ollama        │       │       chromadb           │  │
│   │  Mistral-7B     │◄──────│  Vector store :8000      │  │
│   │  :11434         │       │  (NOT host-exposed)      │  │
│   │  (NOT exposed)  │       └─────────────────────────┘  │
│   └─────────────────┘                                     │
└───────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. Frontend → Backend (REST)

| Field | Value |
|---|---|
| From | `frontend/app/lib/api.ts` — `submitTriage()` |
| To | `backend` — `POST /api/v1/triage` |
| Protocol | HTTP/REST, JSON |
| Auth | None (open, demo scope) |
| Request | `{ symptoms: string, patient_id: string }` |
| Response | `TriageResponse` — see [data-models-backend.md](./data-models-backend.md) |
| Error handling | Frontend catches non-2xx and shows Greek error message |
| Config | `NEXT_PUBLIC_API_URL` env var (default: `http://localhost:8000`) |

### 2. Frontend → Backend (SSE)

| Field | Value |
|---|---|
| From | `frontend/app/lib/useTriageStream.ts` — `useTriageStream()` |
| To | `backend` — `GET /api/v1/triage/queue` |
| Protocol | Server-Sent Events (`text/event-stream`) |
| Auth | None |
| Event name | `triage_update` |
| Data | `QueueEntry` JSON — `{ patient_id, mts_level, specialty, timestamp }` |
| Keepalive | Backend emits `: ping\n\n` every 15 s of inactivity |
| Reconnect | Browser EventSource handles automatic reconnect |
| Headers sent | `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no` |

### 3. Backend → ChromaDB (RAG retrieval)

| Field | Value |
|---|---|
| From | `backend/app/services/rag_service.py` |
| To | `chromadb` service — `http://chromadb:8000` |
| Protocol | HTTP (ChromaDB Python client `chromadb.HttpClient`) |
| Collection | `clinical_context` |
| Embedding model | `all-MiniLM-L6-v2` (sentence-transformers, runs inside backend) |
| Query | Top-3 similarity results for patient symptom string |
| Startup | `seed_corpus_if_empty()` — seeds corpus from `data/corpus/*.md` on first boot |
| Failure mode | `RAGUnavailableError` → triage service falls back to LLM base knowledge |

### 4. Backend → Ollama (LLM inference)

| Field | Value |
|---|---|
| From | `backend/app/services/llm_service.py` |
| To | `ollama` service — `http://ollama:11434` |
| Protocol | HTTP (LangChain `ChatOllama`) |
| Model | `mistral:7b` (default, configurable via `OLLAMA_MODEL`) |
| Timeout | `OLLAMA_TIMEOUT` seconds (default: 30 s) |
| Prompt | System: MTS instructions; Human: clinical context + Greek symptoms |
| Response | JSON object: `{ mts_level, mts_label, specialty, reasoning }` |
| Failure mode | `LLMParseError` → triage service returns `_SAFE_DEFAULT` response |

---

## Triage Pipeline — End-to-End Data Flow

```
Patient (browser)
  │  POST /api/v1/triage  { symptoms, patient_id }
  ▼
backend/routers/triage.py — perform_triage()
  │
  ├─► rag_service.retrieve_context(symptoms)
  │       └─► chromadb.query(symptoms, top_k=3)  →  clinical context string
  │
  ├─► llm_service.classify(symptoms, context)
  │       └─► Ollama/Mistral-7B (LangChain chain)  →  { mts_level, mts_label, specialty, reasoning }
  │
  ├─► doctor_service.get_match(specialty)
  │       └─► doctors.json index  →  Doctor object
  │
  ├─► Build TriageResponse (+ redirect_url to finddoctors.gov.gr)
  │
  ├─► queue.append_entry(QueueEntry)  →  asyncio.Event.set()
  │
  └─► Return TriageResponse  →  Patient browser
                                   │
                                   │  SSE GET /api/v1/triage/queue
                                   ▼
                              Nurse browser (dashboard)
                              useTriageStream() hook
                              EventSource receives triage_update event
                              Table row added in real time
```

---

## Startup / Dependency Order

Docker Compose enforces startup ordering:

```
ollama (healthcheck: model loaded)
  └─► chromadb (depends_on: ollama healthy)
        └─► backend (depends_on: chromadb started)
              └─► frontend (depends_on: backend healthy)
```

Backend lifespan on startup:
1. `seed_corpus_if_empty()` — populates ChromaDB collection from `data/corpus/*.md`
2. `doctor_service.load_doctors()` — loads and indexes `data/doctors.json`

---

## Shared Data Contracts

Schemas are defined once in the backend (Pydantic) and mirrored as TypeScript interfaces in the frontend. They are kept manually in sync.

| Backend (Pydantic) | Frontend (TypeScript) | File |
|---|---|---|
| `TriageRequest` | `TriageRequest` | `schemas/triage.py` / `lib/types.ts` |
| `TriageResponse` | `TriageResponse` | `schemas/triage.py` / `lib/types.ts` |
| `QueueEntry` | `QueueEntry` | `schemas/triage.py` / `lib/types.ts` |
| `Doctor` | `Doctor` | `schemas/doctor.py` / `lib/types.ts` |
