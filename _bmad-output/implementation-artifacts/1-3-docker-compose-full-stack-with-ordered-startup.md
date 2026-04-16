# Story 1.3: Docker Compose Full Stack with Ordered Startup

Status: ready-for-dev

## Story

As an operator,
I want `docker compose up` to bring up all four services in dependency order with GPU support,
So that BioMistral is fully loaded in Ollama before the backend accepts traffic, eliminating cold-start risk during the live demo.

## Acceptance Criteria

1. **Given** the monorepo scaffold and FastAPI base from Stories 1.1–1.2
   **When** `docker compose up` is executed on target NVIDIA B200 hardware
   **Then** `docker/ollama-entrypoint.sh` starts the Ollama server, pulls `biomistral:7b`, and exits with code 0 only after the model is confirmed present via `ollama list | grep biomistral`

2. **And** the `ollama` service healthcheck passes before the `chromadb` service starts (`depends_on: ollama: condition: service_healthy`)

3. **And** the `chromadb` service healthcheck (HTTP 200 on `/api/v1/heartbeat`) passes before the `backend` service starts

4. **And** the `backend` service starts only after chromadb is healthy, and its health check (`GET /api/v1/health` returns HTTP 200) passes before `frontend` starts

5. **And** the `frontend` service starts only after the backend is healthy

6. **And** port bindings are: frontend on host `:3000`, backend on host `:8000`; ollama (`:11434`) and chromadb are bound to the Docker internal network only and not reachable from the host (NFR7)

7. **And** the `ollama` and `chromadb` services are on an internal Docker network with no host port exposure (NFR5, NFR20)

8. **And** the `ollama` service entry includes `deploy.resources.reservations.devices` with `driver: nvidia`, `count: all`, `capabilities: [gpu]`

9. **And** `frontend` and `backend` services each have a `Dockerfile` that builds successfully

10. **And** `.env.example` documents all required environment variables (`NEXT_PUBLIC_API_URL`, `OLLAMA_HOST`, `CHROMA_HOST`, `CHROMA_PORT`) with no real values (NFR8)

## Tasks / Subtasks

- [ ] Implement `docker/ollama-entrypoint.sh` (AC: #1)
  - [ ] Start `ollama serve` in background
  - [ ] Wait for the Ollama HTTP API to respond before pulling model
  - [ ] Pull `biomistral:7b` via `ollama pull biomistral:7b`
  - [ ] Confirm model present via `ollama list | grep biomistral`
  - [ ] `wait` on the background `ollama serve` process (keeps container alive)
  - [ ] Make script executable (`chmod +x docker/ollama-entrypoint.sh`)

- [ ] Complete `backend/Dockerfile` (AC: #9)
  - [ ] Base image: `python:3.11-slim`
  - [ ] Install `curl` for healthcheck support
  - [ ] Copy `requirements.txt` and `pip install --no-cache-dir`
  - [ ] Copy application source
  - [ ] Expose port `8000`
  - [ ] CMD: `uvicorn main:app --host 0.0.0.0 --port 8000`

- [ ] Create `frontend/Dockerfile` (AC: #9)
  - [ ] Base image: `node:20-alpine`
  - [ ] Copy `package*.json` and run `npm ci`
  - [ ] Copy source files
  - [ ] Accept `NEXT_PUBLIC_API_URL` as build ARG and set as ENV
  - [ ] Run `npm run build`
  - [ ] Expose port `3000`
  - [ ] CMD: `npm start`

- [ ] Replace `docker-compose.yml` with full 4-service orchestration (AC: #2–#8)
  - [ ] Define `medw-internal` network (internal: true) for ollama and chromadb
  - [ ] Define `medw-external` network for backend and frontend host exposure
  - [ ] Configure `ollama` service with custom entrypoint, GPU deploy config, healthcheck
  - [ ] Configure `chromadb` service — internal only, healthcheck on `/api/v1/heartbeat`
  - [ ] Configure `backend` service — host port `:8000`, both networks, healthcheck on `/api/v1/health`
  - [ ] Configure `frontend` service — host port `:3000`, external network, depends on backend healthy
  - [ ] Define named volumes: `ollama_data`, `chroma_data`

- [ ] Verify `.env.example` is complete (AC: #10)
  - [ ] Confirm `NEXT_PUBLIC_API_URL`, `OLLAMA_HOST`, `CHROMA_HOST`, `CHROMA_PORT` are present
  - [ ] No real values committed — placeholder comments only

- [ ] Smoke-test full stack (AC: all)
  - [ ] `docker compose build` succeeds for backend and frontend
  - [ ] `docker compose up` brings up all 4 services without errors
  - [ ] `curl http://localhost:8000/api/v1/health` returns `{"status": "ok"}`
  - [ ] Frontend at `http://localhost:3000` loads without error

## Dev Notes

### What Already Exists — MUST READ Before Implementing

**`docker/ollama-entrypoint.sh`** — placeholder only, 4 lines, needs complete implementation:
```bash
#!/bin/bash
# Ollama entrypoint — implemented in Story 1.3
# Will: start ollama server, pull biomistral:7b, signal readiness
echo "TODO: implement in Story 1.3"
```

**`backend/Dockerfile`** — placeholder, needs completion:
```dockerfile
# Backend Dockerfile — implemented in Story 1.3
FROM python:3.11-slim
WORKDIR /app
```

**`frontend/Dockerfile`** — does NOT exist yet. Create it.

**`docker-compose.yml`** — old skeleton with WRONG configuration. REPLACE entirely:
- Wrong: has an `ollama-init` sidecar approach (discard this pattern)
- Wrong: chromadb mapped to host port 8000 (must be internal only)
- Wrong: pulls `mistral` not `biomistral:7b`
- Wrong: only 2 services (no backend, no frontend)
- Wrong: no healthchecks, no startup ordering

**`.env.example`** — already complete, do NOT modify:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
OLLAMA_HOST=http://ollama:11434
CHROMA_HOST=chromadb
CHROMA_PORT=8001
```

### Required Implementation — `docker/ollama-entrypoint.sh`

```bash
#!/bin/bash
set -e

echo "Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama API to be ready..."
until ollama list 2>/dev/null; do
  sleep 2
done
echo "Ollama API ready."

echo "Pulling biomistral:7b model (this may take several minutes on first run)..."
ollama pull biomistral:7b

echo "Verifying biomistral:7b is present..."
until ollama list | grep -q biomistral; do
  echo "  biomistral:7b not confirmed yet, retrying..."
  sleep 5
done

echo "biomistral:7b loaded and ready."
wait $OLLAMA_PID
```

**IMPORTANT:** The script must `wait $OLLAMA_PID` at the end — this keeps the container running after model pull completes. Without `wait`, the container exits immediately after the pull.

**IMPORTANT:** Make the script executable before or as part of the docker-compose setup:
```bash
chmod +x docker/ollama-entrypoint.sh
```

The file must have `+x` permissions committed to git (`git update-index --chmod=+x docker/ollama-entrypoint.sh`) otherwise Docker COPY will not preserve it.

### Required Implementation — `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Why curl?** The Docker Compose healthcheck for the backend service uses `curl -f http://localhost:8000/api/v1/health`. The `python:3.11-slim` base image does NOT include curl, so it must be installed. Without it, the healthcheck fails and frontend never starts.

**Note on WORKDIR:** The uvicorn command runs from `/app` — this matches the existing `uvicorn main:app` invocation pattern from Story 1.2 (backend/ is the working directory).

### Required Implementation — `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**`NEXT_PUBLIC_API_URL` at build time:** Next.js bakes `NEXT_PUBLIC_*` variables into the static bundle at build time, not runtime. The ARG/ENV pattern injects the value during `docker compose build`. In docker-compose.yml, pass it via `build.args`.

**`.dockerignore` for frontend:** A `frontend/.dockerignore` should exclude `node_modules`, `.next`, `.env.local`. Check if it exists; if not, create it:
```
node_modules
.next
.env.local
*.env
```

### Required Implementation — `docker-compose.yml` (REPLACE ENTIRE FILE)

```yaml
name: medw

networks:
  medw-internal:
    # Internal network: ollama and chromadb are invisible from host (NFR5, NFR7, NFR20)
    internal: true
  medw-external:
    # External network: backend and frontend exposed to host

services:
  ollama:
    image: ollama/ollama:latest
    container_name: medw-ollama
    networks:
      - medw-internal
    volumes:
      - ollama_data:/root/.ollama
      - ./docker/ollama-entrypoint.sh:/entrypoint.sh:ro
    entrypoint: ["/bin/bash", "/entrypoint.sh"]
    healthcheck:
      test: ["CMD-SHELL", "ollama list | grep -q biomistral || exit 1"]
      interval: 30s
      timeout: 30s
      retries: 10
      start_period: 600s  # 10 min — model pull on first run can take time
    restart: unless-stopped
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  chromadb:
    image: chromadb/chroma:1.5.7
    container_name: medw-chromadb
    networks:
      - medw-internal
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
      - ANONYMIZED_TELEMETRY=FALSE
      - CHROMA_SERVER_HTTP_PORT=8001
    healthcheck:
      test: ["CMD-SHELL", "python3 -c \"import urllib.request; urllib.request.urlopen('http://localhost:8001/api/v1/heartbeat')\" || exit 1"]
      interval: 10s
      timeout: 10s
      retries: 5
      start_period: 30s
    depends_on:
      ollama:
        condition: service_healthy
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: medw-backend
    networks:
      - medw-internal
      - medw-external
    ports:
      - "8000:8000"
    environment:
      - OLLAMA_HOST=http://ollama:11434
      - CHROMA_HOST=chromadb
      - CHROMA_PORT=8001
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 60s
    depends_on:
      chromadb:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000}
    container_name: medw-frontend
    networks:
      - medw-external
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  ollama_data:
  chroma_data:
```

### Critical Architecture Decisions

**Network Isolation — Two Networks:**
- `medw-internal` (`internal: true`): ollama + chromadb. Cannot reach internet or host.
- `medw-external`: backend + frontend. Backend is on BOTH networks to talk to internal services AND expose port to host.
- This enforces NFR5 (no external data transmission) and NFR7 (no host exposure of inference endpoints).

**Why backend is on BOTH networks:** The backend must reach `ollama:11434` and `chromadb:8001` (internal network) AND be reachable from the host on port 8000 (external network). Docker service discovery uses the container name as hostname — this only works within shared networks.

**ChromaDB Port 8001:** The `CHROMA_SERVER_HTTP_PORT=8001` environment variable configures ChromaDB to listen on port 8001 inside the container. This aligns with `config.py` default (`CHROMA_PORT=8001`) and `.env.example`. **If `CHROMA_SERVER_HTTP_PORT` is not recognized by chromadb:1.5.7:** fall back to using port 8000 and set `CHROMA_PORT=8000` in the backend service environment block.

**Healthcheck `start_period`:** This delays healthcheck failure counting — the container is not marked unhealthy during `start_period` even if checks fail. Values:
- `ollama`: `600s` (10 min) because `biomistral:7b` (~4GB) takes time to pull on first run.
- `chromadb`: `30s` (fast start).
- `backend`: `60s` (pip install is cached after first build, but give it time).

**`NEXT_PUBLIC_API_URL` Build Arg:** Next.js inlines `NEXT_PUBLIC_*` at compile time. The arg must be passed during `docker compose build`, not at runtime. The docker-compose.yml `build.args` pattern handles this. Default falls back to `http://localhost:8000` if `.env` is not present.

### Service Dependencies Chain

```
ollama (healthcheck: biomistral in ollama list)
  └── chromadb (depends_on: ollama healthy; healthcheck: /api/v1/heartbeat)
        └── backend (depends_on: chromadb healthy; healthcheck: /api/v1/health)
              └── frontend (depends_on: backend healthy)
```

### File Structure Impact

Files modified by this story:
```
medw/
├── docker-compose.yml              ← REPLACE entirely
├── docker/
│   └── ollama-entrypoint.sh        ← IMPLEMENT (was placeholder)
├── backend/
│   └── Dockerfile                  ← COMPLETE (was 2-line placeholder)
└── frontend/
    ├── Dockerfile                  ← CREATE (does not exist yet)
    └── .dockerignore               ← CREATE if missing
```

Do NOT modify:
- `backend/main.py` (done in 1.2)
- `backend/requirements.txt` (done in 1.2)
- `backend/app/` (done in 1.2)
- `frontend/` source files (done in 1.1)
- `.env.example` (already correct)

### Previous Story Intelligence

From Story 1.2 implementation:
- `GET /api/v1/health` returns `{"status": "ok"}` HTTP 200 — confirmed working. This is used as the backend healthcheck in docker-compose.
- `backend/app/core/config.py` reads `OLLAMA_HOST`, `CHROMA_HOST`, `CHROMA_PORT` from environment. The docker-compose backend environment block must set all three to the internal Docker hostnames.
- `backend/requirements.txt` is complete with all deps including LangChain/ChromaDB. Docker layer caching is ready.
- Backend runs with `uvicorn main:app` from the `backend/` directory — the Dockerfile CMD must reflect this.

From Story 1.1 implementation:
- `docker/ollama-entrypoint.sh` exists as a placeholder — implement in place, do not create a new file.
- `backend/Dockerfile` exists as a placeholder — complete in place.
- `frontend/Dockerfile` does NOT exist — create it.
- `frontend/.dockerignore` may not exist — check and create if missing.

### Security Notes (NFR5, NFR7, NFR8)

- **No host ports for ollama/chromadb:** Both services are on `medw-internal` network only. `ports:` section is intentionally absent for these services. This is the NFR7 requirement.
- **No secrets in docker-compose.yml:** Environment values use Docker Compose defaults or internal hostnames — no API keys, passwords, or tokens.
- **GPU config comment:** The `deploy.resources.reservations.devices` block is included unconditionally. On systems without NVIDIA GPU, Docker will fail unless the nvidia-container-toolkit is installed. This is expected for the target B200 hardware.

### Docker Build Context Notes

**Backend build context is `./backend/`** — the Dockerfile COPY instructions are relative to `backend/`. Files at project root (`.env.example`, `docker-compose.yml`) are NOT in the build context and cannot be copied into the backend image. This is correct — config comes from environment variables, not files.

**Frontend build context is `./frontend/`** — the Dockerfile copies `package*.json` first for layer caching (npm install layer is cached unless package.json changes), then copies source. This is the standard Node.js Dockerfile pattern.

### Testing / Verification

Manual verification steps (no automated tests for this story):

1. **Build test:** `docker compose build` — both `medw-backend` and `medw-frontend` must build without errors.

2. **Startup test:** `docker compose up` — observe startup order in logs:
   - `medw-ollama` starts, pulls biomistral (takes time on first run)
   - `medw-chromadb` starts after ollama is healthy
   - `medw-backend` starts after chromadb is healthy
   - `medw-frontend` starts after backend is healthy

3. **Health verification:**
   - `curl http://localhost:8000/api/v1/health` → `{"status": "ok"}` HTTP 200
   - `curl http://localhost:3000` → Next.js page HTML (HTTP 200)

4. **Network isolation check:**
   - `docker inspect medw-ollama | grep Networks` — should show only `medw_medw-internal`
   - `docker inspect medw-backend | grep Networks` — should show both `medw-internal` and `medw-external`
   - `curl http://localhost:11434` — should fail/refuse (ollama not exposed to host)
   - `curl http://localhost:8001` — should fail/refuse (chromadb not exposed to host)

### Common Pitfalls

- **Script not executable:** Docker COPY does not preserve file permissions by default. Commit the executable bit to git: `git update-index --chmod=+x docker/ollama-entrypoint.sh`. Alternatively, add `RUN chmod +x /entrypoint.sh` — but this only applies to backend, not ollama. Mount as `:ro` and ensure git tracks the executable bit.

- **NEXT_PUBLIC_API_URL at runtime:** Setting this as a docker-compose `environment:` on the frontend service will NOT work — Next.js bakes `NEXT_PUBLIC_*` at build time. It must be a `build.args` entry.

- **`ollama serve` blocks unless backgrounded:** The entrypoint must start `ollama serve &` (background) before `ollama pull`, otherwise the pull command never runs.

- **`wait` required at end of entrypoint:** Without `wait $OLLAMA_PID`, the container exits after the model pull, triggering a restart loop.

- **chromadb default port is 8000:** If `CHROMA_SERVER_HTTP_PORT` env var is ignored by the image, the healthcheck will fail (pointing to 8001 but service is on 8000). Resolution: verify with `docker exec medw-chromadb python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/heartbeat')"`. If port 8000 works, update healthcheck and backend `CHROMA_PORT` env to `8000`.

- **`internal: true` network breaks internet access:** Do NOT put backend on `medw-internal`. Backend needs internet during build (pip install) but not at runtime. The compose `medw-internal` network is for runtime only.

### References

- Story 1.3 requirements: [epics.md — Story 1.3](_bmad-output/planning-artifacts/epics.md)
- Architecture — Infrastructure & Deployment: [architecture.md](_bmad-output/planning-artifacts/architecture.md)
- Architecture — Startup Sequence: Docker Compose Startup Sequence section in architecture.md
- NFR5, NFR7 (network isolation): [epics.md — NonFunctional Requirements](_bmad-output/planning-artifacts/epics.md)
- Previous Story 1.2 implementation: [1-2-fastapi-base-application-and-health-endpoint.md](_bmad-output/implementation-artifacts/1-2-fastapi-base-application-and-health-endpoint.md)
- Current docker-compose.yml (to replace): [docker-compose.yml](docker-compose.yml)

## Dev Agent Record

### Agent Model Used

_to be filled by implementing agent_

### Debug Log References

_none_

### Completion Notes List

_to be filled by implementing agent_

### File List

_to be filled by implementing agent_

## Change Log

- 2026-04-16: Story created via bmad-create-story workflow.
