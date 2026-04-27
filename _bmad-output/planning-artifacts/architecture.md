---
stepsCompleted: [step-01-init, step-02-context, step-03-starter, step-04-decisions, step-05-patterns, step-06-structure]
lastStep: 6
status: 'complete'
completedAt: '2026-04-27'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md']
workflowType: 'architecture'
project_name: 'MedW'
user_name: 'Yoko'
date: '2026-04-16'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
23 FRs across 6 categories:
- Symptom Triage (FR1–FR6): Greek free-text input → Mistral + RAG → MTS level + specialty + doctor + reasoning
- Patient Results & Routing (FR7–FR9): Single results screen with fallback doctor matching
- Nurse Dashboard (FR10–FR12): Live real-time queue, push updates, no page refresh
- AI & Knowledge Pipeline (FR13–FR15): Mistral-7B via Ollama, ChromaDB RAG, graceful fallback to base LLM
- Doctor Dataset (FR16–FR17): Static JSON fixture, specialty + availability filtering
- System & Operations (FR18–FR23): Docker Compose, health check, data isolation, documentation

**Non-Functional Requirements:**
13 NFRs across 4 categories:
- Performance: < 10s triage response (pre-warmed), < 2s dashboard update, < 3s frontend load, Ollama pre-warmed before first request
- Security & Privacy: Zero external data transmission, no persistence beyond active session, port minimisation, no secrets in public repo
- Accessibility: Greek UI throughout, WCAG 2.1 AA best-effort, medical disclaimer visually prominent on every result
- Reliability: Full demo run must complete without failure; validated by pre-demo rehearsal on target hardware

**Scale & Complexity:**
- Primary domain: Full-stack web app + on-premise AI/ML inference
- Complexity level: High
- Estimated architectural components: 9

### Technical Constraints & Dependencies

- **On-premise only** (GDPR Article 9): Mistral-7B via Ollama, ChromaDB local; zero external inference calls
- **No fine-tuning**: Prompt engineering + RAG only; model capabilities fixed at Mistral-7B
- **GPU infrastructure**: NVIDIA B200; Ollama must leverage GPU; container startup sequence must ensure model load before accepting traffic
- **Greek language risk**: Mistral-7B multilingual capacity for Greek medical terminology is an open risk; validation must occur in sprint 1
- **Static doctor dataset**: Static JSON fixture at startup; no live API for MVP
- **No authentication**: Demo environment; open access only

### Cross-Cutting Concerns Identified

1. **Data isolation** — patient input must never leave the deployment environment, including logs; enforced at network layer in Docker Compose
2. **Graceful degradation** — every pipeline stage (RAG, doctor matching, specialty fallback) must return a valid result; no blank screens or unhandled errors
3. **Greek language enforcement** — UI labels, disclaimer, and LLM output must be in Greek throughout
4. **Medical disclaimer** — must appear prominently above the fold on every result screen; ownership by Stella (medical expert)
5. **Real-time event propagation** — triage submissions must reach the nurse dashboard within 2s; event bus / SSE architecture must be consistent across the stack
6. **GPU resource management** — Ollama pre-warming, container startup ordering, and GPU availability must be managed at deployment level
7. **API contract fidelity** — the PRD defines precise request/response schemas; implementation must not deviate from these contracts

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web app + on-premise AI/ML inference. Stack pre-decided in PRD.

### Starter Options Considered

- **Official `create-next-app`** — Next.js 15, TypeScript, Tailwind, App Router, Turbopack. No third-party boilerplate needed.
- **Full Stack FastAPI Template (tiangolo)** — rejected: includes SQLAlchemy, Alembic, JWT auth — unnecessary overhead for this project's constraints.
- **Custom FastAPI scaffold** — selected: minimal router/service/schema structure matched to MEDΩ's actual needs (in-memory queue, ChromaDB, no persistent DB, no auth).

### Selected Approach: Monorepo with create-next-app + Custom FastAPI

**Rationale:** Stack is pre-decided in PRD. Heavy templates introduce unnecessary dependencies. The monorepo layout keeps Docker Compose orchestration simple.

**Frontend Initialization Command:**

```bash
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

**Monorepo Structure:**

```
/
├── frontend/          ← Next.js 15 (create-next-app)
├── backend/           ← FastAPI (custom scaffold)
│   ├── app/
│   │   ├── routers/   ← triage.py, doctors.py, health.py
│   │   ├── services/  ← triage_service.py, rag_service.py, doctor_service.py
│   │   ├── schemas/   ← triage.py (Pydantic models)
│   │   └── core/      ← config.py, events.py (SSE)
│   ├── data/          ← doctors.json fixture, ChromaDB corpus
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```

**Architectural Decisions Established:**

- **Language & Runtime:** TypeScript (frontend, Node.js 20.9+), Python 3.11+ (backend)
- **Styling:** Tailwind CSS v4 (bundled with Next.js 15 default)
- **Routing:** Next.js App Router; two routes: `/` (patient), `/dashboard` (nurse)
- **Build Tooling:** Turbopack (dev), Next.js production build
- **Linting:** ESLint with Next.js built-in config
- **Backend Pattern:** Router/Service/Schema, no ORM, no migrations
- **Package Management:** npm (frontend), pip + requirements.txt (backend)

**Note:** Project initialization (monorepo scaffold + create-next-app + FastAPI structure) should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Real-time mechanism: SSE via FastAPI StreamingResponse
- Vector DB Selection: Milvus (cuVS accelerated)
- LLM and Embedding Selection: NVIDIA NIMs (Nemotron Super 49B and Nemotron embeddings, or Llama 3.1 8B fallback)
- Ingestion Pipeline: NeMo Retriever OCR & Parsing NIMs
- Deployment Strategy: Docker-in-Docker (DinD) Run:ai payload

**Important Decisions (Shape Architecture):**
- Frontend state: React hooks only, no external state library
- Greek UI: hardcoded strings, no i18n library
- API docs: FastAPI auto-generated OpenAPI at /docs
- Logging: symptom text excluded from all log output

**Deferred Decisions (Post-MVP):**
- CORS lock-down to specific origins
- Persistent triage database
- Authentication / access control
- Real finddoctors.gov.gr API integration

### Data Architecture

- **Triage queue:** In-process Python list protected by `asyncio.Lock`. Populated on POST /api/v1/triage; read by SSE stream. No persistence.
- **Vector Database:** Milvus accelerated with NVIDIA cuVS. Persistent volume mounted.
- **Doctor fixture:** `data/doctors.json` loaded into memory dict at FastAPI startup, keyed by specialty. Filtered in-process.

### Authentication & Security

- **Auth:** None. Open access — demo environment only.
- **CORS:** `allow_origins=["*"]` — explicitly scoped to demo. Post-MVP must be locked to specific origins.
- **Network isolation:** NIMs and Vector DB bound to internal network only. No host-exposed inference endpoints.
- **Secrets:** All config via environment variables; no credentials committed to repo.
- **Patient data logging:** Symptom text explicitly excluded from all log statements at code level.

### API & Communication Patterns

- **Style:** REST. API contracts defined in PRD; implementation must not deviate.
- **AI Integration:** Backend acts as a client communicating with OpenAI-compatible NVIDIA NIM APIs and the blueprint's RAG Server.
- **Real-time:** Server-Sent Events (SSE) via FastAPI `StreamingResponse` with `text/event-stream`.
- **API documentation:** FastAPI auto-generated OpenAPI/Swagger at `/docs`.
- **Error handling:** All endpoints return structured JSON errors. AI pipeline failures fall back gracefully.

### Frontend Architecture

- **State management:** React built-in hooks only (`useState`, `useEffect`, `useRef`). No external libraries.
- **Real-time client:** Native `EventSource` API.
- **Greek UI:** Hardcoded Greek strings in components.
- **Component structure:** Page-level components with co-located sub-components.
- **API calls:** Native `fetch`.

### Infrastructure & Deployment

- **Deployment Mechanism:** Docker-in-Docker encapsulated in a Run:ai workload. Eliminates the need for NIM Operator installation on the host cluster.
- **NVIDIA Services:** Llama 3.3 Nemotron Super 49B NIM, Nemotron embedding NIM, NeMo Retriever OCR & Parse NIMs.
- **Hardware:** 2x B200 (or downscaled Llama-3.1-8B-Instruct if limited to 1x B200).
- **CI/CD:** GitHub Actions workflow to build the DinD image and submit the Run:ai workload.

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo scaffold + Next.js frontend base
2. Adapt Docker-in-Docker GitHub Action workflow for NVIDIA RAG Blueprint
3. Scaffold Milvus and NIM services in the DinD initialization script (`rag_runner_entrypoint.sh`)
4. Rewrite FastAPI base to integrate with Blueprint RAG server endpoints
5. Ingest `data/corpus` using NeMo Retriever
6. Implement Mistral/Nemotron inference logic in triage endpoint
7. Next.js patient form + results screen + dashboard
8. Run:ai deployment testing

**Cross-Component Dependencies:**
- DinD orchestrator must start NIMs and Milvus before FastAPI backend accepts traffic
- RAG pipeline depends on NeMo Retriever ingestion being successful

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 10 areas where AI agents could make different choices

### Naming Patterns

**Python (backend) — snake_case everywhere:**
- Files: `triage_service.py`, `rag_service.py`, `doctor_service.py`, `nim_client.py`
- Functions: `classify_symptoms()`, `get_doctor_match()`, `query_rag_server()`
- Variables: `mts_level`, `patient_id`, `triage_queue`
- Pydantic schemas: class names PascalCase (`TriageRequest`, `TriageResponse`), field names snake_case
- NVIDIA service URL env vars: `RAG_SERVER_URL`, `NIM_BASE_URL`, `MILVUS_HOST`

**TypeScript (frontend) — conventions by context:**
- Component files: PascalCase (`TriageForm.tsx`, `ResultCard.tsx`)
- Non-component files: camelCase (`apiClient.ts`, `useTriageStream.ts`)
- Variables/functions: camelCase (`mtsLevel`, `patientId`, `handleSubmit`)
- React components: PascalCase (`TriageForm`, `NurseDashboard`)

**API JSON fields — snake_case throughout** (matches PRD contract and Python convention):
```json
{ "mts_level": 2, "mts_label": "Urgent", "patient_id": "...", "redirect_url": "..." }
```
Frontend maps snake_case API responses to camelCase only at the API client boundary — not scattered through components.

**API endpoints — plural nouns, as per PRD contract:**
- `/api/v1/triage` — POST symptom submission
- `/api/v1/doctors` — GET doctor list
- `/api/v1/triage/queue` — GET SSE stream
- `/api/v1/health` — GET readiness check

### Structure Patterns

**Backend (`/backend/app/`):**
- `routers/` — FastAPI route definitions only; no business logic
- `services/` — all business logic, RAG orchestration, doctor matching
- `schemas/` — Pydantic request/response models only
- `core/` — config (env vars), SSE event management
- `clients/` — `nim_client.py` (httpx async client for NIM/RAG Server calls)
- `data/` — `doctors.json` fixture

**Frontend (`/frontend/app/`):**
- `page.tsx` — patient triage route (`/`)
- `dashboard/page.tsx` — nurse dashboard route (`/dashboard`)
- `components/` — sub-components co-located with their page
- `lib/` — API client (`api.ts`), shared types (`types.ts`)

**Deployment (`/`):**
- `Dockerfile.rag-runner` — DinD runner image for Run:ai
- `rag_runner_entrypoint.sh` — runtime orchestration of all NVIDIA blueprint services
- `.github/workflows/deploy-rag-blueprint.yml` — CI/CD workflow

**Tests:**
- Backend: `backend/tests/` — pytest, unit tests for services only (mock httpx calls to NIMs)
- Frontend: none for MVP (time constraint)

### Format Patterns

**API responses — direct, no envelope wrapper:**
```json
{ "mts_level": 2, "mts_label": "Urgent", "specialty": "Cardiology", "doctor": {...}, "reasoning": "...", "redirect_url": "..." }
```

**Error responses — FastAPI default:**
```json
{ "detail": "Triage pipeline failure — base LLM fallback used" }
```
Patient-facing routes must **never** return HTTP 500. All AI pipeline exceptions caught in service layer; degraded-but-valid 200 returned (FR15/NFR13).

**SSE event format:**
```
event: triage_update
data: {"patient_id": "...", "mts_level": 2, "specialty": "...", "timestamp": "2026-04-16T14:32:00Z"}

```
Always `event: triage_update`. Data is JSON-stringified. Two trailing newlines required. Backend sends `: ping\n\n` comment every 15s to keep connection alive.

**Date/time — ISO 8601 strings everywhere:**
```json
"timestamp": "2026-04-16T14:32:00Z"
```

### Communication Patterns

**SSE (backend → frontend dashboard):**
- Single event type: `triage_update`
- Payload: full triage summary (`patient_id`, `mts_level`, `specialty`, `timestamp`)
- Frontend `EventSource` handles reconnect natively — no custom retry logic

**NIM/RAG Server communication — `httpx.AsyncClient` only:**
```python
# nim_client.py — the ONLY place that calls NVIDIA services
async with httpx.AsyncClient(base_url=settings.RAG_SERVER_URL, timeout=30.0) as client:
    response = await client.post("/v1/generate", json={"query": query})
    response.raise_for_status()
```
All NIM/RAG calls go through `backend/app/clients/nim_client.py`. No direct HTTP calls from `services/`.

**Greek UTF-8 encoding — always disable ASCII escaping:**
```python
# In all JSON serialization of Greek text:
json.dumps(payload, ensure_ascii=False)  # ✓
json.dumps(payload)                       # ✗ — garbles Greek characters
```

**Loading states (frontend) — local, not global:**
```typescript
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

**Imports (frontend) — absolute with `@/` prefix only:**
```typescript
import { TriageForm } from "@/components/TriageForm"  // ✓
import { TriageForm } from "../../components/TriageForm"  // ✗
```

### Process Patterns

**Error handling — never expose raw exceptions, always handle httpx errors:**
```python
try:
    result = await nim_client.query_rag_server(symptoms)
except (httpx.RequestError, httpx.HTTPStatusError) as exc:
    logger.error("NIM/RAG call failed", exc_info=True)  # stack trace, NOT symptom text
    result = fallback_response()
except Exception:
    logger.error("Triage pipeline failed", exc_info=True)
    result = fallback_response()
```

**Patient data logging — symptom text never logged at any level:**
```python
logger.info(f"Triage request received: patient_id={patient_id}")  # ✓
logger.info(f"Symptoms: {symptoms}")  # ✗ NEVER
```

**Fallback chain for triage (FR15/NFR13):**
1. RAG Server (NeMo Retriever + Nemotron NIM) → full response
2. RAG Server timeout/error → httpx fallback → MTS Level 3 (Urgent) safe default + generic specialty + disclaimer
3. Any NIM failure → same safe default — never propagate 500 to the patient route

**Greek text — hardcoded in JSX for MVP:**
No i18n translation keys or constants files for labels.

### Enforcement Guidelines

**All AI Agents MUST:**
- Never log patient symptom text at any log level
- Never return HTTP 500 from `/api/v1/triage` — catch all exceptions and degrade gracefully
- Use snake_case for all API JSON fields (match PRD contract exactly)
- Use `@/` imports in all frontend TypeScript files
- Put business logic in `services/`, not in `routers/`
- Put all NVIDIA NIM/RAG HTTP calls in `clients/nim_client.py`, not in `services/`
- Protect triage queue reads/writes with `asyncio.Lock`
- Use `json.dumps(..., ensure_ascii=False)` for all Greek text serialization

**Anti-Patterns (explicitly forbidden):**
- ✗ Wrapping API responses in `{ data: ..., success: ... }` envelopes
- ✗ Logging the `symptoms` field at any log level
- ✗ Relative imports in frontend TypeScript files
- ✗ Business logic inside FastAPI route handlers
- ✗ Direct `httpx` calls to NIMs from `services/` — must go through `clients/nim_client.py`
- ✗ Using `json.dumps()` without `ensure_ascii=False` for Greek text payloads
- ✗ Global loading state management
- ✗ Custom SSE reconnect logic (browser handles natively)

## Project Structure & Boundaries

### Complete Project Directory Structure

```
medw/
├── README.md
├── LICENSE                               ← Apache 2.0
├── .env.example                          ← NIM_API_KEY, RAG_SERVER_URL, MILVUS_HOST, etc.
├── .gitignore
├── docker-compose.yml                    ← local dev: frontend + backend only
├── Dockerfile.rag-runner                 ← DinD image for Run:ai workload
├── rag_runner_entrypoint.sh              ← starts dockerd → NVIDIA blueprint → NIMs + Milvus
│
├── .github/
│   └── workflows/
│       ├── deploy.yml                    ← builds frontend/backend images
│       └── deploy-rag-blueprint.yml      ← builds DinD image + submits Run:ai workload
│
├── backend/
│   ├── requirements.txt                  ← fastapi, httpx, pydantic, uvicorn
│   ├── Dockerfile
│   ├── main.py                           ← FastAPI init, CORS, router registration
│   └── app/
│       ├── routers/
│       │   ├── triage.py                 ← POST /api/v1/triage + GET /api/v1/triage/queue
│       │   ├── doctors.py                ← GET /api/v1/doctors
│       │   └── health.py                 ← GET /api/v1/health
│       ├── services/
│       │   ├── triage_service.py         ← orchestrates nim_client + doctor_service; writes queue
│       │   └── doctor_service.py         ← fixture loading, specialty filter, fallback match
│       ├── clients/
│       │   └── nim_client.py             ← httpx.AsyncClient for RAG Server + NIM APIs
│       ├── schemas/
│       │   ├── triage.py                 ← TriageRequest, TriageResponse, QueueEntry
│       │   └── doctor.py                 ← Doctor model
│       ├── core/
│       │   ├── config.py                 ← env vars (RAG_SERVER_URL, NIM_BASE_URL, MILVUS_HOST)
│       │   └── queue.py                  ← asyncio.Lock + in-memory list + SSE formatter
│       └── data/
│           ├── doctors.json              ← mocked doctor fixture
│           └── corpus/                   ← MTS docs; ingested via NeMo Retriever at DinD startup
│               ├── mts_guidelines.md
│               └── specialty_reference.md
│   └── tests/
│       ├── conftest.py
│       ├── test_triage_service.py        ← mock nim_client, assert fallback chain
│       └── test_doctor_service.py
│
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── Dockerfile
    └── app/
        ├── globals.css
        ├── layout.tsx                    ← root layout, lang="el", meta
        ├── page.tsx                      ← / patient route
        ├── components/
        │   ├── TriageForm.tsx
        │   ├── TriageResult.tsx
        │   ├── DoctorCard.tsx
        │   └── Disclaimer.tsx
        ├── dashboard/
        │   ├── page.tsx                  ← /dashboard nurse route
        │   └── components/
        │       ├── TriageQueue.tsx
        │       └── TriageQueueItem.tsx
        └── lib/
            ├── api.ts
            ├── useTriageStream.ts
            └── types.ts
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Entry point | Consumers |
|---|---|---|
| Patient triage | `POST /api/v1/triage` | Frontend `page.tsx` via `api.ts` |
| Nurse stream | `GET /api/v1/triage/queue` (SSE) | Frontend `useTriageStream.ts` |
| Doctor list | `GET /api/v1/doctors` | Frontend `api.ts` |
| Health check | `GET /api/v1/health` | Run:ai readiness probe |
| RAG Server | `http://rag-server:8081` | `nim_client.py` only — internal |
| NIM APIs | `http://nim:8000` | `nim_client.py` only — internal |
| Milvus | `milvus:19530` | NVIDIA blueprint internally — not accessed by FastAPI |

**Service Boundaries:**

`triage_service.py` is the single orchestration point. All NVIDIA calls are proxied through `nim_client.py`.

```
triage.py (router)
  └── triage_service.py
        ├── nim_client.py       → NVIDIA RAG Server (NeMo Retriever + Nemotron NIM)
        └── doctor_service.py   → doctors.json (in-memory)
              └── core/queue.py → in-memory triage list
```

**Data Boundaries:**

- Patient symptom text: enters at `POST /api/v1/triage`, proxied to RAG Server, stored only as queue summary. Never logged.
- Triage queue: owned by `core/queue.py`. Read via SSE. Resets on container restart.
- Doctor data: loaded once at startup in `doctor_service.py`. Read-only.
- MTS corpus: ingested into Milvus by `rag_runner_entrypoint.sh` at DinD startup via NeMo Retriever. FastAPI does not seed it.

**DinD Startup Sequence:**
```
rag_runner_entrypoint.sh
  → dockerd (with nvidia runtime)
  → docker compose up: milvus → nemo-retriever-ocr → nemo-retriever-embed
                       → nemo-retriever-rerank → nemotron-nim (LLM)
                       → rag-server → ingestor (loads corpus/) → backend → frontend
```

### Requirements to Structure Mapping

| FR | File(s) |
|---|---|
| FR1 — Greek input | `TriageForm.tsx`, `page.tsx`, `schemas/triage.py` |
| FR2 — MTS classification | `triage_service.py`, `nim_client.py` (Nemotron NIM) |
| FR3 — Specialty recommendation | `triage_service.py` |
| FR4 — Doctor matching | `doctor_service.py`, `DoctorCard.tsx` |
| FR5 — Reasoning text | `nim_client.py` (RAG Server response), `TriageResult.tsx` |
| FR6 — Medical disclaimer | `Disclaimer.tsx` (rendered in `TriageResult.tsx`) |
| FR7 — Results screen | `TriageResult.tsx`, `page.tsx` |
| FR8 — Simulated redirect | `DoctorCard.tsx` → `redirect_url` from response |
| FR9 — Fallback doctor | `doctor_service.py` fallback branch |
| FR10–12 — Nurse dashboard | `dashboard/page.tsx`, `TriageQueue.tsx`, `useTriageStream.ts`, `core/queue.py` |
| FR13 — Greek LLM | `nim_client.py` (Nemotron NIM, Greek-capable) |
| FR14 — RAG augmentation | `nim_client.py` → RAG Server, `data/corpus/` (ingested by DinD) |
| FR15 — RAG fallback | `triage_service.py` (httpx error handling → safe default) |
| FR16–17 — Doctor dataset | `doctor_service.py`, `data/doctors.json`, `routers/doctors.py` |
| FR18 — Deployment | `Dockerfile.rag-runner`, `rag_runner_entrypoint.sh`, `deploy-rag-blueprint.yml` |
| FR19 — Health check | `routers/health.py` |
| FR20 — Data isolation | DinD internal Docker network, `core/config.py` |
| FR21 — NIM pre-warm | `rag_runner_entrypoint.sh` (healthcheck before backend starts) |
| FR22 — Proposal doc | `docs/proposal.md` |
| FR23 — Public repo | `README.md`, `LICENSE` |

### Integration Points

**Data Flow — Patient Triage Request:**

```
Browser → POST /api/v1/triage
  → routers/triage.py
  → triage_service.py
      → nim_client.py → RAG Server (NeMo Retriever + Nemotron NIM inference)
      → doctor_service.py → doctors.json (specialty match)
      → core/queue.py     (append summary entry)
  ← TriageResponse JSON
← page.tsx renders TriageResult.tsx + Disclaimer.tsx

Simultaneously:
  core/queue.py → SSE stream (triage/queue)
    → useTriageStream.ts (EventSource)
    → TriageQueue.tsx re-renders with new entry
```

## Architecture Validation Results

### Coherence Validation ✅

All technology choices are compatible. The NVIDIA RAG Blueprint provides a production-ready, GPU-accelerated RAG microservice stack. The FastAPI backend acts as a thin orchestration client via `nim_client.py`, keeping the service boundary clean. SSE + asyncio.Lock + in-memory queue remains coherent for real-time dashboard updates.

### Requirements Coverage ✅

All 23 FRs and 13 NFRs are architecturally supported with the updated NVIDIA blueprint components. Full mapping documented in Requirements to Structure Mapping section above.

### Gap Analysis & Resolutions

**Gap 1 — NIM startup ordering (resolved):**
`rag_runner_entrypoint.sh` waits for each NVIDIA service to pass its healthcheck before starting the next. FastAPI backend only starts after `rag-server` responds on port 8081.

**Gap 2 — MTS corpus ingestion (resolved):**
The `ingestor` service in the DinD compose stack ingests `data/corpus/` via NeMo Retriever at startup. This is decoupled from FastAPI — no lifespan event required in `main.py`.

**Gap 3 — Greek language quality (documented):**
Nemotron Super 49B is multilingual and significantly stronger than Mistral-7B for Greek medical terminology. Sprint 1 must still validate MTS classification accuracy ≥ 80% on Greek input. Fallback remains: safe Level 3 default via `triage_service.py`.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (High)
- [x] Technical constraints identified (GDPR, on-premise, no fine-tuning)
- [x] Cross-cutting concerns mapped (8 identified)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified (Next.js 16, FastAPI, httpx, Nemotron NIMs, Milvus, DinD)
- [x] Integration patterns defined (SSE, asyncio.Lock, httpx.AsyncClient for NIMs)
- [x] Performance considerations addressed (DinD startup order, GPU allocation, NIM healthchecks)
- [x] Security/compliance addressed (DinD internal network, logging rules, data isolation)

**✅ Implementation Patterns**
- [x] Naming conventions established (snake_case / camelCase / API snake_case)
- [x] Structure patterns defined (Router/Service/Schema)
- [x] Communication patterns specified (SSE event format, error format)
- [x] Process patterns documented (fallback chain, logging prohibitions)
- [x] Anti-patterns explicitly listed

**✅ Project Structure**
- [x] Complete directory structure with all files defined
- [x] Component boundaries established
- [x] Integration points and data flow mapped
- [x] All 23 FRs mapped to specific files

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- NVIDIA RAG Blueprint provides production-grade retrieval (hybrid dense+sparse, reranking, cuVS-accelerated Milvus)
- FastAPI remains a thin, testable orchestration layer — `nim_client.py` is the single NVIDIA integration point
- Fallback chain covers all NIM failure modes — no blank screens possible
- DinD encapsulation removes NIM Operator dependency from the cluster
- SSE over WebSocket — eliminates client library dependency and reduces complexity
- Nemotron Super 49B is natively multilingual — reduces Greek language risk vs Mistral-7B

**Areas for Future Enhancement (Post-MVP):**
- CORS locked to specific origin
- Persistent triage database with proper schema
- Authentication and role-based access (nurse vs patient)
- Live finddoctors.gov.gr API integration
- Structured logging with audit trail for nurse actions
- Enable optional VLM (image captioning) for chart/image understanding in MTS documents

### Implementation Handoff

**First Implementation Story — Monorepo scaffold:**

```bash
# Root
git init && touch .env.example .gitignore README.md LICENSE

# Frontend
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"

# Backend
mkdir -p backend/app/{routers,services,clients,schemas,core} backend/data/corpus backend/tests
touch backend/main.py backend/requirements.txt backend/Dockerfile

# NVIDIA Blueprint deployment
touch Dockerfile.rag-runner rag_runner_entrypoint.sh
mkdir -p .github/workflows && touch .github/workflows/deploy-rag-blueprint.yml
```

**AI Agent Prime Directive:** This architecture document is the single source of truth for the NVIDIA RAG Blueprint integration. All implementation decisions not covered here default to the patterns section. The `clients/nim_client.py` is the **only** file that may call NVIDIA NIM or RAG Server endpoints. When in doubt: route through `nim_client.py`, handle errors with `httpx`, degrade gracefully.
