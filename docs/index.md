# MedW Project Documentation Index

> Generated: 2026-04-18 | Scan: Exhaustive | Branch: dev

This is the **primary AI context entry point** for the MedW project. Start here when beginning any AI-assisted development session.

---

## Project Overview

- **Type:** Multi-part application (3 parts)
- **Domain:** Healthcare / Medical Triage
- **Primary Language:** Python (backend) + TypeScript (frontend)
- **Architecture:** FastAPI REST + SSE + Next.js + Ollama RAG pipeline

### Parts

| Part | Type | Root | Port |
|---|---|---|---|
| `backend` | FastAPI REST + SSE API | `backend/` | `:8000` |
| `frontend` | Next.js 16 / TypeScript | `frontend/` | `:3000` |
| `ai-pipeline` | Ollama (Mistral-7B) + ChromaDB | Docker services | internal |

---

## Quick Reference

### Backend
- **Entry point:** `backend/main.py`
- **Tech:** Python 3.11, FastAPI, Pydantic, LangChain, ChromaDB, sentence-transformers
- **Test:** `cd backend && pytest`

### Frontend
- **Entry points:** `frontend/app/page.tsx` (`/`) · `frontend/app/dashboard/page.tsx` (`/dashboard`)
- **Tech:** TypeScript, Next.js 16.2.4, React 19.2.4, Tailwind CSS v4
- **Dev:** `cd frontend && npm run dev`

### AI Pipeline
- **LLM:** Mistral-7B via `http://ollama:11434` (LangChain `ChatOllama`)
- **RAG:** ChromaDB `clinical_context` collection, top-3 retrieval, `all-MiniLM-L6-v2` embeddings
- **Corpus:** `backend/data/corpus/mts_guidelines.md` + `specialty_reference.md`

### Full Stack
```bash
cp .env.example .env && docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000/docs
```

---

## Generated Documentation

### Architecture
- [Project Overview](./project-overview.md) — Purpose, stack summary, design decisions, user roles
- [Architecture — Backend](./architecture-backend.md) — Layered architecture, triage pipeline, SSE queue, testing
- [Architecture — Frontend](./architecture-frontend.md) — App Router, component tree, SSE hook, state management
- [Architecture — AI Pipeline](./architecture-ai-pipeline.md) — RAG design, LLM prompt, ChromaDB, Ollama, error handling
- [Integration Architecture](./integration-architecture.md) — Cross-part data flows, Docker networks, startup order, shared contracts

### Reference
- [API Contracts — Backend](./api-contracts-backend.md) — All 4 endpoints with request/response schemas
- [Data Models — Backend](./data-models-backend.md) — Pydantic schemas, TypeScript mirrors, doctor dataset
- [Component Inventory — Frontend](./component-inventory-frontend.md) — All 8 React components with props and behaviour
- [Source Tree Analysis](./source-tree-analysis.md) — Annotated directory tree, entry points, critical paths

### Guides
- [Development Guide](./development-guide.md) — Local setup, running tests, common dev tasks
- [Deployment Guide](./deployment-guide.md) — Docker Compose deployment, GPU setup, volume management

---

## For AI-Assisted Development

### Working on a patient-facing feature?
→ Read: [architecture-frontend.md](./architecture-frontend.md), [component-inventory-frontend.md](./component-inventory-frontend.md), [api-contracts-backend.md](./api-contracts-backend.md)

### Working on a backend API feature?
→ Read: [architecture-backend.md](./architecture-backend.md), [data-models-backend.md](./data-models-backend.md), [api-contracts-backend.md](./api-contracts-backend.md)

### Working on the AI/triage pipeline?
→ Read: [architecture-ai-pipeline.md](./architecture-ai-pipeline.md), [architecture-backend.md](./architecture-backend.md)

### Working on the nurse dashboard?
→ Read: [component-inventory-frontend.md](./component-inventory-frontend.md), [integration-architecture.md](./integration-architecture.md)

### Adding a new feature end-to-end?
→ Read: [integration-architecture.md](./integration-architecture.md), then all three architecture docs

---

## Existing Planning Artifacts

| Document | Location | Description |
|---|---|---|
| PRD | `_bmad-output/planning-artifacts/prd.md` | Full product requirements for MEDΩ |
| Architecture design | `_bmad-output/planning-artifacts/architecture.md` | Original system design |
| Epics | `_bmad-output/planning-artifacts/epics.md` | Epic breakdown |
| Sprint status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | Current sprint tracker |
| Story guides | `_bmad-output/implementation-artifacts/` | Per-story implementation guides (1.1 – 4.2) |
