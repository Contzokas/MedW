# Development Guide — MedW

> Generated: 2026-04-26 | Scan: Exhaustive

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Docker + Docker Compose | v24+ | Required for local stack |
| NVIDIA GPU + drivers | — | Optional; CPU fallback works (~60-120s/request) |
| nvidia-container-toolkit | — | For GPU passthrough to Docker |
| Node.js | 20+ | Frontend development |
| Python | 3.11 | Backend development |
| kubectl | — | K8s deployment only |
| Run:ai CLI | v2 | Run:ai deployment only |

---

## Local Development Setup

```bash
# 1. Clone and configure
git clone <repo-url> && cd MedW
cp .env.example .env

# 2. Start full stack
docker compose up --build

# 3. Access
# Patient:    http://localhost:3000
# Dashboard:  http://localhost:3000/dashboard
# API docs:   http://localhost:8000/docs
```

First run pulls the Ollama model (~4-27 GB depending on model). Allow up to 10 minutes.

---

## Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Development server (port 3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint
```

**Key files for changes:**
- Components: `app/components/`
- Pages: `app/page.tsx`, `app/dashboard/page.tsx`
- API client: `app/lib/api.ts`
- Types: `app/lib/types.ts`
- Translations: `app/lib/translations.ts`
- Styling: `app/globals.css`

---

## Backend Development

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run server (port 8000)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Run tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=term-missing
```

**Key files for changes:**
- Endpoints: `app/routers/`
- Business logic: `app/services/`
- Data models: `app/schemas/`
- Config: `app/core/config.py`
- Doctor data: `data/doctors.json`
- RAG corpus: `data/corpus/`

---

## Running Tests

```bash
cd backend

# All tests
pytest

# Specific test file
pytest tests/test_triage_service.py

# With verbose output
pytest -v

# With coverage
pytest --cov=app --cov-report=term-missing
```

| Test Suite | Tests | Coverage |
|---|---|---|
| Triage router | API contract | Request/response validation |
| Triage service | Orchestration | Fallback chains, error handling |
| RAG service | Vector retrieval | In-memory ChromaDB |
| RAG debug | Debug pipeline | Trace management, statistics |
| Doctor service | Data matching | Specialty filter, GP fallback |
| SSE queue | Streaming | Event signaling, connection handling |

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Default | Description |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8000` | Backend URL for frontend proxy |
| `OLLAMA_HOST` | `http://ollama:11434` | Ollama service URL |
| `OLLAMA_MODEL` | `medgemma:27b` | LLM model |
| `OLLAMA_TIMEOUT` | `30` | LLM inference timeout (seconds) |
| `CHROMA_HOST` | `chromadb` | ChromaDB host |
| `CHROMA_PORT` | `8000` | ChromaDB port |
| `QUEUE_MAX_ENTRIES` | `1000` | Max SSE queue size |
| `RAG_DEBUG_ENABLED` | `false` | Enable debug endpoints (dev only!) |

---

## Common Development Tasks

### Add a new API endpoint
1. Create handler in `backend/app/routers/`
2. Create Pydantic schema in `backend/app/schemas/` (if needed)
3. Register router in `backend/main.py`
4. Add TypeScript types in `frontend/app/lib/types.ts`
5. Add API call in `frontend/app/lib/api.ts`

### Add a new UI component
1. Create component in `frontend/app/components/`
2. Add translations in `frontend/app/lib/translations.ts`
3. Import and use in the appropriate page

### Update RAG corpus
1. Edit files in `backend/data/corpus/`
2. Restart backend (auto-seeds on startup if collection is empty)
3. To force re-seed: call `POST /api/v1/rag/debug/reseed` (requires `RAG_DEBUG_ENABLED=true`)

### Run baseline accuracy test
```bash
python test_triage_baseline.py
```
Sends 50 synthetic symptom descriptions to the triage API and compares predicted vs expected MTS levels.
