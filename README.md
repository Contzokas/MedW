<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/MED%CE%A9-AI%20Triage-2563eb?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMThhNiA2IDAgMSAwIDAtMTIgNiA2IDAgMCAwIDAgMTJaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0xMiA0djE2TTQgMTJoMTYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==">
  <img alt="MEDΩ" src="https://img.shields.io/badge/MED%CE%A9-AI%20Triage-2563eb?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMThhNiA2IDAgMSAwIDAtMTIgNiA2IDAgMCAwIDAgMTJaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0xMiA0djE2TTQgMTJoMTYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==">
</picture>

### AI-Powered Medical Triage for the Greek National Health System

<p>
  <a href="https://github.com/Contzokas/MedW/actions/workflows/deploy.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/Contzokas/MedW/deploy.yml?branch=main&label=CI%2FCD&style=flat-square" alt="CI/CD">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square" alt="License">
  </a>
  <img src="https://img.shields.io/badge/python-3.11-3776ab?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/NVIDIA-B200-76b900?style=flat-square&logo=nvidia" alt="NVIDIA B200">
  <img src="https://img.shields.io/badge/GDPR-compliant-22c55e?style=flat-square" alt="GDPR">
</p>

<p>
  <img src="https://img.shields.io/badge/Nemotron-120B-76b900?style=flat-square&logo=nvidia" alt="Nemotron 120B">
  <img src="https://img.shields.io/badge/Milvus-Vector%20DB-00b4d8?style=flat-square" alt="Milvus">
  <img src="https://img.shields.io/badge/Run%3Aai-K8s%20Scheduler-ff6b35?style=flat-square" alt="Run:ai">
  <img src="https://img.shields.io/badge/FastAPI-async%20SSE-009688?style=flat-square&logo=fastapi" alt="FastAPI">
</p>

> **Kiefer AI Open Hackathon 2026** — Built in 24 hours. Deployed on NVIDIA B200 GPUs via Run:ai.  
> Solving Greece's ~7 million annual misdirected appointments.

</div>

---

## Table of Contents

- [The Problem](#the-problem)
- [What MEDΩ Does](#what-med-does)
- [Feature Highlights](#feature-highlights)
- [Architecture](#architecture)
  - [AI Pipeline](#ai-pipeline--two-deployments-one-codebase)
  - [Triage Pipeline Flow](#triage-pipeline-flow)
  - [4-Tier Fallback Chain](#4-tier-fallback-chain)
- [Infrastructure & CI/CD](#infrastructure--cicd)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Testing & Benchmarking](#testing--benchmarking)
- [Team](#team)
- [License](#license)

---

## The Problem

> [!IMPORTANT]
> Every year, **~7 million outpatient appointments** in the Greek NHS (ΕΣΥ) are directed to the wrong medical specialty — because patients self-refer without clinical guidance.

This clogs emergency departments, inflates wait times, and delays critical care for patients who actually need it.

**MEDΩ** replaces the guesswork with AI triage. Patients describe symptoms in natural Greek and receive an instant, clinically-informed urgency classification — before they ever leave home.

---

## What MEDΩ Does

<p align="center">
  <img src="presenting/patient-triage-form.png" alt="Patient triage form" width="48%">
  &nbsp;
  <img src="presenting/triage-result-mts-doctor.png" alt="Triage result with MTS level and doctor match" width="48%">
</p>

| Step | What Happens |
|:----:|-------------|
| **1** | Patient describes symptoms in **Greek or English** via a clean, accessible web interface |
| **2** | AI pipeline classifies urgency using the **Manchester Triage System (MTS 1–5)**, augmented with RAG retrieval from clinical guidelines |
| **3** | **Doctor is instantly matched** — right specialty, availability-checked, with a direct link to `finddoctors.gov.gr` |
| **4** | **Nurses see it live** via a real-time SSE dashboard — no polling, no refresh |

<p align="center">
  <img src="presenting/nurse-dashboard-sse-queue.png" alt="Nurse dashboard SSE queue" width="48%">
  &nbsp;
  <img src="presenting/management-page.png" alt="Management dashboard" width="48%">
</p>

---

## Feature Highlights

<p align="center">
  <img src="presenting/symptom-wizard-guided.png" alt="Symptom wizard" width="31%">
  &nbsp;
  <img src="presenting/profiler-modal.png" alt="Patient profiler" width="31%">
  &nbsp;
  <img src="presenting/doctors-page.png" alt="Doctors page" width="31%">
</p>

| Feature | Description |
|---------|-------------|
| 🧭 **Symptom Wizard** | Guided step-by-step mode — body area → symptoms → severity → duration — for patients who need help articulating symptoms |
| 🔄 **Follow-Up Questions** | Confidence-gated loop: when symptoms are vague, the LLM asks clarifying questions before committing to a triage decision |
| 👤 **Patient Profiler** | Optional medical history (age, conditions, medications, allergies) stored only in the browser and injected into the LLM prompt |
| 📍 **Geolocation** | Finds the nearest available doctor by real distance (Haversine formula) |
| ⚠️ **Uncertain Result Fallback** | When the AI cannot reliably classify, it honestly admits uncertainty — no false confidence |
| 🌐 **Bilingual Everything** | Full Greek & English UI with proper Greek casing, translations, and locale-aware formatting |

---

## Architecture

<p align="center">
  <img src="presenting/system-architecture-overview.png" alt="System architecture overview" width="100%">
</p>

### AI Pipeline — Two Deployments, One Codebase

<table>
<tr>
<td width="50%" valign="top">

#### 🖥️ Local Dev (Docker Compose)

```
Patient → Next.js 16 → FastAPI
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              Ollama          ChromaDB
           (medgemma:27b)   (RAG retrieval)
```

- On-premise, no internet needed
- CPU fallback: ~60–120s per request
- `docker compose up --build`

</td>
<td width="50%" valign="top">

#### ☁️ Production (Run:ai + K8s)

```
Patient → Next.js 16 → FastAPI
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
       NIM LLM         NIM Embed       Reranker
   (Nemotron 120B)  (nv-embedqa)   (cross-encoder)
   GPU 1+2 (2×B200)  GPU 3 (B200)      CPU
                           │
                           ▼
                      Milvus Lite
```

- NVIDIA NIM microservices
- 3× B200 GPUs via Run:ai scheduler
- GHCR → CI/CD auto-deploy

</td>
</tr>
</table>

### Stack Deep-Dive

| Layer | Technology | Why |
|-------|-----------|-----|
| **LLM** | NVIDIA Nemotron-3-Super 120B *(prod)* · medgemma:27b *(local)* | 120B params, tensor-parallel across 2× B200; medgemma for CPU-friendly local dev |
| **Embeddings** | nv-embedqa-e5-v5 (NIM) · all-MiniLM-L6-v2 (local) | 512-token context; encodes Greek symptoms after translation |
| **Vector DB** | Milvus Lite *(prod)* · ChromaDB 1.5.7 *(local)* | Embedded in the backend process — no separate service needed |
| **Reranker** | NVIDIA nv-rerankqa cross-encoder | Reranks top-9 retrieved chunks → top-3 most relevant before prompt assembly |
| **Backend** | Python 3.11 · FastAPI · LangChain 1.2 | Async SSE streaming, Pydantic validation, multi-level fallback chain |
| **Frontend** | Next.js 16 · React 19 · TypeScript 5 · Tailwind v4 | App Router, Turbopack, client-side contexts, CSS animations |
| **Infrastructure** | Docker Compose · GitHub Actions · Run:ai REST API · GHCR | CI/CD from push to live in <15 min; GPU scheduling via Run:ai |

### Triage Pipeline Flow

```
POST /api/v1/triage { symptoms, lang, patient_profile?, lat?, lon? }
         │
         ├─[1]─► Symptom keyword pre-filter
         │         Too vague? → RedirectToWizardResponse
         │
         ├─[2]─► RAG retrieval  (Milvus/ChromaDB → top-9 → rerank → top-3)
         │         Fail? → proceed with LLM base knowledge  (rag_used=false)
         │
         ├─[3]─► LLM classification  (Nemotron 120B or medgemma:27b)
         │         Greek → translate → classify → translate back
         │         Fail? → safe default  (MTS 3, General Practice)
         │
         ├─[4]─► Doctor matching  (specialty → availability → geolocation sort)
         │         No specialist available? → GP fallback with note
         │
         ├─[5]─► Confidence check
         │         Uncertain + under max rounds? → FollowUpResponse
         │         Uncertain + max rounds?       → UncertainResultResponse
         │
         └─[6]─► Push to SSE queue → nurses see it instantly
```

### 4-Tier Fallback Chain

| Tier | Trigger | Response |
|:----:|---------|----------|
| **1** | Normal operation | Full AI triage — RAG + LLM + doctor match |
| **2** | RAG unavailable | LLM classification with base knowledge only (`rag_used: false`) |
| **3** | LLM parse error | Safe default: MTS 3 "Urgent", General Practice, with explanatory note |
| **4** | Total failure | GP fallback — always returns a usable result, never an error page |

---

## Infrastructure & CI/CD

<p align="center">
  <img src="presenting/runai-cluster-deploy.png" alt="Run:ai cluster deployment" width="48%">
  &nbsp;
  <img src="presenting/runai-gpu-workloads.png" alt="Run:ai GPU workloads" width="48%">
</p>

### GitHub Actions Pipeline

```
git push → [main|dev] → .github/workflows/deploy.yml
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              build-      build-    build-
              reranker    backend   frontend
                    │         │         │
                    └─────────┼─────────┘
                              ▼
                         push to GHCR
                    (ghcr.io/contzokas/*)
                              │
                              ▼
                        deploy (Run:ai)
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              medw-nim   medw-backend  medw-frontend
             (GPU 1+2)     (CPU)          (CPU)
              medw-nim-embed  medw-nim-reranker
                (GPU 3)           (CPU)
```

### Cluster Architecture — Run:ai · NVIDIA B200

| Workload | GPU | CPU | Memory | Image |
|----------|:---:|:---:|:------:|-------|
| **NIM LLM** `medw-nim` | 2× B200 | 24 cores | 96 GB | `nvcr.io/nim/nvidia/nemotron-3-super-120b-a12b` |
| **NIM Embed** `medw-nim-embed` | 1× B200 | 4 cores | 8 GB | `nvcr.io/nim/nvidia/nv-embedqa-e5-v5` |
| **Reranker** `medw-nim-reranker` | — | 2 cores | 2 GB | `ghcr.io/contzokas/medw-reranker` |
| **Backend** `medw-backend` | — | 1 core | 1 GB | `ghcr.io/contzokas/medw-backend` |
| **Frontend** `medw-frontend` | — | 1 core | 512 MB | `ghcr.io/contzokas/medw-frontend` |

- **Total GPU footprint:** 3× NVIDIA B200 (Blackwell, 192 GB HBM3e each)
- **Deploy time:** ~15 minutes from push to live (includes model warmup)
- **Environment separation:** `main` → production · `dev` → development (isolated workloads)
- **Immutable tags:** Every deploy gets a sha-pinned tag (`latest-abc1234`) for easy rollback

---

## Quick Start

### Local — Docker Compose (medgemma:27b)

```bash
git clone https://github.com/Contzokas/MedW && cd MedW
cp .env.example .env
docker compose up --build
```

> [!NOTE]
> First run pulls the medgemma:27b model (~10 min). Subsequent starts are instant.

| Service | URL |
|---------|-----|
| Patient Triage | http://localhost:3000 |
| Nurse Dashboard | http://localhost:3000/dashboard |
| Management | http://localhost:3000/management |
| Doctors | http://localhost:3000/doctors |
| API Docs (Swagger) | http://localhost:8000/docs |

### Production Prerequisites

- NVIDIA GPU with CUDA 12.8+ (B200 requires `nvidia-container-toolkit`)
- Docker + Docker Compose v24+
- Run:ai cluster access (for K8s deployment)

---

## API Reference

| Method | Endpoint | Description |
|:------:|----------|-------------|
| `POST` | `/api/v1/triage` | Submit symptoms → MTS classification + doctor match |
| `GET` | `/api/v1/doctors` | List doctors (optional `?specialty=` filter) |
| `GET` | `/api/v1/triage/queue` | SSE stream — real-time nurse dashboard |
| `GET` | `/api/v1/triage/history/{patient_id}` | Patient triage history |
| `GET` | `/api/v1/health` | Liveness probe |
| `GET` | `/api/v1/health/warmup` | LLM warmup status + readiness |
| `GET` | `/api/v1/rag/debug/*` | RAG pipeline introspection *(dev only, gated behind `RAG_DEBUG_ENABLED`)* |

<details>
<summary><strong>Example Request & Response</strong></summary>

**Request**

```json
POST /api/v1/triage
{
  "symptoms": "Έχω έντονο πόνο στο στήθος και δυσκολεύομαι να αναπνεύσω",
  "patient_id": "patient-001",
  "lang": "el",
  "patient_profile": "Age: 34\nBiological sex: Male\nChronic conditions: Asthma",
  "latitude": 37.9838,
  "longitude": 23.7275
}
```

**Response — MTS Level 1 (Emergency)**

```json
{
  "mts_level": 1,
  "mts_label": "Άμεση Αντιμετώπιση",
  "specialty": "Καρδιολογία",
  "doctor": {
    "name": "Δρ. Ελένη Παπαδοπούλου",
    "specialty": "Καρδιολογία",
    "availability": true,
    "distance_km": "1.2"
  },
  "reasoning": "Severe chest pain with respiratory distress indicates a potential cardiac emergency...",
  "redirect_url": "https://finddoctors.gov.gr/search?specialty=Καρδιολογία",
  "rag_used": true
}
```

</details>

---

## Testing & Benchmarking

```bash
# Unit tests
cd backend && pip install -r requirements.txt && pytest

# With coverage report
pytest --cov=app --cov-report=term-missing

# Latency benchmark (11 test cases × N runs)
python scripts/benchmark_latency.py --url http://localhost:8000 --runs 5 --csv results.csv

# Accuracy evaluation (against labeled ground truth)
python test_triage_baseline.py
```

---

## Team

Built with ☕ and γύρος by:

| Member | Role |
|--------|------|
| **Athanasios Neofytos** | AI Engineer |
| **Constantinos Tzokas** | Infrastructure & DevOps |
| **Dimitris Dimitriadis** | Backend Developer |
| **Dimitris Papamargaritis** | Data Engineer |
| **Orestis Bushpreni** | Frontend Developer |
| **Sotiris Papadopoulos** | Data Scientist |
| **Stella Alousi** | UX/UI Designer & Project Manager |

---

## License

Apache 2.0 — see [LICENSE](LICENSE)

---

<div align="center">
  <sub>Built for the <strong>Kiefer AI Open Hackathon 2026</strong> · Athens, Greece 🇬🇷</sub>
</div>
