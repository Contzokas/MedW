# Project Overview — MedW (MEDΩ)

> Generated: 2026-04-18 | Scan: Exhaustive

---

## What is MEDΩ?

**MEDΩ** is an AI-powered medical triage assistant for the Greek National Health System (ΕΣΥ). Patients describe their symptoms in Greek and receive an instant Manchester Triage System (MTS) classification (levels 1–5), a recommended medical specialty, and a matched doctor recommendation. Nurses monitor incoming triage submissions in real time via a live dashboard.

**Context:** Developed for the Kiefer AI Open Hackathon 2026 (Demo deadline: 21 April 2026 | Prize: €10,000).

**Problem it solves:** ~7 million annual Greek NHS appointments where patients present to the wrong specialty due to lack of clinical guidance — MEDΩ routes patients to the right physician before they arrive.

---

## Architecture Type

**Multi-part application** — 3 logical parts:

| Part | Type | Root | Exposed at |
|---|---|---|---|
| `backend` | FastAPI REST + SSE API | `backend/` | `:8000` |
| `frontend` | Next.js UI | `frontend/` | `:3000` |
| `ai-pipeline` | Ollama + ChromaDB RAG | Docker services | internal only |

---

## Technology Stack Summary

### Backend
| | |
|---|---|
| Language | Python 3.11 |
| Framework | FastAPI + Uvicorn |
| Data validation | Pydantic |
| LLM integration | LangChain 1.2.15 |
| Testing | pytest + pytest-asyncio |

### Frontend
| | |
|---|---|
| Language | TypeScript 5 |
| Framework | Next.js 16.2.4 |
| UI | React 19.2.4 |
| Styling | Tailwind CSS v4 |

### AI Pipeline
| | |
|---|---|
| LLM | Mistral-7B via Ollama |
| Vector store | ChromaDB 1.5.7 |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| RAG corpus | 2 Markdown documents (MTS guidelines + specialty reference) |

### Infrastructure
| | |
|---|---|
| Containerization | Docker Compose (4 services) |
| Networks | `medw-internal` (isolated AI services) + `medw-external` (public) |
| GPU | NVIDIA (optional; CPU fallback available) |

---

## Key Design Decisions

1. **On-premise inference only** — GDPR Article 9 compliance: patient data never leaves the host. Ollama runs Mistral-7B locally.

2. **Fail-safe triage pipeline** — Three-level fallback chain: RAG+LLM → LLM base knowledge → hardcoded safe default (MTS 3, GP referral). The triage endpoint always returns a usable response.

3. **SSE over polling** — Nurse dashboard uses Server-Sent Events (`GET /api/v1/triage/queue`) for real-time updates. The backend maintains an in-memory `asyncio.Event`-signalled deque.

4. **Mistral-7B over BioMistral-7B** — Migration decision (documented in PRD): Mistral-7B produces more consistent JSON output and fewer triage inconsistencies than BioMistral-7B.

5. **Greek-first UI** — All patient-facing and nurse-facing UI is in Greek, with proper locale (`lang="el"`, `toLocaleTimeString("el-GR")`).

6. **Static doctor dataset** — Doctors are loaded from `data/doctors.json` (20 doctors, 15 specialties). Specialty matching is done in-memory with a GP fallback.

---

## User Roles

| Role | Interface | Workflow |
|---|---|---|
| Patient | `/` (web browser) | Describe symptoms in Greek → receive MTS level, specialist recommendation, and doctor |
| Nurse | `/dashboard` (web browser) | Monitor incoming triage submissions in real time |

---

## Performance Targets (from PRD)

| Metric | Target |
|---|---|
| MTS classification accuracy | ≥ 80% on test dataset |
| Triage response time | < 10 s (GPU, pre-warmed) |
| Dashboard update latency | < 2 s |
| Frontend initial load | < 3 s |
| Demo uptime | 100% during live presentation |

---

## Getting Started

See [development-guide.md](./development-guide.md) for full setup instructions.

**Quickstart:**
```bash
cp .env.example .env
docker compose up --build
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API docs: http://localhost:8000/docs
```
