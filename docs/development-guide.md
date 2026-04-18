# Development Guide — MedW

> Generated: 2026-04-18 | Scan: Exhaustive

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Docker + Docker Compose | v24+ | Full stack orchestration |
| Python | 3.11+ | Backend development |
| Node.js | 20+ | Frontend development |
| NVIDIA GPU + drivers | (optional) | Ollama GPU acceleration |

---

## Quickstart (Docker — Recommended)

```bash
# 1. Clone the repository
git clone <repo-url> && cd MedW

# 2. Copy env template and fill in values
cp .env.example .env

# 3. Start all services
docker compose up --build

# Services will be available at:
#   Frontend:  http://localhost:3000
#   Backend:   http://localhost:8000
#   API docs:  http://localhost:8000/docs   (FastAPI Swagger UI)
```

> **Note:** On first run, Ollama will pull the Mistral-7B model (~4 GB). Allow up to 10 minutes.
> Subsequent starts use the cached model from the `ollama_data` Docker volume.

---

## Backend — Local Development

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables (point to running Docker services or local equivalents)
export OLLAMA_HOST=http://localhost:11434
export CHROMA_HOST=localhost
export CHROMA_PORT=8000

# Run the development server (auto-reload)
uvicorn main:app --reload --port 8000
```

### Running Backend Tests

```bash
cd backend

# Run full test suite
pytest

# Run with coverage report
pytest --cov=app --cov-report=term-missing

# Run a specific test file
pytest tests/test_triage_router.py -v

# Run a specific test
pytest tests/test_triage_router.py::test_triage_post_returns_200_with_all_fields -v
```

> Tests use `pytest-asyncio` with `asyncio_mode = auto` (configured in `pytest.ini`).
> Router tests mock `triage_service.classify` to avoid real LLM/RAG calls.
> SSE queue tests (`test_sse_queue.py`) test the in-memory queue and SSE generator directly.

---

## Frontend — Local Development

```bash
cd frontend

# Install dependencies
npm install

# Copy env file (points API calls to local backend)
cp .env.local .env.local   # already present; edit NEXT_PUBLIC_API_URL if needed

# Start dev server (hot reload)
npm run dev
# Available at http://localhost:3000
```

### Frontend Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |

### Build and Type Check

```bash
cd frontend

# Production build
npm run build

# Lint
npm run lint
```

---

## Environment Variables Reference

| Variable | Default | Part | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | frontend | Backend API URL (baked in at build time) |
| `OLLAMA_HOST` | `http://ollama:11434` | backend | Ollama service URL |
| `OLLAMA_MODEL` | `mistral:7b` | backend + ollama | Model to load and use |
| `OLLAMA_TIMEOUT` | `30` | backend | LLM inference timeout (seconds) |
| `CHROMA_HOST` | `chromadb` | backend | ChromaDB service hostname |
| `CHROMA_PORT` | `8000` | backend | ChromaDB service port |
| `QUEUE_MAX_ENTRIES` | `1000` | backend | Max SSE queue size (bounded deque) |

---

## Common Development Tasks

### Add a new API endpoint

1. Create or edit a router in `backend/app/routers/`
2. Add Pydantic schemas in `backend/app/schemas/` if new request/response shapes are needed
3. Implement business logic in `backend/app/services/`
4. Register the router in `backend/main.py` with `app.include_router(..., prefix="/api/v1")`
5. Mirror new TypeScript types in `frontend/app/lib/types.ts`
6. Write tests in `backend/tests/`

### Add a new frontend page

1. Create `frontend/app/<route>/page.tsx` (Next.js App Router)
2. Add client components in `frontend/app/<route>/components/` if needed
3. Add shared UI components in `frontend/app/components/` if reusable

### Update the RAG corpus

1. Add or edit `.md` files in `backend/data/corpus/`
2. Delete the `chroma_data` Docker volume to force re-seeding: `docker volume rm medw_chroma_data`
3. Restart: `docker compose up`

### Change the LLM model

1. Update `OLLAMA_MODEL` in `.env` (e.g. `biomistral:7b`)
2. Ollama will pull the new model on startup
3. Update the `OLLAMA_MODEL` default in `docker-compose.yml` if needed

---

## API Interactive Docs

FastAPI auto-generates interactive API documentation at runtime:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
