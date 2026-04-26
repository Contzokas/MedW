# MEDΩ — AI-Powered Medical Triage Assistant

**MEDΩ** is an AI triage assistant for the Greek National Health System (ΕΣΥ). Patients describe symptoms in Greek and receive an instant [Manchester Triage System](https://en.wikipedia.org/wiki/Manchester_triage_system) (MTS) classification, a recommended medical specialty, and a matched doctor. Nurses monitor submissions in real time via a live dashboard.

Built for the **Kiefer AI Open Hackathon 2026**.

---

## How It Works

```
Patient describes symptoms (Greek)
         │
         ▼
  RAG retrieval (ChromaDB)
  + LLM classification (medgemma:27b via Ollama)
         │
         ▼
  MTS level (1–5) + Specialty + Doctor match
         │
         ├──► Patient sees result + finddoctors.gov.gr link
         └──► Nurse dashboard updates in real time (SSE)
```

All inference runs **on-premise** — patient data never leaves the host (GDPR Article 9).

---

## Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.11 · FastAPI · Pydantic |
| AI/LLM | medgemma:27b · Ollama · LangChain 1.2.15 |
| RAG | ChromaDB 1.5.7 · sentence-transformers (all-MiniLM-L6-v2) |
| Frontend | Next.js 16.2.4 · React 19.2.4 · TypeScript 5 · Tailwind CSS v4 |
| Infrastructure | Docker Compose · NVIDIA GPU (optional) · Kubernetes (Run:ai) |

---

## Quickstart

```bash
# 1. Clone
git clone <repo-url> && cd MedW

# 2. Configure
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# 3. Start
docker compose up --build
```

| Service | URL |
|---|---|
| Patient triage | http://localhost:3000 |
| Nurse dashboard | http://localhost:3000/dashboard |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

> **First run:** Ollama pulls the medgemma:27b model. Allow up to 10 minutes.
> Subsequent starts use the cached model.

### Prerequisites

- Docker + Docker Compose v24+
- NVIDIA GPU + drivers + `nvidia-container-toolkit` *(optional — CPU fallback available, ~60–120 s/request)*

---

## Features

- **Greek symptom input** — patients describe symptoms naturally in Greek (English also supported)
- **MTS triage** — AI classifies urgency across 5 levels (Immediate → Non-urgent)
- **RAG-augmented** — clinical guidelines retrieved from ChromaDB to improve accuracy
- **Doctor matching** — recommends an available doctor by specialty; falls back to GP
- **Fail-safe pipeline** — always returns a usable response, even if AI services fail
- **Real-time nurse dashboard** — Server-Sent Events stream, no polling
- **On-premise inference** — GDPR-compliant, zero external API calls for patient data
- **RAG debug system** — 11 gated introspection endpoints for pipeline troubleshooting
- **Dark/light theme** — with system preference detection and persistence
- **Bilingual UI** — full English/Greek interface with proper Greek casing

---

## Project Structure

```
MedW/
├── backend/              # FastAPI backend + AI services
│   ├── app/
│   │   ├── routers/      # HTTP endpoints (health, doctors, triage, rag_debug)
│   │   ├── services/     # Triage, LLM, RAG, doctor matching
│   │   ├── schemas/      # Pydantic data models
│   │   └── core/         # Config, SSE queue
│   ├── data/
│   │   ├── doctors.json  # Doctor dataset (21 doctors, 12 specialties)
│   │   └── corpus/       # RAG knowledge base (MTS guidelines + specialties)
│   └── tests/            # pytest test suite
├── frontend/             # Next.js UI
│   └── app/
│       ├── page.tsx          # Patient triage page (/)
│       ├── dashboard/        # Nurse dashboard (/dashboard)
│       ├── components/       # TriageForm, TriageResult, DoctorCard, Disclaimer, etc.
│       ├── lib/              # API client, types, SSE hook, translations, contexts
│       └── api/              # Runtime config + backend proxy routes
├── docker/
│   └── ollama-entrypoint.sh  # Model pull on first run
├── k8s/                     # Kubernetes manifests (Run:ai cluster)
│   ├── kustomization.yaml
│   ├── ollama-deployment.yaml   # GPU: NVIDIA B200 via runai-scheduler
│   ├── chromadb-deployment.yaml
│   ├── backend-deployment.yaml
│   └── frontend-deployment.yaml
├── docker-compose.yml
└── .env.example
```

---

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Liveness probe |
| `GET` | `/api/v1/health/warmup` | Health check with LLM warmup status |
| `POST` | `/api/v1/triage` | Submit symptoms → MTS result |
| `GET` | `/api/v1/doctors` | List doctors (optional `?specialty=`) |
| `GET` | `/api/v1/triage/queue` | SSE stream for nurse dashboard |

Full API documentation: [docs/api-contracts-backend.md](docs/api-contracts-backend.md) or http://localhost:8000/docs when running.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8000` | Backend URL (used by frontend proxy) |
| `OLLAMA_MODEL` | `medgemma:27b` | Ollama model to use |
| `OLLAMA_HOST` | `http://ollama:11434` | Ollama service URL |
| `OLLAMA_TIMEOUT` | `30` | LLM inference timeout (seconds) |
| `CHROMA_HOST` | `chromadb` | ChromaDB host |
| `CHROMA_PORT` | `8000` | ChromaDB port |
| `QUEUE_MAX_ENTRIES` | `1000` | Max SSE queue size |
| `RAG_DEBUG_ENABLED` | `false` | Enable RAG debug endpoints (dev only) |

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest                           # Run all tests
pytest --cov=app --cov-report=term-missing   # With coverage
```

---

## Documentation

Full project documentation is in [`docs/`](docs/):

- [docs/index.md](docs/index.md) — Master index (start here)
- [docs/architecture-backend.md](docs/architecture-backend.md)
- [docs/architecture-frontend.md](docs/architecture-frontend.md)
- [docs/architecture-ai-pipeline.md](docs/architecture-ai-pipeline.md)
- [docs/integration-architecture.md](docs/integration-architecture.md)
- [docs/development-guide.md](docs/development-guide.md)
- [docs/deployment-guide.md](docs/deployment-guide.md)

---

## Run:ai Deployment (NVIDIA GPU — Kubernetes)

For production / cluster deployment on a Run:ai-managed Kubernetes cluster.

### Prerequisites

- `kubectl` configured against your cluster
- Run:ai project `medo` with ≥ 1 GPU quota
- Images pushed to GHCR (done automatically by CI on push to `main`)

### One-command deploy

```bash
kubectl apply -k k8s/
```

This creates the `runai-medo` namespace and deploys all four services in the correct order.

### Check status

```bash
kubectl get pods -n runai-medo -o wide
runai list workloads -p medo
kubectl logs -n runai-medo deployment/medw-ollama -f
```

### Access the app

```bash
# Frontend (patient triage + nurse dashboard)
kubectl port-forward -n runai-medo svc/frontend 3000:3000
# → http://localhost:3000

# Backend API / Swagger
kubectl port-forward -n runai-medo svc/backend 8000:8000
# → http://localhost:8000/docs
```

### CI/CD

Push to `main` automatically builds & pushes images to `ghcr.io/contzokas/medw-*` and
re-deploys the cluster.

| Secret | Value |
|---|---|
| `KUBECONFIG` | base64-encoded kubeconfig for the cluster |

---

## License

Apache 2.0
