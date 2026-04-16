---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
---

# MedW - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for MedW (MEDΩ), decomposing the requirements from the PRD and Architecture document into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Patient can submit a free-text symptom description in Greek
FR2: System can classify submitted symptoms into an MTS urgency level (1–5)
FR3: System can recommend a medical specialty based on symptom classification
FR4: System can match a specific doctor from the mocked dataset to the patient's symptom profile and recommended specialty
FR5: System can generate a human-readable reasoning explanation for every triage result
FR6: System can display a medical disclaimer on every result screen identifying itself as a triage aid, not a clinical diagnosis
FR7: Patient can view MTS level, specialty, recommended doctor, and reasoning in a single result screen
FR8: Patient can follow a simulated redirect to finddoctors.gov.gr scoped to their recommended specialty and doctor
FR9: System can present an alternative doctor recommendation when no exact specialty match exists in the dataset
FR10: Nurse can view a live queue of all triage submissions in real time
FR11: Nurse can see per-submission details: patient ID, MTS level, recommended specialty, timestamp
FR12: System pushes new triage entries to the dashboard without requiring page refresh
FR13: System can process Greek-language symptom text through BioMistral-7B for MTS classification
FR14: System can augment LLM inference with clinical context retrieved from a local ChromaDB knowledge base
FR15: System returns a triage result using base LLM knowledge when RAG retrieval returns low-confidence results
FR16: System can serve a mocked doctor list filterable by specialty
FR17: System can match a doctor to a triage result based on specialty alignment and mocked availability
FR18: System can be deployed as a containerised stack via Docker Compose on NVIDIA GPU infrastructure
FR19: System can confirm operational readiness via a health check endpoint
FR20: System processes all patient input without transmitting data outside the local deployment environment
FR21: Operator can pre-load the LLM at container startup to eliminate cold-start latency
FR22: Team can produce a submission-ready proposal document covering system description, architecture, and value proposition
FR23: Team can maintain a public GitHub repository with README, setup instructions, and Apache 2.0 license

### NonFunctional Requirements

NFR1: Triage response (symptom submission → full result displayed) completes in < 10 seconds with Ollama pre-warmed, measured end-to-end on demo hardware
NFR2: Nurse dashboard reflects new submissions within 2 seconds of POST request completion
NFR3: Frontend initial load completes in < 3 seconds on the demo machine
NFR4: Ollama model load at container startup completes before the first request is accepted; cold-start during a live demo is a critical failure
NFR5: Zero patient symptom data transmitted to external services — verified by network isolation in Docker Compose configuration
NFR6: Patient input not persisted beyond the active session except as entries in the local triage queue
NFR7: Deployment exposes only ports required for the demo interface; no public-facing admin or inference endpoints
NFR8: No credentials, API keys, or sensitive configuration committed to the public GitHub repository
NFR9: Patient-facing UI rendered in Greek with plain-language labels requiring no medical knowledge to interpret
NFR10: UI meets WCAG 2.1 AA best-effort: sufficient colour contrast (≥ 4.5:1), keyboard navigability, minimum 16px body font
NFR11: Medical disclaimer visually prominent (above the fold) on every triage result screen, written in plain Greek
NFR12: System completes a full demo run (symptom input → result → dashboard update) without failure; validated by pre-demo rehearsal on target hardware
NFR13: System returns a triage result using base LLM knowledge when RAG retrieval fails — no blank or error screen presented to the patient

### Additional Requirements

- **Starter template (Architecture):** Monorepo with `create-next-app@latest` (TypeScript, Tailwind, App Router) + custom FastAPI scaffold; project initialization is the first implementation story
- **Real-time mechanism:** SSE via FastAPI `StreamingResponse` with `text/event-stream`; client uses native browser `EventSource`; no WebSocket library
- **In-memory triage queue:** Python list protected by `asyncio.Lock`; owned by `core/queue.py`; resets on container restart (NFR6)
- **ChromaDB corpus seeding:** FastAPI lifespan event calls `rag_service.seed_corpus_if_empty()` at startup; idempotent; embedding model: `all-MiniLM-L6-v2`
- **Docker startup ordering:** ollama → chromadb → backend → frontend; each gated by healthcheck; ollama custom entrypoint (`docker/ollama-entrypoint.sh`) pulls `biomistral:7b` and signals readiness
- **NVIDIA GPU runtime:** `deploy.resources.reservations.devices` configured in docker-compose.yml
- **Patient data logging prohibition:** Symptom text must never appear in log output at any log level; enforced at code level in all services
- **AI pipeline error handling:** All exceptions in `/api/v1/triage` must be caught; return degraded-but-valid 200 response (never HTTP 500) on patient-facing routes
- **API contract fidelity:** All API JSON fields snake_case; no envelope wrappers; matches PRD contract exactly
- **Frontend imports:** `@/` absolute imports only; relative imports forbidden
- **Backend separation:** Business logic in `services/` only; router files contain route definitions only
- **Greek language validation (Sprint 1):** BioMistral-7B Greek medical terminology quality must be validated in Sprint 1; fallback strategy: translate input to English for inference, return result in Greek
- **LangChain versions:** `langchain==1.2.15`, `langchain-core==1.2.29`, LCEL pipeline style

### UX Design Requirements

_No UX Design document was provided for this project. No UX-DRs extracted._

### FR Coverage Map

```
FR1:  Epic 3 — Greek symptom input form (frontend)
FR2:  Epic 2 — MTS classification (AI pipeline)
FR3:  Epic 2 — Specialty recommendation (AI pipeline)
FR4:  Epic 3 — Doctor matching (patient results screen)
FR5:  Epic 2 — Reasoning generation (AI pipeline)
FR6:  Epic 3 — Medical disclaimer display (results screen)
FR7:  Epic 3 — Complete results screen
FR8:  Epic 3 — Simulated finddoctors.gov.gr redirect
FR9:  Epic 3 — Fallback doctor recommendation
FR10: Epic 4 — Live nurse dashboard queue
FR11: Epic 4 — Per-submission detail view
FR12: Epic 4 — SSE push (no page refresh)
FR13: Epic 2 — Greek LLM processing via BioMistral
FR14: Epic 2 — ChromaDB RAG augmentation
FR15: Epic 2 — Base LLM fallback when RAG fails
FR16: Epic 3 — Filterable mocked doctor list (GET /api/v1/doctors)
FR17: Epic 3 — Specialty-aligned doctor matching
FR18: Epic 1 — Docker Compose 4-service deployment
FR19: Epic 1 — Health check endpoint
FR20: Epic 1 — Network isolation / data containment
FR21: Epic 1 — Ollama pre-warm at container startup
FR22: Epic 5 — Proposal document
FR23: Epic 5 — Public repo, README, Apache 2.0
```

## Epic List

### Epic 1: Project Foundation & Deployable Stack
The full monorepo is scaffolded, all four Docker services start in the correct order (ollama → chromadb → backend → frontend), and the health check confirms the system is operational. Developers can run the entire stack on NVIDIA B200 hardware.
**FRs covered:** FR18, FR19, FR20, FR21
**Key NFRs:** NFR4, NFR5, NFR7, NFR8, NFR12

### Epic 2: AI Triage Pipeline
The backend AI engine accepts a Greek symptom string, runs it through BioMistral-7B + ChromaDB RAG, and returns a structured MTS level, specialty, and reasoning via `POST /api/v1/triage`. The three-tier fallback chain ensures a valid result is always returned. Verified via API client.
**FRs covered:** FR2, FR3, FR5, FR13, FR14, FR15
**Key NFRs:** NFR1, NFR13

### Epic 3: Patient Triage Experience
A patient can open the `/` route, enter symptoms in Greek, and receive a complete results screen: MTS level, recommended specialty, matched doctor, reasoning explanation, medical disclaimer, and a simulated finddoctors.gov.gr redirect. Fallback doctor matching handles missing specialty cases gracefully.
**FRs covered:** FR1, FR4, FR6, FR7, FR8, FR9, FR16, FR17
**Key NFRs:** NFR3, NFR9, NFR10, NFR11

### Epic 4: Nurse Real-Time Dashboard
A nurse can open `/dashboard` and see a live, auto-updating queue of all triage submissions — patient ID, MTS level, specialty, and timestamp — fed via SSE without any page refresh.
**FRs covered:** FR10, FR11, FR12
**Key NFRs:** NFR2

### Epic 5: Documentation & Hackathon Submission
The public GitHub repository is live with a complete README, Apache 2.0 license, and setup instructions. The hackathon proposal document is submission-ready.
**FRs covered:** FR22, FR23
**Key NFRs:** NFR8

---

## Epic 1: Project Foundation & Deployable Stack

The full monorepo is scaffolded, all four Docker services start in the correct order (ollama → chromadb → backend → frontend), and the health check confirms the system is operational. Developers can run the entire stack on NVIDIA B200 hardware.

### Story 1.1: Monorepo Scaffold & Project Structure

As a developer,
I want the complete project skeleton initialized with all directories and configuration files in place,
So that I can begin feature implementation without making structural decisions or resolving conflicts later.

**Acceptance Criteria:**

**Given** a clean repository with only a root `README.md` and `LICENSE`
**When** the scaffold setup is complete
**Then** the frontend is initialized via `npx create-next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"` and the directory exists at `frontend/`
**And** the backend directory tree exists: `backend/app/routers/`, `backend/app/services/`, `backend/app/schemas/`, `backend/app/core/`, `backend/data/corpus/`, `backend/tests/`
**And** placeholder files exist: `backend/main.py`, `backend/requirements.txt`, `backend/Dockerfile`, `backend/.dockerignore`
**And** a `docker/` directory exists with `docker/ollama-entrypoint.sh` as a placeholder
**And** root-level files exist: `docker-compose.yml` (skeleton), `.env.example`, `.gitignore` (ignores `.env`, `*.env.local`, `__pycache__`, `node_modules`, `.next`)
**And** `LICENSE` contains the Apache 2.0 license text
**And** no credentials, API keys, or real environment values exist in any committed file (NFR8)

---

### Story 1.2: FastAPI Base Application & Health Endpoint

As an operator,
I want a running FastAPI backend with a health check endpoint,
So that I can verify the backend service is accepting traffic and confirm operational readiness before the full stack is deployed.

**Acceptance Criteria:**

**Given** the backend directory scaffold from Story 1.1
**When** the FastAPI application is implemented
**Then** `backend/main.py` creates a FastAPI app with `CORSMiddleware` configured (`allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`)
**And** `backend/app/core/config.py` loads `OLLAMA_HOST`, `CHROMA_HOST`, and `CHROMA_PORT` from environment variables with documented defaults
**And** `backend/app/routers/health.py` implements `GET /api/v1/health` returning `{ "status": "ok" }` with HTTP 200
**And** the health router is registered on the FastAPI app under the `/api/v1` prefix
**And** `backend/requirements.txt` lists all required dependencies including `fastapi`, `uvicorn`, `langchain==1.2.15`, `langchain-core==1.2.29`, `langchain-community`, `langchain-chroma`, `chromadb==1.5.7`, `pydantic`
**And** running `uvicorn main:app --reload` from the `backend/` directory starts the server without errors
**And** `GET http://localhost:8000/api/v1/health` returns `{ "status": "ok" }` with HTTP 200
**And** the FastAPI auto-generated OpenAPI docs are accessible at `http://localhost:8000/docs`

---

### Story 1.3: Docker Compose Full Stack with Ordered Startup

As an operator,
I want `docker compose up` to bring up all four services in dependency order with GPU support,
So that BioMistral is fully loaded in Ollama before the backend accepts traffic, eliminating cold-start risk during the live demo.

**Acceptance Criteria:**

**Given** the monorepo scaffold and FastAPI base from Stories 1.1–1.2
**When** `docker compose up` is executed on target NVIDIA B200 hardware
**Then** `docker/ollama-entrypoint.sh` starts the Ollama server, pulls `biomistral:7b`, and exits with code 0 only after the model is confirmed present via `ollama list | grep biomistral`
**And** the `ollama` service healthcheck passes before the `chromadb` service starts
**And** the `chromadb` service healthcheck (HTTP 200 on `/api/v1/heartbeat`) passes before the `backend` service starts
**And** the `backend` service starts only after chromadb is healthy, and its health check (`GET /api/v1/health`) passes before `frontend` starts
**And** the `frontend` service starts only after the backend is healthy
**And** port bindings are: frontend on host `:3000`, backend on host `:8000`; ollama (`:11434`) and chromadb (`:8001`) are bound to the Docker internal network only and not reachable from the host (NFR7)
**And** the `ollama` and `chromadb` services are on an internal Docker network with no host port exposure (NFR5, NFR20)
**And** the `ollama` service `docker-compose.yml` entry includes `deploy.resources.reservations.devices` with `driver: nvidia`, `count: all`, `capabilities: [gpu]`
**And** `frontend` and `backend` services each have a `Dockerfile` that builds successfully
**And** `.env.example` documents all required environment variables (`NEXT_PUBLIC_API_URL`, `OLLAMA_HOST`, `CHROMA_HOST`, `CHROMA_PORT`) with no real values (NFR8)

---

## Epic 2: AI Triage Pipeline

The backend AI engine accepts a Greek symptom string, runs it through BioMistral-7B + ChromaDB RAG, and returns a structured MTS level, specialty, and reasoning via `POST /api/v1/triage`. The three-tier fallback chain ensures a valid result is always returned. Verified via API client.

### Story 2.1: ChromaDB Corpus Seeding & RAG Service

As a developer,
I want a ChromaDB collection seeded with clinical context documents at startup,
So that the AI pipeline can retrieve relevant medical context to augment BioMistral inference.

**Acceptance Criteria:**

**Given** a running ChromaDB service (internal Docker network or localhost for development)
**When** the FastAPI application starts via its lifespan event
**Then** `rag_service.seed_corpus_if_empty()` is called and checks whether the `clinical_context` collection already contains documents before ingesting
**And** if the collection is empty, documents from `backend/data/corpus/mts_guidelines.md` and `backend/data/corpus/specialty_reference.md` are ingested using the `all-MiniLM-L6-v2` embedding model (ChromaDB default built-in)
**And** the seeding operation is idempotent — running it twice does not create duplicate documents
**And** `rag_service.retrieve_context(symptoms: str) -> str` returns the top-k most relevant chunks for a given symptom string
**And** when ChromaDB is unreachable, `retrieve_context` raises a `RAGUnavailableError` (caught by the triage service in Story 2.3) rather than propagating an unhandled exception
**And** a unit test in `backend/tests/test_rag_service.py` verifies that `retrieve_context` returns a non-empty string for a sample Greek symptom input when the collection is seeded

---

### Story 2.2: BioMistral LLM Service via Ollama

As a developer,
I want an LLM service that sends structured prompts to BioMistral-7B via Ollama and parses structured triage output,
So that the AI pipeline can produce MTS classifications, specialty recommendations, and reasoning in Greek.

**Acceptance Criteria:**

**Given** a running Ollama service with `biomistral:7b` loaded
**When** `llm_service.classify(symptoms: str, context: str) -> dict` is called
**Then** a LangChain LCEL chain constructs a prompt combining the symptom text and retrieved context, targeting BioMistral-7B via the Ollama LangChain community integration
**And** the prompt instructs the model to return a JSON-parseable response containing `mts_level` (integer 1–5), `mts_label` (string), `specialty` (string), and `reasoning` (string)
**And** the output parser extracts these fields from the model response; if JSON parsing fails, a `LLMParseError` is raised
**And** `mts_label` maps correctly to the MTS standard: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent
**And** the service is validated in sprint 1 for Greek medical terminology quality; if accuracy is below 80% on test cases, the fallback strategy (translate symptom to English before inference, return result in Greek) is documented as a `TODO` comment with validation instructions
**And** symptom text is never included in any log statement at any log level — only `patient_id` may appear in logs (NFR5, NFR6)
**And** a unit test in `backend/tests/test_triage_service.py` confirms the LCEL chain is constructed correctly and the output parser handles a well-formed mock LLM response

---

### Story 2.3: Triage Service Orchestration & Fallback Chain

As a developer,
I want a single orchestration service that coordinates RAG + LLM inference with a three-tier fallback,
So that the triage pipeline always returns a valid result and never surfaces a blank screen or unhandled error to the patient.

**Acceptance Criteria:**

**Given** `rag_service` and `llm_service` from Stories 2.1–2.2 are available
**When** `triage_service.classify(symptoms: str, patient_id: str) -> TriageResponse` is called
**Then** tier 1: RAG context is retrieved and passed to `llm_service.classify`; if successful, a full `TriageResponse` is returned with the structured result
**And** tier 2: if `RAGUnavailableError` is raised, `llm_service.classify` is called with an empty context string and the response includes `"rag_used": false`
**And** tier 3: if `LLMParseError` or any other exception is raised, a safe-default response is returned: `mts_level=3`, `mts_label="Urgent"`, `specialty="Γενική Ιατρική"`, `reasoning="Αδυναμία επεξεργασίας — παρακαλώ επικοινωνήστε με ιατρό."` — no exception is propagated
**And** after a successful triage result (tiers 1 or 2), the summary entry is appended to the in-memory queue in `core/queue.py` using `asyncio.Lock` to protect concurrent writes
**And** the queue entry contains: `patient_id`, `mts_level`, `specialty`, `timestamp` (ISO 8601) — raw symptom text is never stored in the queue
**And** `core/queue.py` exposes `append_entry(entry: QueueEntry)` and `get_all_entries() -> list[QueueEntry]`
**And** all exceptions are caught and logged with `exc_info=True` but without the symptom text — the function never raises to the caller
**And** a unit test verifies each fallback tier activates correctly when upstream services raise the expected errors

---

### Story 2.4: POST /api/v1/triage Endpoint

As a developer,
I want the triage API endpoint wired to the triage service with validated Pydantic schemas,
So that the complete API contract from the PRD is met and the endpoint can be tested end-to-end via an API client.

**Acceptance Criteria:**

**Given** `triage_service` from Story 2.3 is implemented
**When** `POST /api/v1/triage` is called with `{ "symptoms": "string", "patient_id": "string" }`
**Then** `backend/app/schemas/triage.py` defines `TriageRequest` (symptoms: str, patient_id: str) and `TriageResponse` (mts_level: int, mts_label: str, specialty: str, doctor: dict, reasoning: str, redirect_url: str) as Pydantic models
**And** `backend/app/routers/triage.py` contains only the route definition — all business logic is delegated to `triage_service`
**And** the endpoint calls `triage_service.classify` and returns the `TriageResponse` as JSON with HTTP 200
**And** the endpoint never returns HTTP 500 — all exceptions from the service layer are already handled by Story 2.3's fallback chain
**And** the response JSON uses snake_case field names matching the PRD contract exactly: `mts_level`, `mts_label`, `specialty`, `doctor`, `reasoning`, `redirect_url`
**And** the response is a flat JSON object — no envelope wrapper (`{ data: ..., success: ... }` is forbidden)
**And** `GET /api/v1/health` continues to return `{ "status": "ok" }` confirming both endpoints are registered
**And** end-to-end manual test via `curl` or the `/docs` Swagger UI: submitting `{ "symptoms": "πόνος στο στήθος", "patient_id": "test-001" }` returns a valid `TriageResponse` with all required fields populated

---

## Epic 3: Patient Triage Experience

A patient can open the `/` route, enter symptoms in Greek, and receive a complete results screen: MTS level, recommended specialty, matched doctor, reasoning explanation, medical disclaimer, and a simulated finddoctors.gov.gr redirect. Fallback doctor matching handles missing specialty cases gracefully.

### Story 3.1: Mocked Doctor Dataset & Doctor Service

As a developer,
I want the doctor dataset loaded at startup and accessible via a filterable API endpoint,
So that the triage pipeline can match a doctor to each result and the frontend can display doctor information.

**Acceptance Criteria:**

**Given** `backend/data/doctors.json` exists with the schema `[{ "name": string, "specialty": string, "availability": boolean }]` containing at least 10 doctors across multiple specialties
**When** the FastAPI application starts
**Then** `doctor_service.py` loads `doctors.json` into an in-memory dict keyed by specialty at startup — no file reads occur during request handling
**And** `doctor_service.get_match(specialty: str) -> Doctor` returns the first available doctor matching the requested specialty
**And** if no doctor matches the exact specialty, the fallback returns a General Practitioner (`"Γενική Ιατρική"`) with a note in the doctor object indicating the fallback was used (FR9)
**And** `GET /api/v1/doctors` returns the full doctor list as a JSON array
**And** `GET /api/v1/doctors?specialty=Καρδιολογία` returns only doctors matching that specialty
**And** `backend/app/schemas/doctor.py` defines a `Doctor` Pydantic model with `name: str`, `specialty: str`, `availability: bool`
**And** `backend/app/routers/doctors.py` contains only the route definition — filtering logic lives in `doctor_service.py`
**And** a unit test in `backend/tests/test_doctor_service.py` verifies exact-match returns, fallback activates when no match exists, and the in-memory dict is populated correctly

---

### Story 3.2: Greek Symptom Input Form

As a patient,
I want a Greek-language symptom input form at the root route,
So that I can describe my symptoms in Greek and submit them for triage without needing medical knowledge.

**Acceptance Criteria:**

**Given** the Next.js frontend is running and `NEXT_PUBLIC_API_URL` is set
**When** a patient navigates to `/`
**Then** `frontend/app/page.tsx` renders `TriageForm.tsx` with all UI labels in Greek — no English text visible to the patient (NFR9)
**And** the form contains a textarea for free-text symptom input with a Greek placeholder (e.g., *"Περιγράψτε τα συμπτώματά σας..."*) and a submit button labelled in Greek
**And** on submit, the form calls `POST /api/v1/triage` via `frontend/app/lib/api.ts` with `{ symptoms, patient_id }` where `patient_id` is a client-generated anonymous UUID
**And** while the request is in flight, the submit button is disabled and a loading indicator is shown — the patient cannot submit twice (local `isLoading` state via `useState`, not global state)
**And** if the API call fails (network error or non-200 response), an inline error message is displayed in Greek without crashing the page
**And** on success, the triage response is passed to the results view (Story 3.3 component)
**And** all API calls use the `fetch` API via `frontend/app/lib/api.ts` — no Axios or React Query
**And** all imports in frontend TypeScript files use the `@/` prefix — no relative imports
**And** the page initial load completes in < 3 seconds on the demo machine (NFR3)

---

### Story 3.3: Triage Results Screen with Disclaimer

As a patient,
I want to see my complete triage result — MTS level, specialty, doctor, reasoning, and a medical disclaimer — on a single screen,
So that I understand my urgency level and have a clear next action without needing to navigate elsewhere.

**Acceptance Criteria:**

**Given** a successful `TriageResponse` returned from `POST /api/v1/triage`
**When** the results are rendered on the `/` route
**Then** `TriageResult.tsx` displays the MTS level (1–5) and its Greek label (e.g., *"Επείγον"*) prominently
**And** the recommended medical specialty is displayed in Greek
**And** the doctor's name and specialty from `DoctorCard.tsx` are displayed
**And** the AI reasoning text is displayed verbatim from the `reasoning` field
**And** `Disclaimer.tsx` renders the medical disclaimer text (provided by Stella) **above the fold** — visible without scrolling — on every result screen (FR6, NFR11)
**And** the disclaimer identifies MEDΩ as a triage aid, not a clinical diagnosis, written in plain Greek
**And** MTS level 1 and 2 results use a visually distinct colour treatment (e.g., red/orange) to signal urgency — colour contrast ratio ≥ 4.5:1 (NFR10)
**And** all body text uses a minimum 16px font size (NFR10)
**And** the UI is keyboard-navigable: all interactive elements are reachable via Tab key (NFR10)
**And** the results screen and disclaimer are rendered within `frontend/app/page.tsx` — no separate route navigation required (FR7)

---

### Story 3.4: Simulated finddoctors.gov.gr Redirect

As a patient,
I want to follow a link from my triage result to a simulated finddoctors.gov.gr page scoped to my recommended doctor and specialty,
So that I have a clear, actionable next step after receiving my triage result.

**Acceptance Criteria:**

**Given** a `TriageResponse` containing `redirect_url` and a `doctor` object
**When** the triage result is displayed
**Then** the backend constructs `redirect_url` as a simulated URL in the format `https://finddoctors.gov.gr/search?specialty={specialty}&doctor={doctor_name}` (URL-encoded) — no live API call is made (FR8)
**And** `DoctorCard.tsx` renders the `redirect_url` as a clearly labelled link in Greek (e.g., *"Βρείτε τον γιατρό στο finddoctors.gov.gr"*) that opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`)
**And** when the fallback doctor was used (FR9), `DoctorCard.tsx` displays a Greek note explaining that no exact specialist was found and a general practitioner is recommended instead
**And** the link is present and navigable regardless of whether an exact or fallback doctor match was returned
**And** the `redirect_url` field is populated in all three triage fallback tiers — a patient always has a redirect link

---

## Epic 4: Nurse Real-Time Dashboard

A nurse can open `/dashboard` and see a live, auto-updating queue of all triage submissions — patient ID, MTS level, specialty, and timestamp — fed via SSE without any page refresh.

### Story 4.1: SSE Triage Queue Stream Endpoint

As a developer,
I want a Server-Sent Events endpoint that streams the live triage queue to connected clients,
So that the nurse dashboard can receive new submissions in real time without polling.

**Acceptance Criteria:**

**Given** `core/queue.py` is implemented (Story 2.3) and the triage endpoint is writing entries
**When** a client connects to `GET /api/v1/triage/queue`
**Then** the endpoint is implemented as a FastAPI `StreamingResponse` with `media_type="text/event-stream"` and appropriate headers (`Cache-Control: no-cache`, `Connection: keep-alive`)
**And** on initial connection, the endpoint immediately streams all existing queue entries as individual `triage_update` events so the nurse sees the full backlog on connect
**And** each `triage_update` event follows the exact SSE format: `event: triage_update\ndata: {json}\n\n` where the data payload contains `patient_id`, `mts_level`, `specialty`, and `timestamp` (ISO 8601) — raw symptom text is never included
**And** the endpoint sends a keepalive comment `": ping\n\n"` every 15 seconds to prevent proxy/browser timeouts
**And** when a new entry is appended to the queue (via Story 2.3), connected SSE clients receive the new `triage_update` event within 2 seconds of the originating `POST /api/v1/triage` completing (NFR2)
**And** the SSE stream route is registered in `backend/app/routers/triage.py` under `/api/v1/triage/queue`
**And** manual verification: `curl -N http://localhost:8000/api/v1/triage/queue` holds open a connection and prints a `triage_update` event when a triage POST is submitted in a separate terminal

---

### Story 4.2: Nurse Dashboard UI with Live Queue

As a nurse,
I want a live dashboard at `/dashboard` that automatically displays incoming triage submissions,
So that I can monitor patient triage activity in real time without refreshing the page.

**Acceptance Criteria:**

**Given** the SSE endpoint from Story 4.1 is running and `NEXT_PUBLIC_API_URL` is set
**When** a nurse navigates to `/dashboard`
**Then** `frontend/app/dashboard/page.tsx` renders `TriageQueue.tsx` which displays all existing queue entries on load
**And** `useTriageStream.ts` opens a native `EventSource` connection to `GET /api/v1/triage/queue` — no WebSocket library or custom reconnect logic is used (browser handles reconnect natively)
**And** when a new `triage_update` event is received, `TriageQueue.tsx` re-renders with the new entry prepended to the top of the list without any page refresh (FR12)
**And** each `TriageQueueItem.tsx` displays: anonymous patient ID, MTS level with its Greek label, recommended specialty, and submission timestamp formatted in Greek locale (FR11)
**And** MTS level 1 and 2 items use a visually distinct colour treatment matching the patient results screen (consistent urgency signalling)
**And** if the EventSource connection drops, the browser reconnects automatically — no custom retry logic exists in `useTriageStream.ts`
**And** the dashboard renders all labels in Greek — no English text visible to the nurse (NFR9)
**And** the dashboard is keyboard-navigable and meets WCAG 2.1 AA colour contrast requirements (NFR10)
**And** all frontend imports use `@/` prefix; `useTriageStream.ts` lives in `frontend/app/lib/`
**And** end-to-end verification: opening `/dashboard` in one browser tab and submitting symptoms in another tab causes a new queue entry to appear on the dashboard within 2 seconds (NFR2)

---

## Epic 5: Documentation & Hackathon Submission

The public GitHub repository is live with a complete README, Apache 2.0 license, and setup instructions. The hackathon proposal document is submission-ready for the Kiefer AI Open Hackathon 2026.

### Story 5.1: Hackathon Proposal Document

As a team member,
I want a submission-ready proposal document covering MEDΩ's system description, architecture, and value proposition,
So that hackathon evaluators understand the product and the basis for the €10,000 prize ask within a 90-second read.

**Acceptance Criteria:**

**Given** the completed MVP is functional and the architecture document exists
**When** `docs/proposal.md` is written
**Then** the document covers: problem statement (7M annual wrong-specialty ΕΣΥ appointments), proposed solution (AI-powered MTS triage + precision doctor matching), technical architecture summary (BioMistral-7B + RAG + FastAPI + Next.js + Docker + NVIDIA B200), GDPR compliance approach (on-premise inference, synthetic data), and value proposition (open-source, replicable by EU public health systems)
**And** the document references measurable success criteria from the PRD: ≥80% MTS classification accuracy, <10s triage response, <2s dashboard latency
**And** the document is written in clear, non-technical language accessible to a non-technical evaluator
**And** the document includes a section on what the €10,000 prize would fund (post-hackathon Phase 2 development)
**And** the document is ≤ 4 pages / ~1,500 words — concise enough for a live demo context
**And** the document references the public GitHub repository URL

---

### Story 5.2: Public Repository README & License

As a developer or evaluator,
I want a complete README and Apache 2.0 license in the public repository,
So that anyone can understand, set up, and run MEDΩ from the repository without additional guidance.

**Acceptance Criteria:**

**Given** the full stack is deployable via `docker compose up`
**When** `README.md` is completed
**Then** the README includes: project name and one-paragraph description, prerequisites (Docker with NVIDIA runtime, `docker compose`, NVIDIA GPU), setup instructions (`git clone` → `cp .env.example .env` → `docker compose up`), environment variable table documenting all variables from `.env.example`, demo run instructions (how to access patient form at `:3000` and nurse dashboard at `:3000/dashboard`), and a link to `docs/proposal.md`
**And** the README includes a note that Ollama will pull `biomistral:7b` on first startup (~4GB) and that pre-warming is automatic
**And** `LICENSE` contains the full Apache 2.0 license text with the correct copyright holder
**And** a scan of the repository confirms no `.env` files, API keys, credentials, or secrets are committed — only `.env.example` with placeholder values (NFR8)
**And** the README is written in English (per `document_output_language` config)
**And** the repository structure matches the architecture document's complete directory listing
