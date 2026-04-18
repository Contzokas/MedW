# Source Tree Analysis — MedW

> Generated: 2026-04-18 | Scan: Exhaustive | Branch: dev

---

## Repository Structure

```
MedW/                                    # Project root
│
├── backend/                             # Part 1: FastAPI backend service
│   ├── main.py                          # ← Entry point: FastAPI app, CORS, lifespan, router registration
│   ├── requirements.txt                 # Python dependencies
│   ├── pytest.ini                       # pytest config (asyncio_mode=auto)
│   ├── Dockerfile                       # python:3.11-slim, uvicorn on :8000
│   ├── .dockerignore
│   │
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py                # Env-driven config: OLLAMA_HOST, CHROMA_HOST, QUEUE_MAX_ENTRIES, etc.
│   │   │   └── queue.py                 # In-memory async deque + asyncio.Event for SSE signalling
│   │   │
│   │   ├── routers/
│   │   │   ├── health.py                # GET /api/v1/health
│   │   │   ├── doctors.py               # GET /api/v1/doctors?specialty=
│   │   │   └── triage.py                # POST /api/v1/triage + GET /api/v1/triage/queue (SSE)
│   │   │
│   │   ├── schemas/
│   │   │   ├── doctor.py                # Doctor Pydantic model
│   │   │   └── triage.py                # TriageRequest, TriageResponse, QueueEntry models
│   │   │
│   │   └── services/
│   │       ├── triage_service.py        # Orchestration: RAG → LLM → doctor match → queue append
│   │       ├── llm_service.py           # LangChain + ChatOllama: MTS classification, JSON parsing
│   │       ├── rag_service.py           # ChromaDB client: corpus seeding + similarity retrieval
│   │       └── doctor_service.py        # Static doctor dataset loader + specialty matching
│   │
│   ├── data/
│   │   ├── doctors.json                 # Static fixture: 20 doctors across 15 Greek specialties
│   │   └── corpus/
│   │       ├── mts_guidelines.md        # Manchester Triage System reference (RAG source)
│   │       └── specialty_reference.md   # Greek medical specialty reference (RAG source)
│   │
│   └── tests/
│       ├── conftest.py                  # pytest asyncio setup
│       ├── test_triage_router.py        # Router-level tests (httpx AsyncClient, mocked service)
│       ├── test_sse_queue.py            # SSE queue and generator tests
│       ├── test_triage_service.py       # Triage orchestration tests
│       ├── test_rag_service.py          # RAG service tests
│       └── test_doctor_service.py       # Doctor dataset and matching tests
│
├── frontend/                            # Part 2: Next.js frontend
│   ├── next.config.ts                   # Next.js config
│   ├── tsconfig.json                    # TypeScript config
│   ├── package.json                     # Dependencies: Next.js 16.2.4, React 19.2.4, Tailwind v4
│   ├── postcss.config.mjs               # Tailwind CSS PostCSS config
│   ├── eslint.config.mjs                # ESLint config
│   ├── Dockerfile                       # node:20-alpine, npm ci, next build, next start :3000
│   ├── .dockerignore
│   ├── .env.local                       # NEXT_PUBLIC_API_URL (local dev override)
│   │
│   ├── app/                             # Next.js App Router root
│   │   ├── layout.tsx                   # Root layout: Geist fonts, Greek lang, metadata
│   │   ├── page.tsx                     # ← Patient triage page (MedΩ home): TriageForm → TriageResult
│   │   ├── globals.css                  # Tailwind base + global styles
│   │   │
│   │   ├── components/                  # Shared UI components
│   │   │   ├── TriageForm.tsx           # Symptom textarea + submit → calls POST /api/v1/triage
│   │   │   ├── TriageResult.tsx         # MTS badge + specialty + DoctorCard + reasoning
│   │   │   ├── DoctorCard.tsx           # Doctor info + finddoctors.gov.gr redirect link
│   │   │   └── Disclaimer.tsx           # Medical disclaimer (EKAB/166 emergency notice)
│   │   │
│   │   ├── dashboard/                   # Nurse dashboard route
│   │   │   ├── page.tsx                 # ← Nurse dashboard entry point
│   │   │   └── components/
│   │   │       ├── TriageQueue.tsx       # Table consuming SSE stream via useTriageStream hook
│   │   │       └── TriageQueueItem.tsx   # Table row: time, patient ID, MTS badge, specialty
│   │   │
│   │   └── lib/
│   │       ├── api.ts                   # submitTriage() → POST /api/v1/triage
│   │       ├── types.ts                 # TypeScript interfaces: Doctor, TriageRequest/Response, QueueEntry
│   │       └── useTriageStream.ts       # useTriageStream() hook: EventSource → GET /api/v1/triage/queue
│   │
│   └── public/                          # Static assets (Next.js SVG icons)
│
├── docker/
│   └── ollama-entrypoint.sh             # Pulls OLLAMA_MODEL on first run, then serves
│
├── docker-compose.yml                   # 4-service stack: ollama, chromadb, backend, frontend
├── .env.example                         # Environment variable template
│
├── docs/                                # ← Project documentation (this directory)
│   ├── index.md                         # Master navigation index
│   ├── project-overview.md
│   ├── source-tree-analysis.md          # (this file)
│   ├── architecture-backend.md
│   ├── architecture-frontend.md
│   ├── architecture-ai-pipeline.md
│   ├── api-contracts-backend.md
│   ├── data-models-backend.md
│   ├── component-inventory-frontend.md
│   ├── development-guide.md
│   ├── deployment-guide.md
│   └── integration-architecture.md
│
└── _bmad-output/                        # BMAD planning and sprint artifacts
    ├── planning-artifacts/              # PRD, architecture design, epics
    └── implementation-artifacts/        # Per-story implementation guides and retros
```

---

## Critical Directories

| Directory | Purpose |
|---|---|
| `backend/app/routers/` | HTTP endpoint handlers — thin layer, delegates to services |
| `backend/app/services/` | All business logic: triage orchestration, LLM, RAG, doctor matching |
| `backend/app/core/` | Shared infrastructure: config and the in-memory SSE queue |
| `backend/app/schemas/` | Pydantic models — single source of truth for request/response shapes |
| `backend/data/corpus/` | RAG knowledge base: MTS guidelines + Greek specialty reference |
| `frontend/app/components/` | Patient-facing UI: triage form + results display |
| `frontend/app/dashboard/` | Nurse-facing UI: real-time triage queue |
| `frontend/app/lib/` | API client, shared TypeScript types, SSE hook |

## Entry Points

| Part | Entry Point | Binds to |
|---|---|---|
| Backend | `backend/main.py` | `0.0.0.0:8000` (uvicorn) |
| Frontend | `frontend/app/page.tsx` | `/` — patient triage page |
| Frontend | `frontend/app/dashboard/page.tsx` | `/dashboard` — nurse dashboard |

## Integration Points (Cross-Part)

| From | To | Protocol | Detail |
|---|---|---|---|
| Frontend `lib/api.ts` | Backend `POST /api/v1/triage` | REST/JSON | Symptom submission |
| Frontend `lib/useTriageStream.ts` | Backend `GET /api/v1/triage/queue` | SSE | Real-time queue stream |
| Backend `rag_service.py` | ChromaDB `:8000` | HTTP | Vector similarity search |
| Backend `llm_service.py` | Ollama `:11434` | HTTP (LangChain) | LLM inference |
