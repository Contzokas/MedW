# Story 1.2: FastAPI Base Application & Health Endpoint

Status: ready-for-dev

## Story

As an operator,
I want a running FastAPI backend with a health check endpoint,
so that I can verify the backend service is accepting traffic and confirm operational readiness before the full stack is deployed.

## Acceptance Criteria

1. **Given** the backend directory scaffold from Story 1.1
   **When** the FastAPI application is implemented
   **Then** `backend/main.py` creates a FastAPI app with `CORSMiddleware` configured (`allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`)

2. **And** `backend/app/core/config.py` loads `OLLAMA_HOST`, `CHROMA_HOST`, and `CHROMA_PORT` from environment variables with documented defaults

3. **And** `backend/app/routers/health.py` implements `GET /api/v1/health` returning `{ "status": "ok" }` with HTTP 200

4. **And** the health router is registered on the FastAPI app under the `/api/v1` prefix

5. **And** `backend/requirements.txt` lists all required dependencies including `fastapi`, `uvicorn`, `langchain==1.2.15`, `langchain-core==1.2.29`, `langchain-community`, `langchain-chroma`, `chromadb==1.5.7`, `pydantic`

6. **And** running `uvicorn main:app --reload` from the `backend/` directory starts the server without errors

7. **And** `GET http://localhost:8000/api/v1/health` returns `{ "status": "ok" }` with HTTP 200

8. **And** the FastAPI auto-generated OpenAPI docs are accessible at `http://localhost:8000/docs`

## Tasks / Subtasks

- [ ] Implement `backend/requirements.txt` (AC: #5)
  - [ ] Add `fastapi` (latest stable, compatible with Python 3.11+)
  - [ ] Add `uvicorn[standard]` for ASGI server with websocket and watchfiles support
  - [ ] Add `langchain==1.2.15` (pinned — do not change version)
  - [ ] Add `langchain-core==1.2.29` (pinned — do not change version)
  - [ ] Add `langchain-community` (unpinned — Ollama integration; must be compatible with above)
  - [ ] Add `langchain-chroma` (unpinned — ChromaDB integration)
  - [ ] Add `chromadb==1.5.7` (pinned — matches docker image tag)
  - [ ] Add `pydantic` (v2, bundled with fastapi but explicit pin avoids surprises)
  - [ ] Add `python-dotenv` for `.env` file loading in development

- [ ] Create `backend/app/core/config.py` (AC: #2)
  - [ ] Load env vars: `OLLAMA_HOST`, `CHROMA_HOST`, `CHROMA_PORT`
  - [ ] Provide documented defaults: `OLLAMA_HOST=http://ollama:11434`, `CHROMA_HOST=chromadb`, `CHROMA_PORT=8001`
  - [ ] Use `os.environ.get()` with defaults (not `python-dotenv` directly — that is loaded in `main.py`)
  - [ ] Remove the `.gitkeep` from `backend/app/core/` (it will be replaced by `config.py`)

- [ ] Create `backend/app/routers/health.py` (AC: #3, #4)
  - [ ] Create a FastAPI `APIRouter` instance
  - [ ] Define `GET /health` route that returns `{ "status": "ok" }` with HTTP 200
  - [ ] The router uses prefix `/api/v1` applied when registered in `main.py` — so the route function path is just `/health`
  - [ ] No business logic — this is a pure router file
  - [ ] Remove the `.gitkeep` from `backend/app/routers/` (it will be replaced by `health.py`)

- [ ] Implement `backend/main.py` (AC: #1, #4, #6, #7, #8)
  - [ ] Replace the placeholder comment with a real FastAPI app
  - [ ] Create `app = FastAPI(title="MedW API", version="0.1.0")`
  - [ ] Add `CORSMiddleware` with `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`
  - [ ] Import and register the health router: `app.include_router(health.router, prefix="/api/v1")`
  - [ ] Load dotenv at startup (so env vars from `.env` are available in dev)

- [ ] Verify the server runs and endpoints respond (AC: #6, #7, #8)
  - [ ] `pip install -r requirements.txt` (from `backend/` directory)
  - [ ] `uvicorn main:app --reload` starts without errors
  - [ ] `GET http://localhost:8000/api/v1/health` returns `{"status": "ok"}` HTTP 200
  - [ ] `http://localhost:8000/docs` loads the Swagger UI

## Dev Notes

### What Already Exists from Story 1.1

- `backend/main.py` is a **placeholder with two comment lines** — replace it entirely with the real implementation
- `backend/requirements.txt` is a **placeholder with a comment** — replace it entirely with real dependencies
- `backend/app/routers/` contains only `.gitkeep` — create `health.py` alongside it (do NOT delete `.gitkeep` from other empty subdirs: `services/`, `schemas/`)
- `backend/app/core/` contains only `.gitkeep` — create `config.py` alongside it
- Story 1.1 Dev Agent Note: Tailwind v4 no longer uses `tailwind.config.ts` — configured via `postcss.config.mjs` instead (frontend unaffected by this story)

### Architecture Constraints — MUST FOLLOW

**Router/Service/Schema pattern (Architecture doc — Structure Patterns):**
- `backend/app/routers/health.py` → route definition ONLY. No logic. Response is created inline.
- `backend/app/services/` → not touched in this story (first used in Story 2.x)
- `backend/app/schemas/` → not touched in this story (first Pydantic schema in Story 2.5)
- **Enforcement:** The architecture doc explicitly states "routers/ — FastAPI route definitions only; no business logic". This constraint applies to ALL future stories too. The health endpoint is simple enough that there is no service needed — the router returns the static response directly.

**CORS Configuration:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Note: `allow_origins=["*"]` is intentional for demo — the architecture doc documents this as post-MVP to lock down.

**API prefix registration:**
```python
from app.routers import health
app.include_router(health.router, prefix="/api/v1")
```
The router itself uses path `/health`, so the full path becomes `/api/v1/health`. ALL future routers (triage, doctors) follow the same pattern.

### `backend/app/core/config.py` — Required Implementation

```python
import os

OLLAMA_HOST: str = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
CHROMA_HOST: str = os.environ.get("CHROMA_HOST", "chromadb")
CHROMA_PORT: int = int(os.environ.get("CHROMA_PORT", "8001"))
```

The defaults match the Docker Compose internal network hostnames (Story 1.3 will use these). In local development with `.env`, values are overridden to `localhost`-based URLs.

### `backend/main.py` — Required Implementation

```python
from dotenv import load_dotenv
load_dotenv()  # Load .env if present (development only)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health

app = FastAPI(title="MedW API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
```

Run with: `uvicorn main:app --reload` (from `backend/` directory — NOT from project root)

### `backend/requirements.txt` — Required Exact Content

```
fastapi
uvicorn[standard]
python-dotenv
pydantic
langchain==1.2.15
langchain-core==1.2.29
langchain-community
langchain-chroma
chromadb==1.5.7
```

**Why all langchain/chromadb deps now?** The acceptance criteria explicitly requires them in this story's `requirements.txt`. Stories 2.1–2.3 will USE these libraries but they are declared here so the Docker image layer is cached from Story 1.3 onwards.

**Version pins (from Architecture doc — Infrastructure & Deployment):**
- `langchain==1.2.15` — PINNED, do NOT change
- `langchain-core==1.2.29` — PINNED, do NOT change
- `chromadb==1.5.7` — PINNED, matches Docker image tag in Story 1.3

### `.env` for Local Development

Create a local `.env` at `backend/` level (or project root) for dev — but do NOT commit it:
```
OLLAMA_HOST=http://localhost:11434
CHROMA_HOST=localhost
CHROMA_PORT=8001
```
The `.gitignore` already excludes `.env` (done in Story 1.1). The `.env.example` at project root already documents these vars.

### File Structure Impact

Files created by this story:
```
backend/
├── main.py                     ← REPLACE placeholder with real FastAPI app
├── requirements.txt            ← REPLACE placeholder with real dependencies
└── app/
    ├── core/
    │   ├── .gitkeep            ← keep this (other stories will add queue.py here)
    │   └── config.py           ← NEW: env var loading
    └── routers/
        ├── .gitkeep            ← keep this (other routers added later, .gitkeep still tracked)
        └── health.py           ← NEW: GET /api/v1/health
```

Do NOT create or modify:
- `backend/app/services/` (first used in Story 2.x — keep `.gitkeep` only)
- `backend/app/schemas/` (first used in Story 2.5 — keep `.gitkeep` only)
- Anything in `frontend/` (not touched in this story)
- `docker-compose.yml` (Story 1.3)

### API Endpoint Naming Convention

From Architecture doc — Naming Patterns, all API fields use **snake_case**:
```json
{ "status": "ok" }
```
The health endpoint response is already snake_case. Future endpoints (`mts_level`, `patient_id`, `redirect_url`) must follow this convention.

### Testing Requirements

No automated tests are defined in this story's acceptance criteria. Manual verification is the AC:
1. Server starts: `uvicorn main:app --reload`
2. Endpoint responds: `curl http://localhost:8000/api/v1/health`
3. Docs accessible: browser to `http://localhost:8000/docs`

The first backend unit tests appear in Stories 2.1–2.3 (`backend/tests/`). The `backend/tests/` directory and `conftest.py` are scaffolded in Story 1.1 but not used until Story 2.x.

### Security Notes (NFR8)

- Patient data logging prohibition does NOT apply yet (no patient data in this story)
- The CORS `allow_origins=["*"]` is intentional for demo — documented as post-MVP to restrict
- No API keys or credentials in any file in this story

### Previous Story Intelligence

From Story 1.1 Dev Agent Record:
- `backend/app/core/` and `backend/app/routers/` contain only `.gitkeep` files — the new `.py` files go alongside these, not instead of them
- `backend/app/services/` and `backend/app/schemas/` should remain with only `.gitkeep` — do NOT create files in them in this story
- The root `.gitignore` already covers `.env` exclusion — no action needed
- Story 1.1 reviewer noted LangChain version pins in requirements.txt comments should be verified against PyPI before populating — this story resolves that by actually pinning them

### Cross-Story Dependencies

**This story is a prerequisite for:**
- Story 1.3: Docker Compose adds healthcheck `GET /api/v1/health` to gate `frontend` service startup
- Story 2.5: Triage router registered alongside health router using same `prefix="/api/v1"` pattern
- Story 2.4: Doctors router registered with same pattern

**Dependencies on previous stories:**
- Story 1.1 DONE: backend scaffold exists; `main.py` and `requirements.txt` are placeholders ready to be replaced

### Project Structure Notes

- `backend/` is the working directory for uvicorn — always run `uvicorn main:app --reload` FROM inside `backend/`, not from the project root
- Import paths are relative to `backend/`: `from app.routers import health` works when CWD is `backend/`
- The architecture doc lists the future complete structure — this story creates only `core/config.py` and `routers/health.py`

### References

- Story 1.2 requirements: [epics.md — Story 1.2](_bmad-output/planning-artifacts/epics.md)
- Architecture — Structure Patterns (router/service/schema): [architecture.md — Structure Patterns](_bmad-output/planning-artifacts/architecture.md)
- Architecture — Infrastructure & Deployment (LangChain version pins): [architecture.md — Infrastructure & Deployment](_bmad-output/planning-artifacts/architecture.md)
- Architecture — Enforcement Guidelines (anti-patterns): [architecture.md — Enforcement Guidelines](_bmad-output/planning-artifacts/architecture.md)
- Architecture — Complete Directory Structure: [architecture.md — Complete Project Directory Structure](_bmad-output/planning-artifacts/architecture.md)
- NFR5, NFR8 (data isolation, no secrets): [epics.md — NonFunctional Requirements](_bmad-output/planning-artifacts/epics.md)
- Previous Story 1.1 dev notes: [1-1-monorepo-scaffold-and-project-structure.md](_bmad-output/implementation-artifacts/1-1-monorepo-scaffold-and-project-structure.md)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
