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
  + LLM classification (Mistral-7B via Ollama)
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
| AI/LLM | Mistral-7B · Ollama · LangChain |
| RAG | ChromaDB 1.5.7 · sentence-transformers |
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 |
| Infrastructure | Docker Compose · NVIDIA GPU (optional) |

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

> **First run:** Ollama pulls the Mistral-7B model (~4 GB). Allow up to 10 minutes.
> Subsequent starts use the cached model.

### Prerequisites

- Docker + Docker Compose v24+
- NVIDIA GPU + drivers + `nvidia-container-toolkit` *(optional — CPU fallback available, ~60–120 s/request)*

---

## Features

- **Greek symptom input** — patients describe symptoms naturally in Greek
- **MTS triage** — AI classifies urgency across 5 levels (Immediate → Non-urgent)
- **RAG-augmented** — clinical guidelines retrieved from ChromaDB to improve accuracy
- **Doctor matching** — recommends an available doctor by specialty; falls back to GP
- **Fail-safe pipeline** — always returns a usable response, even if AI services fail
- **Real-time nurse dashboard** — Server-Sent Events stream, no polling
- **On-premise inference** — GDPR-compliant, zero external API calls for patient data

---

## Project Structure

```
MedW/
├── backend/              # FastAPI backend + AI services
│   ├── app/
│   │   ├── routers/      # HTTP endpoints
│   │   ├── services/     # Triage, LLM, RAG, doctor matching
│   │   ├── schemas/      # Pydantic data models
│   │   └── core/         # Config, SSE queue
│   ├── data/
│   │   ├── doctors.json  # Doctor dataset (20 doctors, 15 specialties)
│   │   └── corpus/       # RAG knowledge base (MTS guidelines + specialties)
│   └── tests/            # pytest test suite (46 tests)
├── frontend/             # Next.js UI
│   └── app/
│       ├── page.tsx          # Patient triage page (/)
│       ├── dashboard/        # Nurse dashboard (/dashboard)
│       ├── components/       # TriageForm, TriageResult, DoctorCard, Disclaimer
│       └── lib/              # API client, types, SSE hook
├── docker/
│   └── ollama-entrypoint.sh  # Model pull on first run
├── docker-compose.yml
└── .env.example
```

---

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Liveness probe |
| `POST` | `/api/v1/triage` | Submit symptoms → MTS result |
| `GET` | `/api/v1/doctors` | List doctors (optional `?specialty=`) |
| `GET` | `/api/v1/triage/queue` | SSE stream for nurse dashboard |

Full API documentation: [docs/api-contracts-backend.md](docs/api-contracts-backend.md) or http://localhost:8000/docs when running.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL (baked into frontend at build time) |
| `OLLAMA_MODEL` | `mistral:7b` | Ollama model to use |
| `OLLAMA_HOST` | `http://ollama:11434` | Ollama service URL |
| `OLLAMA_TIMEOUT` | `30` | LLM inference timeout (seconds) |
| `CHROMA_HOST` | `chromadb` | ChromaDB host |
| `CHROMA_PORT` | `8000` | ChromaDB port |
| `QUEUE_MAX_ENTRIES` | `1000` | Max SSE queue size |

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest                           # Run all 46 tests
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

## License

Apache 2.0
