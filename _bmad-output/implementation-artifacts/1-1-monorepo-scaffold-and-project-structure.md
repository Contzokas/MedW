# Story 1.1: Monorepo Scaffold & Project Structure

Status: done

## Story

As a developer,
I want the complete project skeleton initialized with all directories and configuration files in place,
So that I can begin feature implementation without making structural decisions or resolving conflicts later.

## Acceptance Criteria

1. **Given** a clean repository with only a root `README.md` and `LICENSE`
   **When** the scaffold setup is complete
   **Then** the frontend is initialized via `npx create-next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"` and the directory exists at `frontend/`

2. **And** the backend directory tree exists:
   - `backend/app/routers/`
   - `backend/app/services/`
   - `backend/app/schemas/`
   - `backend/app/core/`
   - `backend/data/corpus/`
   - `backend/tests/`

3. **And** placeholder files exist: `backend/main.py`, `backend/requirements.txt`, `backend/Dockerfile`, `backend/.dockerignore`

4. **And** a `docker/` directory exists with `docker/ollama-entrypoint.sh` as a placeholder

5. **And** root-level files exist:
   - `docker-compose.yml` (skeleton — services defined but no real logic yet)
   - `.env.example` (documents all required env vars: `NEXT_PUBLIC_API_URL`, `OLLAMA_HOST`, `CHROMA_HOST`, `CHROMA_PORT` — no real values)
   - `.gitignore` (ignores: `.env`, `*.env.local`, `__pycache__`, `node_modules`, `.next`)

6. **And** `LICENSE` contains the Apache 2.0 license text (already present — verify only, do not overwrite)

7. **And** no credentials, API keys, or real environment values exist in any committed file (NFR8)

## Tasks / Subtasks

- [x] Initialize frontend via create-next-app (AC: #1)
  - [x] Run `npx create-next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"` from project root
  - [x] Verify `frontend/` directory was created with Next.js 15 App Router structure
  - [x] Verify `frontend/app/layout.tsx`, `frontend/app/page.tsx` exist (created by create-next-app)

- [x] Create backend directory structure (AC: #2)
  - [x] `mkdir -p backend/app/routers backend/app/services backend/app/schemas backend/app/core`
  - [x] `mkdir -p backend/data/corpus backend/tests`
  - [x] Add `.gitkeep` files in empty dirs that need to be tracked (data/corpus, tests)

- [x] Create backend placeholder files (AC: #3)
  - [x] `backend/main.py` — minimal placeholder (one comment: `# FastAPI app — implemented in Story 1.2`)
  - [x] `backend/requirements.txt` — empty placeholder (populated in Story 1.2)
  - [x] `backend/Dockerfile` — placeholder with TODO comment
  - [x] `backend/.dockerignore` — include `__pycache__`, `*.pyc`, `.env`, `venv/`, `.pytest_cache/`

- [x] Create docker support directory (AC: #4)
  - [x] `mkdir docker`
  - [x] `docker/ollama-entrypoint.sh` — placeholder shell script with TODO comment; make executable (`chmod +x`)

- [x] Create root-level config files (AC: #5)
  - [x] `docker-compose.yml` — skeleton defining 4 named services (`ollama`, `chromadb`, `backend`, `frontend`) with placeholder configuration
  - [x] `.env.example` — document all 4 required env vars with placeholder values
  - [x] `.gitignore` — include all required patterns (see below)

- [x] Verify LICENSE file (AC: #6)
  - [x] Confirm `LICENSE` is Apache 2.0 — already present, do not overwrite

- [x] Security scan (AC: #7)
  - [x] Confirm no `.env` file committed
  - [x] Confirm `.env.example` has only placeholder values
  - [x] Confirm `backend/.dockerignore` excludes `.env`

### Review Findings (AI) — 2026-04-16

- [x] [Review][Patch] `backend/app/` subdirectories missing `.gitkeep` — git does not track empty directories; `routers/`, `services/`, `schemas/`, `core/` will be absent after a fresh clone [backend/app/routers/, backend/app/services/, backend/app/schemas/, backend/app/core/]
- [x] [Review][Defer] `langchain==1.2.15`, `langchain-core==1.2.29`, `chromadb==1.5.7` version pins in `requirements.txt` comments should be verified against PyPI before Story 1.2 populates the file [backend/requirements.txt] — deferred, pre-existing
- [x] [Review][Defer] `"lint": "eslint"` in `frontend/package.json` has no target path; ESLint 9 flat config requires explicit targets — should be addressed when CI/linting is configured [frontend/package.json] — deferred, pre-existing

## Dev Notes

### Critical Context: This Story's Scope

This story creates ONLY the skeleton — no running code, no logic, no actual FastAPI app. Story 1.2 implements the FastAPI app; Story 1.3 implements Docker Compose fully. The acceptance criteria use the word "placeholder" and "skeleton" deliberately.

**Do NOT implement:**
- Any actual FastAPI routes or app logic (Story 1.2)
- Docker Compose healthchecks or GPU config (Story 1.3)
- Any React components beyond what create-next-app scaffolds (Epics 2–4)

### Frontend Initialization Command — Exact

```bash
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

This is prescribed in both the PRD and Architecture doc. Use exactly this command. Do NOT add `--src-dir`. The `--import-alias "@/*"` flag ensures `@/` imports work (enforced project-wide anti-pattern: no relative imports allowed in frontend).

### Backend Placeholder Files — Minimum Content

**`backend/main.py`:**
```python
# FastAPI application — implemented in Story 1.2
# Run: uvicorn main:app --reload (from backend/ directory)
```

**`backend/requirements.txt`:**
```
# Dependencies — populated in Story 1.2
# Key packages: fastapi, uvicorn, langchain==1.2.15, langchain-core==1.2.29, chromadb==1.5.7
```

**`backend/Dockerfile`:**
```dockerfile
# Backend Dockerfile — implemented in Story 1.3
FROM python:3.11-slim
WORKDIR /app
```

**`backend/.dockerignore`:**
```
__pycache__
*.pyc
*.pyo
.env
venv/
.pytest_cache/
*.egg-info/
```

### docker-compose.yml Skeleton — Required Structure

The skeleton must define all 4 service names so Stories 1.2 and 1.3 can fill them in. Minimal valid skeleton:

```yaml
version: "3.9"

services:
  ollama:
    # Implemented in Story 1.3
    image: ollama/ollama
    # GPU config added in Story 1.3

  chromadb:
    # Implemented in Story 1.3
    image: chromadb/chroma:1.5.7

  backend:
    # Implemented in Stories 1.2–1.3
    build: ./backend

  frontend:
    # Implemented in Story 1.3
    build: ./frontend
```

**Do NOT add healthchecks, `depends_on`, port mappings, or GPU config** — those are Story 1.3. Adding them now with incorrect values would cause Story 1.3 to fix regressions instead of implementing.

### .env.example — Required Content

```
# Copy to .env and fill in values before running
# NEVER commit .env to version control

NEXT_PUBLIC_API_URL=http://localhost:8000
OLLAMA_HOST=http://ollama:11434
CHROMA_HOST=chromadb
CHROMA_PORT=8001
```

### .gitignore — Required Patterns

```
# Environment
.env
*.env.local
.env.*.local

# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
venv/

# Node
node_modules/
.next/
out/

# Misc
.DS_Store
*.log
```

### docker/ollama-entrypoint.sh Placeholder

```bash
#!/bin/bash
# Ollama entrypoint — implemented in Story 1.3
# Will: start ollama server, pull biomistral:7b, signal readiness
echo "TODO: implement in Story 1.3"
```

Make this file executable: `chmod +x docker/ollama-entrypoint.sh`

### Project Structure Notes

#### Complete Target Structure (from Architecture doc)

```
medw/
├── README.md                        ← already exists
├── LICENSE                          ← already exists — Apache 2.0, do NOT overwrite
├── docker-compose.yml               ← skeleton (this story)
├── .env.example                     ← placeholder values (this story)
├── .gitignore                       ← (this story)
├── docs/                            ← already exists
│   └── proposal.md                  ← (Story 5.1)
├── docker/
│   └── ollama-entrypoint.sh         ← placeholder (this story)
├── frontend/                        ← create-next-app output (this story)
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── Dockerfile                   ← (Story 1.3)
│   └── app/
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx
└── backend/
    ├── requirements.txt             ← placeholder (this story)
    ├── Dockerfile                   ← placeholder (this story)
    ├── .dockerignore                ← (this story)
    ├── main.py                      ← placeholder (this story)
    ├── app/
    │   ├── routers/                 ← empty (future stories)
    │   ├── services/                ← empty (future stories)
    │   ├── schemas/                 ← empty (future stories)
    │   └── core/                   ← empty (future stories)
    ├── data/
    │   └── corpus/                  ← empty (Story 2.1)
    └── tests/                       ← empty (Stories 2.x)
```

#### What create-next-app generates (do not delete or modify)

create-next-app with these flags generates: `app/`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `public/`, `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `.eslintrc.json`, `.gitignore` (Next.js version — check it doesn't conflict with root .gitignore).

**Important:** create-next-app creates its own `frontend/.gitignore`. The root `.gitignore` is SEPARATE and must cover the entire monorepo (Python + Node).

#### Alignment with Architecture Boundaries

- `backend/app/routers/` → route definitions only (Stories 1.2+)
- `backend/app/services/` → business logic only (Stories 2.x)
- `backend/app/schemas/` → Pydantic models only (Stories 1.2+)
- `backend/app/core/` → config + SSE queue (Stories 1.2, 2.3)
- These boundaries are **enforced architecture constraints** — creating files in the wrong location in later stories is a critical violation

### Tech Stack Versions (from Architecture doc)

| Component | Version | Notes |
|---|---|---|
| Next.js | 15 (latest) | via create-next-app@latest |
| TypeScript | bundled with Next.js 15 | |
| Tailwind CSS | v4 | bundled with Next.js 15 |
| Node.js | 20.9+ | runtime requirement |
| Python | 3.11+ | backend runtime |
| ChromaDB | 1.5.7 | docker image tag for Story 1.3 |
| LangChain | 1.2.15 | pinned — do not upgrade |
| langchain-core | 1.2.29 | pinned — do not upgrade |

### References

- Epic 1 story requirements: [epics.md#story-1.1](_bmad-output/planning-artifacts/epics.md)
- Architecture monorepo structure: [architecture.md#complete-project-directory-structure](_bmad-output/planning-artifacts/architecture.md)
- Architecture starter template decision: [architecture.md#selected-approach](_bmad-output/planning-artifacts/architecture.md)
- Implementation handoff commands: [architecture.md#implementation-handoff](_bmad-output/planning-artifacts/architecture.md)
- NFR8 (no secrets in repo): [epics.md#nonfunctional-requirements](_bmad-output/planning-artifacts/epics.md)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- create-next-app installed as `create-next-app@16.2.4` (Next.js 15 package). Tailwind v4 no longer uses `tailwind.config.ts` — configured via `postcss.config.mjs` instead. This is expected behavior with the prescribed command.

### Completion Notes List

- ✅ AC #1: Frontend initialized via `create-next-app@latest` with all prescribed flags. `frontend/app/layout.tsx` and `frontend/app/page.tsx` confirmed present.
- ✅ AC #2: All 6 backend subdirectories created. `.gitkeep` files added to `backend/data/corpus/` and `backend/tests/`.
- ✅ AC #3: `backend/main.py`, `backend/requirements.txt`, `backend/Dockerfile`, `backend/.dockerignore` created with exact prescribed placeholder content.
- ✅ AC #4: `docker/ollama-entrypoint.sh` created with prescribed placeholder content and made executable (`chmod +x`).
- ✅ AC #5: `docker-compose.yml` skeleton defines 4 services (ollama, chromadb, backend, frontend) with no healthchecks/ports/GPU config — reserved for Story 1.3. `.env.example` documents all 4 required env vars with placeholder values. `.gitignore` covers all required patterns.
- ✅ AC #6: `LICENSE` is Apache 2.0 — verified, not overwritten.
- ✅ AC #7: No `.env` file present. `.env.example` contains only placeholder values. `backend/.dockerignore` excludes `.env`.

### File List

- `frontend/` (entire create-next-app scaffold — 359 packages installed)
- `frontend/app/layout.tsx`
- `frontend/app/page.tsx`
- `frontend/app/globals.css`
- `frontend/package.json`
- `frontend/next.config.ts`
- `frontend/postcss.config.mjs`
- `frontend/tsconfig.json`
- `frontend/eslint.config.mjs`
- `frontend/.gitignore`
- `backend/app/routers/.gitkeep`
- `backend/app/services/.gitkeep`
- `backend/app/schemas/.gitkeep`
- `backend/app/core/.gitkeep`
- `backend/data/corpus/.gitkeep`
- `backend/tests/.gitkeep`
- `backend/main.py`
- `backend/requirements.txt`
- `backend/Dockerfile`
- `backend/.dockerignore`
- `docker/ollama-entrypoint.sh`
- `docker-compose.yml`
- `.env.example`
- `.gitignore`

## Change Log

| Date | Change |
|---|---|
| 2026-04-16 | Story 1.1 implemented — full monorepo scaffold created: Next.js 15 frontend, backend skeleton, docker placeholder, root config files. All 7 ACs satisfied. |
