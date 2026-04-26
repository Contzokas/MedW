# Project Overview — MedW (MEDΩ)

> Generated: 2026-04-26 | Scan: Exhaustive

---

## Purpose

MEDΩ is an AI-powered medical triage assistant for the Greek National Health System (ΕΣΥ). Patients describe symptoms in Greek and receive an instant Manchester Triage System (MTS) classification, a recommended medical specialty, and a matched doctor. Nurses monitor submissions in real time via a live dashboard.

Built for the **Kiefer AI Open Hackathon 2026**. All inference runs on-premise — patient data never leaves the host (GDPR Article 9).

---

## Tech Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Backend API | Python, FastAPI, Uvicorn, Pydantic | 3.11, latest |
| AI/LLM | Ollama (medgemma:27b), LangChain | latest, 1.2.15 |
| RAG | ChromaDB, sentence-transformers | 1.5.7, all-MiniLM-L6-v2 |
| Frontend | Next.js, React, TypeScript, Tailwind CSS | 16.2.4, 19.2.4, 5, v4 |
| Infrastructure | Docker Compose, Kubernetes (Kustomize) | — |
| GPU Platform | NVIDIA B200 (Blackwell) via Run:ai | — |

---

## Architecture Type

Multi-part application with service-oriented communication:

```
Patient (Browser) ──► Frontend (Next.js) ──proxy──► Backend (FastAPI)
                                                    ├──► ChromaDB (RAG)
                                                    └──► Ollama (LLM)
Nurse (Browser) ────► Frontend /dashboard ──SSE────► Backend queue
```

---

## Repository Structure

**Type:** Multi-part (3 parts)

| Part | Root | Language | Type |
|---|---|---|---|
| `backend` | `backend/` | Python | FastAPI REST + SSE API |
| `frontend` | `frontend/` | TypeScript | Next.js 16 web app |
| `ai-pipeline` | Docker services | — | Ollama + ChromaDB |

---

## User Roles

- **Patient:** Describes symptoms in Greek/English, receives MTS classification + doctor recommendation
- **Nurse:** Monitors real-time triage queue via SSE dashboard at `/dashboard`

---

## Key Design Decisions

- **On-premise inference** — GDPR compliance, no external API calls for patient data
- **RAG augmentation** — Clinical guidelines retrieved from ChromaDB to improve triage accuracy
- **Fail-safe pipeline** — Always returns a usable response: RAG → LLM → Safe default → GP fallback
- **Runtime proxy** — Backend URL resolved at runtime via `/api/config` (not baked at build time)
- **Bilingual support** — Greek (primary) and English with proper casing/localization
