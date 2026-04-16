# MEDΩ — BMAD Project Prompt

## Project Brief

You are the BMAD Analyst agent for **MEDΩ**, an AI-powered medical triage assistant for the Greek National Health System (ΕΣΥ), built for the Kiefer AI Open Hackathon 2026 (27–30 April 2026).

## Core Problem

Greek public hospitals (ΕΣΥ) handle ~7 million appointments annually. Patients do not know which medical specialty they need, leading to wrong triage, overcrowded emergency departments, and wasted resources.

## Solution

MEDΩ allows patients to describe symptoms in Greek and receive an instant triage classification (Manchester Triage System, levels 1–5), a recommended medical specialty, and a direct redirect to finddoctors.gov.gr for appointment booking. Nurses can monitor and confirm triage via a live dashboard.

## Constraints

- All inference must run **on-premise** (GDPR Article 9 — medical data)
- No fine-tuning — prompt engineering + RAG only
- Must be deployable on NVIDIA B200 GPUs (Kiefer infrastructure)
- Must be demo-ready by **21 April 2026** (Day 0 virtual session)
- Team has no prior AI experience — keep complexity manageable

## Tech Stack (fixed)

- **LLM:** BioMistral-7B via Ollama
- **RAG:** LangChain + ChromaDB
- **Backend:** Python 3.11 + FastAPI
- **Frontend:** Next.js + React
- **Data:** Synthea (synthetic) + MIMIC-IV (anonymized)
- **Infrastructure:** Docker + NVIDIA CUDA + BMAD Method
- **License:** Apache 2.0

## Team Roles

- **Constantinos** — Tech Lead, AI Engineer (FastAPI, LLMs, RAG)
- **Dimitrios** — Full-stack, Backend (Python, React)
- **Dimitris** — ML Engineer (neural networks, AI pipeline)
- **Orestis** — Infrastructure, Docker, deployment
- **Sotiris** — Data, prompt engineering, evaluation
- **Stella** — Medical expert, documentation, proposal (pathology clinic experience)
- **Athanasios** — Frontend, UI components

## Deliverables

1. Working MVP (patient triage flow + nurse dashboard)
2. Proposal document (required for €10,000 1st prize)
3. GitHub repo (public, documented)
4. Presentation slides + live demo

## BMAD Instructions

Please proceed with the following agents in order:

1. **Analyst** — Confirm requirements, identify risks, finalize scope
2. **Architect** — Define system architecture, component breakdown, API contracts
3. **Scrum Master** — Break down into user stories for each team member
4. **Developer** — Implement story by story, starting with: Ollama + BioMistral setup → FastAPI /triage endpoint → Next.js form → end-to-end integration
5. **QA** — Validate triage accuracy against Manchester Triage System ground truth

Start with the **Analyst** agent now.