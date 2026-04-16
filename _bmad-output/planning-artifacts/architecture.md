---
stepsCompleted: [step-01-init, step-02-context, step-03-starter, step-04-decisions, step-05-patterns, step-06-structure, step-07-validation, step-08-complete]
lastStep: 8
status: 'complete'
completedAt: '2026-04-16'
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
- Symptom Triage (FR1–FR6): Greek free-text input → BioMistral + RAG → MTS level + specialty + doctor + reasoning
- Patient Results & Routing (FR7–FR9): Single results screen with fallback doctor matching
- Nurse Dashboard (FR10–FR12): Live real-time queue, push updates, no page refresh
- AI & Knowledge Pipeline (FR13–FR15): BioMistral-7B via Ollama, ChromaDB RAG, graceful fallback to base LLM
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

- **On-premise only** (GDPR Article 9): BioMistral-7B via Ollama, ChromaDB local; zero external inference calls
- **No fine-tuning**: Prompt engineering + RAG only; model capabilities fixed at BioMistral-7B
- **GPU infrastructure**: NVIDIA B200; Ollama must leverage GPU; container startup sequence must ensure model load before accepting traffic
- **Greek language risk**: BioMistral-7B multilingual capacity for Greek medical terminology is an open risk; validation must occur in sprint 1
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
- In-memory queue: asyncio-safe Python list with Lock
- ChromaDB embedding: all-MiniLM-L6-v2 (default, built-in)
- Docker startup ordering: healthcheck-gated ollama → backend → frontend

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

- **Triage queue:** In-process Python list protected by `asyncio.Lock`. Populated on POST /api/v1/triage; read by SSE stream. No persistence — queue resets on container restart (per NFR6).
- **ChromaDB** (v1.5.7): Single collection `clinical_context`. Embedding: `all-MiniLM-L6-v2` (default built-in). Persistent volume mounted at `/chroma/data` in Docker.
- **Doctor fixture:** `data/doctors.json` loaded into memory dict at FastAPI startup, keyed by specialty. Filtered in-process.

### Authentication & Security

- **Auth:** None. Open access — demo environment only.
- **CORS:** `allow_origins=["*"]` — explicitly scoped to demo. Post-MVP must be locked to specific origins.
- **Network isolation:** Ollama (:11434) and ChromaDB (:8001) bound to Docker internal network only. No host-exposed inference endpoints.
- **Secrets:** All config via environment variables; no credentials committed to repo (per NFR8).
- **Patient data logging:** Symptom text explicitly excluded from all log statements at code level.

### API & Communication Patterns

- **Style:** REST. API contracts defined in PRD; implementation must not deviate.
- **Real-time:** Server-Sent Events (SSE) via FastAPI `StreamingResponse` with `text/event-stream`. Client uses native browser `EventSource`. Chosen over WebSocket: dashboard is read-only (server→client only); SSE is simpler, HTTP-native, zero client library needed.
- **API documentation:** FastAPI auto-generated OpenAPI/Swagger at `/docs` — zero additional tooling.
- **Error handling:** All endpoints return structured JSON errors `{ "detail": "..." }`. AI pipeline failures fall back gracefully (FR15/NFR13) — never return 500 to patient-facing routes.
- **CORS:** FastAPI `CORSMiddleware` with `allow_origins=["*"]` for demo.

### Frontend Architecture

- **State management:** React built-in hooks only (`useState`, `useEffect`, `useRef`). No Zustand, Redux, or Jotai — two simple routes with form + list patterns.
- **Real-time client:** Native `EventSource` API. No WebSocket client library.
- **Greek UI:** Hardcoded Greek strings in components. No i18n library for MVP.
- **Component structure:** Page-level components (`/app/page.tsx`, `/app/dashboard/page.tsx`) with co-located sub-components. No shared design system for MVP.
- **API calls:** Native `fetch` — no Axios or React Query. Two endpoints, simple request/response.

### Infrastructure & Deployment

- **LangChain:** `langchain==1.2.15`, `langchain-core==1.2.29`, `langchain-community` (Ollama), `langchain-chroma` (ChromaDB). LCEL pipeline style.
- **Docker service order:** `ollama` starts first → healthcheck confirms BioMistral model loaded → `backend` starts → `frontend` starts. Enforces NFR4.
- **GPU:** NVIDIA runtime with `deploy.resources.reservations.devices` in docker-compose.yml.
- **Ports:** frontend :3000 (host), backend :8000 (host/dev), ollama :11434 (internal), chromadb :8001 (internal).
- **CI/CD:** None for MVP — time constraint. Manual Docker Compose deploy on target hardware.
- **Monitoring:** None for MVP. FastAPI `/api/v1/health` provides readiness signal.

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo scaffold + Docker Compose skeleton
2. FastAPI base + health endpoint + SSE queue foundation
3. ChromaDB corpus loading + RAG pipeline
4. BioMistral/Ollama integration + triage endpoint
5. Doctor matching service
6. Next.js patient form + results screen
7. Next.js nurse dashboard + EventSource SSE client
8. Docker Compose integration testing on B200

**Cross-Component Dependencies:**
- SSE queue (backend) ← triage endpoint writes → EventSource client (frontend dashboard)
- RAG pipeline depends on ChromaDB corpus being seeded at startup
- Frontend API URL configured via `NEXT_PUBLIC_API_URL` env var
- Ollama healthcheck must pass before backend accepts traffic

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 8 areas where AI agents could make different choices

### Naming Patterns

**Python (backend) — snake_case everywhere:**
- Files: `triage_service.py`, `rag_service.py`, `doctor_service.py`
- Functions: `classify_symptoms()`, `get_doctor_match()`
- Variables: `mts_level`, `patient_id`, `triage_queue`
- Pydantic schemas: class names PascalCase (`TriageRequest`, `TriageResponse`), field names snake_case

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
- `services/` — all business logic, AI pipeline, doctor matching
- `schemas/` — Pydantic request/response models only
- `core/` — config (env vars), SSE event management
- `data/` — `doctors.json`, ChromaDB corpus files

**Frontend (`/frontend/app/`):**
- `page.tsx` — patient triage route (`/`)
- `dashboard/page.tsx` — nurse dashboard route (`/dashboard`)
- `components/` — sub-components co-located with their page
- `lib/` — API client (`api.ts`), shared types (`types.ts`)

**Tests:**
- Backend: `backend/tests/` — pytest, unit tests for services only
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

**Error handling — never expose raw exceptions:**
```python
try:
    result = await triage_service.classify(symptoms)
except Exception:
    logger.error("Triage pipeline failed", exc_info=True)  # log stack trace, NOT symptom text
    result = fallback_response()
```

**Patient data logging — symptom text never logged at any level:**
```python
logger.info(f"Triage request received: patient_id={patient_id}")  # ✓
logger.info(f"Symptoms: {symptoms}")  # ✗ NEVER
```

**Fallback chain for triage (FR15/NFR13):**
1. RAG + BioMistral → full response
2. RAG fails → BioMistral base knowledge only → response with `"rag_used": false`
3. BioMistral fails → MTS Level 3 (Urgent) safe default + generic specialty + disclaimer

**Greek text — hardcoded in JSX for MVP:**
No i18n translation keys or constants files for labels.

### Enforcement Guidelines

**All AI Agents MUST:**
- Never log patient symptom text at any log level
- Never return HTTP 500 from `/api/v1/triage` — catch all exceptions and degrade gracefully
- Use snake_case for all API JSON fields (match PRD contract exactly)
- Use `@/` imports in all frontend files
- Put business logic in `services/`, not in `routers/`
- Protect triage queue reads/writes with `asyncio.Lock`

**Anti-Patterns (explicitly forbidden):**
- ✗ Wrapping API responses in `{ data: ..., success: ... }` envelopes
- ✗ Logging the `symptoms` field at any log level
- ✗ Relative imports in frontend TypeScript files
- ✗ Business logic inside FastAPI route handlers
- ✗ Global loading state management
- ✗ Custom SSE reconnect logic (browser handles natively)

## Project Structure & Boundaries

### Complete Project Directory Structure

```
medw/
├── README.md
├── LICENSE                          ← Apache 2.0 (FR23)
├── docker-compose.yml               ← 4-service orchestration (FR18)
├── .env.example                     ← template, no secrets (NFR8)
├── .gitignore
├── docs/
│   └── proposal.md                  ← hackathon submission (FR22)
│
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── .env.local                   ← NEXT_PUBLIC_API_URL (gitignored)
│   ├── .env.example
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── public/
│   │   └── favicon.ico
│   └── app/
│       ├── globals.css
│       ├── layout.tsx               ← root layout, lang="el", meta
│       ├── page.tsx                 ← / patient route (FR1, FR7, FR8)
│       ├── components/
│       │   ├── TriageForm.tsx       ← Greek symptom input form (FR1)
│       │   ├── TriageResult.tsx     ← MTS + specialty + doctor + reasoning (FR7)
│       │   ├── DoctorCard.tsx       ← doctor display + redirect link (FR4, FR8)
│       │   └── Disclaimer.tsx       ← medical disclaimer, above fold (FR6, NFR11)
│       ├── dashboard/
│       │   ├── page.tsx             ← /dashboard nurse route (FR10, FR11)
│       │   └── components/
│       │       ├── TriageQueue.tsx       ← live SSE-fed list (FR10, FR12)
│       │       └── TriageQueueItem.tsx   ← single entry: ID + MTS + specialty + time (FR11)
│       └── lib/
│           ├── api.ts               ← fetch wrappers: POST /triage, GET /doctors
│           ├── useTriageStream.ts   ← EventSource hook for SSE dashboard (FR12)
│           └── types.ts             ← TriageRequest, TriageResponse, Doctor, QueueEntry
│
└── backend/
    ├── requirements.txt
    ├── Dockerfile
    ├── .dockerignore
    ├── main.py                      ← FastAPI init, CORS, router registration
    ├── app/
    │   ├── routers/
    │   │   ├── triage.py            ← POST /api/v1/triage + GET /api/v1/triage/queue SSE (FR1–12)
    │   │   ├── doctors.py           ← GET /api/v1/doctors (FR16)
    │   │   └── health.py            ← GET /api/v1/health (FR19)
    │   ├── services/
    │   │   ├── triage_service.py    ← orchestrates LLM + RAG + doctor; writes to queue (FR2–5, FR13–15)
    │   │   ├── rag_service.py       ← ChromaDB retrieval + fallback (FR14, FR15)
    │   │   ├── llm_service.py       ← Ollama/BioMistral via LangChain LCEL (FR13, FR5)
    │   │   └── doctor_service.py    ← fixture loading, specialty filter, fallback match (FR9, FR16, FR17)
    │   ├── schemas/
    │   │   ├── triage.py            ← TriageRequest, TriageResponse, QueueEntry (Pydantic)
    │   │   └── doctor.py            ← Doctor model (Pydantic)
    │   └── core/
    │       ├── config.py            ← env var loading (OLLAMA_HOST, CHROMA_HOST, CHROMA_PORT)
    │       └── queue.py             ← asyncio.Lock + in-memory list + SSE event formatter
    ├── data/
    │   ├── doctors.json             ← mocked doctor fixture (FR16, FR17)
    │   └── corpus/                  ← clinical docs for ChromaDB ingestion (FR14)
    │       ├── mts_guidelines.md
    │       └── specialty_reference.md
    └── tests/
        ├── conftest.py
        ├── test_triage_service.py
        ├── test_rag_service.py
        └── test_doctor_service.py
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Entry point | Consumers |
|---|---|---|
| Patient triage | `POST /api/v1/triage` | Frontend `page.tsx` via `api.ts` |
| Nurse stream | `GET /api/v1/triage/queue` (SSE) | Frontend `useTriageStream.ts` |
| Doctor list | `GET /api/v1/doctors` | Frontend `api.ts` |
| Health check | `GET /api/v1/health` | Docker Compose healthcheck |
| Ollama API | `http://ollama:11434` | `llm_service.py` only — internal |
| ChromaDB API | `http://chromadb:8001` | `rag_service.py` only — internal |

**Service Boundaries:**

`triage_service.py` is the single orchestration point — no other file calls `llm_service` or `rag_service` directly.

```
triage.py (router)
  └── triage_service.py
        ├── llm_service.py      → Ollama
        ├── rag_service.py      → ChromaDB
        └── doctor_service.py   → doctors.json (in-memory)
              └── core/queue.py → in-memory triage list
```

**Data Boundaries:**

- Patient symptom text: enters at `POST /api/v1/triage`, flows through services, stored only as queue entry summary (not raw symptoms). Never logged.
- Triage queue: owned by `core/queue.py`. Read via SSE. Resets on container restart (NFR6).
- Doctor data: loaded once at startup in `doctor_service.py`. Read-only.
- ChromaDB corpus: seeded at startup via FastAPI lifespan event. Read-only during runtime.

### Requirements to Structure Mapping

| FR | File(s) |
|---|---|
| FR1 — Greek input | `TriageForm.tsx`, `page.tsx`, `schemas/triage.py` |
| FR2 — MTS classification | `triage_service.py`, `llm_service.py` |
| FR3 — Specialty recommendation | `triage_service.py` |
| FR4 — Doctor matching | `doctor_service.py`, `DoctorCard.tsx` |
| FR5 — Reasoning text | `llm_service.py`, `TriageResult.tsx` |
| FR6 — Medical disclaimer | `Disclaimer.tsx` (rendered in `TriageResult.tsx`) |
| FR7 — Results screen | `TriageResult.tsx`, `page.tsx` |
| FR8 — Simulated redirect | `DoctorCard.tsx` → `redirect_url` from response |
| FR9 — Fallback doctor | `doctor_service.py` fallback branch |
| FR10–12 — Nurse dashboard | `dashboard/page.tsx`, `TriageQueue.tsx`, `useTriageStream.ts`, `core/queue.py` |
| FR13 — Greek LLM | `llm_service.py` (BioMistral via Ollama LCEL chain) |
| FR14 — RAG augmentation | `rag_service.py`, `data/corpus/` |
| FR15 — RAG fallback | `triage_service.py` (try/except around RAG call) |
| FR16–17 — Doctor dataset | `doctor_service.py`, `data/doctors.json`, `routers/doctors.py` |
| FR18 — Docker Compose | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` |
| FR19 — Health check | `routers/health.py` |
| FR20 — Data isolation | `docker-compose.yml` (internal network), `core/config.py` |
| FR21 — Ollama pre-warm | `docker-compose.yml` ollama entrypoint + healthcheck |
| FR22 — Proposal doc | `docs/proposal.md` |
| FR23 — Public repo | `README.md`, `LICENSE` |

### Integration Points

**Data Flow — Patient Triage Request:**

```
Browser → POST /api/v1/triage
  → routers/triage.py
  → triage_service.py
      → rag_service.py    → ChromaDB (context retrieval)
      → llm_service.py    → Ollama/BioMistral (inference)
      → doctor_service.py → doctors.json (specialty match)
      → core/queue.py     (append summary entry)
  ← TriageResponse JSON
← page.tsx renders TriageResult.tsx + Disclaimer.tsx

Simultaneously:
  core/queue.py → SSE stream (triage/queue)
    → useTriageStream.ts (EventSource)
    → TriageQueue.tsx re-renders with new entry
```

**Docker Compose Startup Sequence:**
```
ollama (pulls BioMistral model, healthcheck: model loaded)
  → chromadb (healthcheck: HTTP 200 on /api/v1/heartbeat)
  → backend (lifespan: load doctors.json + seed ChromaDB corpus)
  → frontend (serves Next.js, connects to backend via NEXT_PUBLIC_API_URL)
```

## Architecture Validation Results

### Coherence Validation ✅

All technology choices are version-compatible and conflict-free. Patterns align with the stack. The SSE + asyncio.Lock + in-memory queue forms a coherent, low-complexity real-time architecture appropriate for the demo scope. The Router/Service/Schema backend pattern and App Router frontend structure are mutually independent and do not create cross-boundary dependencies.

### Requirements Coverage ✅

All 23 FRs and 13 NFRs are architecturally supported. Full mapping documented in Project Structure section. No uncovered requirements identified.

### Gap Analysis & Resolutions

**Gap 1 — Ollama model pull (resolved):**
The `ollama` Docker service uses a custom entrypoint script (`docker/ollama-entrypoint.sh`) that starts the server, pulls `biomistral:7b`, then signals readiness. The docker-compose healthcheck verifies the model is present via `ollama list | grep biomistral` before the `backend` service starts.

Add to project structure:
```
docker/
└── ollama-entrypoint.sh    ← pull biomistral:7b + start server
```

**Gap 2 — ChromaDB corpus seeding (resolved):**
FastAPI `lifespan` event in `main.py` calls `rag_service.seed_corpus_if_empty()` at startup. This is idempotent — checks for existing documents before ingesting `data/corpus/` files. No manual step required.

**Gap 3 — Greek language fallback (documented):**
Sprint 1 must validate BioMistral-7B Greek medical terminology quality. If accuracy < 80%, fallback: translate symptom input to English before LLM inference, return result in Greek. This is a `llm_service.py` implementation decision to be confirmed in sprint 1.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (High)
- [x] Technical constraints identified (GDPR, on-premise, no fine-tuning)
- [x] Cross-cutting concerns mapped (8 identified)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified (Next.js 15, FastAPI, LangChain 1.2.15, ChromaDB 1.5.7)
- [x] Integration patterns defined (SSE, asyncio.Lock, LCEL)
- [x] Performance considerations addressed (pre-warm, GPU, startup order)
- [x] Security/compliance addressed (network isolation, logging rules, data isolation)

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
- Stack pre-decided in PRD — no technology discovery needed in implementation
- API contracts fully specified — backend and frontend can develop in parallel
- Fallback chain covers all failure modes — no blank screens possible
- Single orchestration point (`triage_service.py`) — no cross-service coupling confusion
- SSE over WebSocket — eliminates client library dependency and reduces complexity

**Areas for Future Enhancement (Post-MVP):**
- CORS locked to specific origin
- Persistent triage database with proper schema
- Authentication and role-based access (nurse vs patient)
- Live finddoctors.gov.gr API integration
- Structured logging with audit trail for nurse actions

### Implementation Handoff

**First Implementation Story — Monorepo scaffold:**

```bash
# Root
git init && touch docker-compose.yml .env.example .gitignore README.md LICENSE

# Frontend
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"

# Backend
mkdir -p backend/app/{routers,services,schemas,core} backend/data/corpus backend/tests
touch backend/main.py backend/requirements.txt backend/Dockerfile

# Docker support
mkdir docker && touch docker/ollama-entrypoint.sh
```

**AI Agent Prime Directive:** This architecture document is the single source of truth. All implementation decisions not covered here default to the patterns section. When in doubt: simpler is correct for MVP scope.
