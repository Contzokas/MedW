# Source Tree Analysis

> Generated: 2026-04-26 | Scan: Exhaustive | Branch: dev

---

## Annotated Directory Tree

```
MedW/                                    # Project root
├── backend/                             # FastAPI REST + SSE API (Part: backend)
│   ├── main.py                          # ENTRY POINT — FastAPI app, lifespan (seed, warmup)
│   ├── requirements.txt                 # Python dependencies (FastAPI, LangChain, ChromaDB)
│   ├── Dockerfile                       # Python 3.11-slim, uvicorn
│   ├── .dockerignore                    # Exclude __pycache__, .venv, .env
│   ├── pytest.ini                       # pytest config (asyncio_mode=auto)
│   ├── app/
│   │   ├── core/                        # Core infrastructure
│   │   │   ├── config.py                # Environment config (OLLAMA_*, CHROMA_*, QUEUE_*)
│   │   │   └── queue.py                 # In-memory async queue for SSE streaming
│   │   ├── routers/                     # HTTP API endpoints
│   │   │   ├── health.py                # GET /api/v1/health, /api/v1/health/warmup
│   │   │   ├── doctors.py               # GET /api/v1/doctors
│   │   │   ├── triage.py                # POST /api/v1/triage, GET /api/v1/triage/queue (SSE)
│   │   │   └── rag_debug.py             # /api/v1/rag/debug/* (11 endpoints, gated)
│   │   ├── schemas/                     # Pydantic data models
│   │   │   ├── triage.py                # TriageRequest, TriageResponse, QueueEntry
│   │   │   └── doctor.py                # Doctor model
│   │   └── services/                    # Business logic layer
│   │       ├── triage_service.py        # Orchestration: RAG → LLM → doctor match → queue
│   │       ├── llm_service.py           # Ollama LLM classification (LangChain)
│   │       ├── rag_service.py           # ChromaDB RAG retrieval (TOP_K=3)
│   │       ├── rag_debug.py             # Pipeline debugging & introspection
│   │       └── doctor_service.py        # Doctor data loading, specialty matching, GP fallback
│   ├── data/                            # Static data assets
│   │   ├── doctors.json                 # 21 doctors, 12 specialties
│   │   └── corpus/                      # RAG knowledge base
│   │       ├── mts_guidelines.md        # Manchester Triage System clinical guidelines
│   │       └── specialty_reference.md   # Symptom-to-specialty mapping (14 specialties)
│   └── tests/                           # pytest test suite
│       ├── conftest.py                  # Test configuration
│       ├── test_triage_router.py        # API contract tests
│       ├── test_triage_service.py       # Orchestration + fallback tests
│       ├── test_rag_service.py          # RAG retrieval tests
│       ├── test_rag_debug.py            # Debug pipeline tests
│       ├── test_doctor_service.py       # Doctor matching tests
│       └── test_sse_queue.py            # SSE streaming queue tests
│
├── frontend/                            # Next.js 16 UI (Part: frontend)
│   ├── package.json                     # Dependencies: next 16.2.4, react 19.2.4
│   ├── next.config.ts                   # Standalone output, no rewrites (proxy via API route)
│   ├── tsconfig.json                    # TypeScript 5, ES2017 target, @/* path alias
│   ├── postcss.config.mjs               # Tailwind CSS v4 PostCSS plugin
│   ├── eslint.config.mjs                # ESLint 9 + Next.js config
│   ├── Dockerfile                       # Multi-stage: node:20-alpine build + standalone runner
│   ├── .dockerignore                    # Exclude node_modules, .next, .env
│   ├── CLAUDE.md                        # AI coding instructions
│   ├── AGENTS.md                        # Multi-agent instructions
│   ├── app/
│   │   ├── layout.tsx                   # ROOT LAYOUT — ThemeProvider → LangProvider → children
│   │   ├── page.tsx                     # ENTRY POINT (/) — Hero + TriageForm + TriageResult
│   │   ├── globals.css                  # Tailwind v4, CSS custom properties, dark/light theme
│   │   ├── components/                  # UI components
│   │   │   ├── TriageForm.tsx           # Symptom textarea, submitTriage API call
│   │   │   ├── TriageResult.tsx         # MTS result, DoctorCard, reasoning display
│   │   │   ├── DoctorCard.tsx           # Doctor info card with finddoctors.gov.gr link
│   │   │   ├── Disclaimer.tsx           # Medical disclaimer banner
│   │   │   ├── EmergencyBar.tsx         # Fixed bottom bar with 166 emergency number
│   │   │   ├── TeamSection.tsx          # Team members, social links, tech badges
│   │   │   ├── ThemeToggle.tsx          # Dark/light mode toggle (moon/sun icon)
│   │   │   └── LangToggle.tsx           # EN/EL language switcher
│   │   ├── lib/                         # Utilities and shared code
│   │   │   ├── api.ts                   # submitTriage() — POST to /api/v1/triage
│   │   │   ├── backendResolver.ts       # Dynamic backend URL with caching + fallback
│   │   │   ├── types.ts                 # TriageRequest, Doctor, TriageResponse, QueueEntry
│   │   │   ├── translations.ts          # Full EN/EL translations object
│   │   │   ├── lang-context.tsx         # LangProvider + useLang hook
│   │   │   ├── theme-context.tsx        # ThemeProvider + useTheme hook (localStorage)
│   │   │   ├── casing.ts                # toCaps() — Greek-aware uppercase conversion
│   │   │   └── useTriageStream.ts       # useTriageStream() — EventSource SSE hook
│   │   ├── api/                         # Next.js API routes (server-side)
│   │   │   ├── config/route.ts          # GET /api/config → { backendUrl }
│   │   │   └── proxy/[...path]/route.ts # Backend proxy (all HTTP methods)
│   │   └── dashboard/                   # Nurse dashboard route
│   │       ├── page.tsx                 # Dashboard page (/dashboard)
│   │       └── components/
│   │           ├── TriageQueue.tsx      # Real-time queue table (useTriageStream)
│   │           └── TriageQueueItem.tsx  # Single queue row with MTS badge
│   └── README.md                        # Frontend-specific docs
│
├── docker/                              # AI pipeline infrastructure
│   └── ollama-entrypoint.sh             # Ollama startup: serve → pull model → verify
│
├── k8s/                                 # Kubernetes manifests (Run:ai cluster)
│   ├── kustomization.yaml               # Kustomize entry: namespace, PVCs, deployments
│   ├── namespace.yaml                   # runai-medo namespace
│   ├── pvcs.yaml                        # ollama-pvc (20Gi), chroma-pvc (5Gi)
│   ├── configmap-ollama-entrypoint.yaml # Entrypoint script as ConfigMap
│   ├── ollama-deployment.yaml           # GPU: NVIDIA B200, runai-scheduler, 1×GPU
│   ├── chromadb-deployment.yaml         # ChromaDB 1.5.7, ClusterIP
│   ├── backend-deployment.yaml          # ghcr.io/contzokas/medw-backend:latest
│   └── frontend-deployment.yaml         # ghcr.io/contzokas/medw-frontend:latest, NodePort
│
├── artifacts/                           # ML dataset artifacts
│   └── symptom_combinations/            # Synthetic symptom dataset
│       ├── builder_config.json          # Data Designer config
│       ├── metadata.json                # 50 records, column statistics
│       ├── finetune_data.jsonl          # Fine-tuning data (ChatML format)
│       ├── test_results.json            # Baseline test results
│       └── parquet-files/               # Parquet dataset files
│
├── _bmad/                               # BMAD methodology configuration
├── _bmad-output/                        # BMAD planning/implementation artifacts
├── docs/                                # Generated project documentation
├── docker-compose.yml                   # 4-service orchestration
├── .env.example                         # Environment variable template
├── deploy.ps1                           # PowerShell: manual build/push/deploy to Run:ai
├── prepare_finetune_data.py             # Convert symptom dataset to fine-tuning JSONL
├── symptom_combinations.py              # Data Designer dataset generator config
├── test_triage_baseline.py              # Baseline accuracy test against triage API
├── requirements.txt                     # Root Python dependencies (artifacts scripts)
└── README.md                            # Project README
```

---

## Critical Folders

| Path | Purpose | Integration Points |
|---|---|---|
| `backend/app/services/` | Business logic (triage, LLM, RAG, doctors) | Called by routers, queues triage results |
| `backend/app/routers/` | HTTP API endpoints | Called by frontend via proxy |
| `backend/data/corpus/` | RAG knowledge base | Loaded by rag_service on startup |
| `frontend/app/components/` | React UI components | Uses api.ts, types.ts, contexts |
| `frontend/app/lib/` | Utilities, hooks, types | Shared across all components |
| `frontend/app/dashboard/` | Nurse dashboard | Uses useTriageStream SSE hook |
| `k8s/` | Kubernetes manifests | Deploy via `kubectl apply -k k8s/` |
| `docker/` | Docker infrastructure | Entrypoint for Ollama model pull |

## Entry Points

| Entry Point | Type | Route/Command |
|---|---|---|
| `backend/main.py` | FastAPI application | `uvicorn main:app --host 0.0.0.0 --port 8000` |
| `frontend/app/layout.tsx` | Next.js root layout | `/` (all routes) |
| `frontend/app/page.tsx` | Patient triage page | `/` |
| `frontend/app/dashboard/page.tsx` | Nurse dashboard | `/dashboard` |
| `docker-compose.yml` | Full stack | `docker compose up --build` |
| `k8s/kustomization.yaml` | K8s deployment | `kubectl apply -k k8s/` |
