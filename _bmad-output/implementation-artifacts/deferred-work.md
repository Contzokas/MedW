# Deferred Work

## Deferred from: code review of 1-1-monorepo-scaffold-and-project-structure (2026-04-16)

- `langchain==1.2.15`, `langchain-core==1.2.29`, `chromadb==1.5.7` version pins in `backend/requirements.txt` comments should be verified against PyPI before Story 1.2 populates the file. LangChain historically used a `0.x` version scheme; if these versions are incorrect, `pip install` will fail when Story 1.2 populates requirements.txt.
- `"lint": "eslint"` in `frontend/package.json` has no target path. ESLint 9 with flat config requires explicit targets (e.g., `eslint .`). `npm run lint` will either error or lint zero files. Should be addressed when CI/linting is configured in a future story.

## Deferred from: code review of 1-3-docker-compose-full-stack-with-ordered-startup.md (2026-04-16)
- `backend` and `frontend` containers run as `root` — deferred, pre-existing
- Missing `frontend` healthcheck in docker-compose.yml — deferred, pre-existing
- Next.js `NEXT_PUBLIC_API_URL` hardcoded fallback — deferred, pre-existing

## Deferred from: code review of 2-1-chromadb-corpus-seeding-and-rag-service (2026-04-16)

- **RAG health observability gap**: When `seed_corpus_if_empty` fails at startup, the app boots healthy and silently serves empty RAG context. A `rag_ready` flag exposed via the health endpoint would surface this. Deferred as beyond story scope; address when health/readiness probes are formalized.
- **TOCTOU race on concurrent seeding**: Two replicas starting simultaneously can both pass the `collection.count() == 0` guard and attempt concurrent `add()`, causing a `DuplicateIDError` in chromadb 1.x. Use `collection.upsert()` instead of `add()` when horizontal scaling is introduced.
- **Empty `symptoms` input validation**: `retrieve_context("")` queries the vector DB with a noise vector and returns arbitrary results as valid context. Input validation should be added at the Story 2.3/2.5 API boundary.
- **Transactional seeding**: A failed `collection.add()` mid-batch leaves the collection partially seeded; subsequent starts skip reseeding due to `count() > 0`. Requires transactional / upsert-based seeding for production hardening.
- **`symptoms` in exception message path**: `RAGUnavailableError(f"ChromaDB unavailable: {exc}")` — if an upstream chromadb exception ever echoes query text, symptoms propagate into the error message and caller logs. Low probability with current chromadb HTTP client but worth sanitizing.
- **`_get_collection()` performance**: Recreates `HttpClient` and instantiates `SentenceTransformerEmbeddingFunction` (model load ~200-500ms) on every call. Should be refactored to module-level singletons for production load.
- **Corpus chunking token limit**: Double-newline splitting produces unbounded chunks; `all-MiniLM-L6-v2` silently truncates at 256 tokens. Current spec-defined corpus fits within limits; revisit when corpus is expanded.

## Deferred from: code review of 2-2-biomistral-llm-service-via-ollama (2026-04-16)

- **`_extract_json_object` returns first JSON object when model emits multiple**: If the model outputs a metadata/error JSON blob before the real payload, the wrong object is parsed silently; prompt design and field validation mitigate this at hackathon scope.
- **`_build_chain()` no singleton**: `ChatOllama` client reconstructed on every `classify()` call — performance concern under load; refactor to module-level singleton when concurrent usage materialises.
- **Empty input guard in `classify()`**: No emptiness check on `symptoms`/`context` — validation belongs at the Story 2.3 triage service API boundary, not inside the LLM service.
- **No retry/circuit-breaker around Ollama**: Transient Ollama restarts surface immediately as errors — resilience patterns (retry, circuit-breaker) are an orchestration concern for Story 2.3.
- **`temperature=0` not externalised**: Deliberate design choice for deterministic JSON output; externalising to config adds complexity without clear benefit at hackathon scope.
- **Test does not assert `asyncio.to_thread` path**: `classify()` test monkeypatches `_invoke_chain_sync` but does not verify the thread-dispatch mechanism was used — implementation detail, outcome fully covered.

## Deferred from: code review of 2-3-triage-service-orchestration-and-fallback-chain (2026-04-17)

- Unbounded queue list growth [backend/app/core/queue.py] — deferred, pre-existing memory leak without current max size spec

## Deferred from: code review of 2-4-mocked-doctor-dataset-and-doctor-service (2026-04-16)

- Specialty query normalization in doctors route/service [backend/app/routers/doctors.py:10] — trigger: leading/trailing whitespace or case variants in query can return false-empty results; deferred as low risk and outside explicit AC scope.

## Deferred from: code review of spec-dark-light-theme-toggle (2026-04-20)

- UUID generation browser compatibility [frontend/app/components/TriageForm.tsx:25] — crypto.randomUUID() not supported in older browsers (Safari < 15.4, IE). Pre-existing issue outside theme scope.
- Date formatting locale fallback [frontend/app/dashboard/components/TriageQueueItem.tsx:32] — toLocaleTimeString("el-GR") assumes Greek locale support without error handling. Pre-existing i18n issue.
- Theme context not wrapped in error boundary [frontend/app/layout.tsx:33] — Whether to wrap ThemeProvider in error boundary requires broader architectural consideration about error handling strategy.
- Theme context re-renders all children on toggle [frontend/app/lib/theme-context.tsx:59-63] — Context API behavior causes all children re-render on theme change. Requires memoization strategy evaluation.
- Theme toggle function not debounced [frontend/app/lib/theme-context.tsx:50-52] — Rapid clicks on toggle could cause multiple state updates. Debouncing is optimization, not critical.
- Emergency alert high-contrast concerns [frontend/app/page.tsx:35-42] — Emergency alert uses destructive/10 background which may be too subtle in some themes. Requires UX testing to determine if visibility adequate.
- Theme value validation before storage — User decision: validation not required. Theme will only be light/dark.
- localStorage quota exceeded handling — User decision: validation/error handling not a concern for this implementation.
- Theme value validation in localStorage — User decision: validation not required for light/dark only themes.

## Deferred from: code review of 1-4-dind-rag-blueprint-deployment (2026-04-27)

- No timeout handling for warmup model initialization [backend/app/services/llm_service.py] — `_get_chain()` is called without timeout during warmup, could block startup indefinitely
- Race condition in warmup state management [backend/app/services/llm_service.py] — Warmup state is shared module-level dict without locking, potential corruption with concurrent access
- Missing CHROMA_HOST/PORT extraction validation [.github/workflows/deploy.yml:489-490] — Simple sed regex extracts host/port without validating URL format, invalid URLs cause backend failures
- No validation of NIM_TIMEOUT vs warmup retry relationship [backend/app/core/config.py] — No check that NIM_TIMEOUT < NIM_WARMUP_RETRY_DELAY_SECONDS, could cause confusing errors
- Missing error handling for URL resolution fallback [.github/workflows/deploy.yml:477-478] — If both URL resolution and GitHub variables fail, deployment proceeds with empty URLs causing cascading failures
- Missing validation for boolean env var parsing [backend/app/core/config.py] — `_get_bool_env()` only handles specific values, unexpected values treated as False without warning
- No validation for annotation format [.github/workflows/deploy.yml:420] — Annotation is hardcoded but no validation that format is correct for Run:ai version
- Missing validation for PVC size compatibility [.github/workflows/deploy.yml:418] — No validation that 500Gi PVC is available or within quotas, could remain Pending indefinitely
- No verification NIM image supports requested model [.github/workflows/deploy.yml] — No validation that NIM_IMAGE actually supports NIM_MODEL, container may start but fail to load model
- Missing validation for concurrent workload deletion [.github/workflows/deploy.yml:300-328] — Two deployments running simultaneously could race on workload deletion/URL resolution
- No validation for Kubernetes env var names [.github/workflows/deploy.yml:508-516] — No validation that env var names follow Kubernetes naming conventions
- Missing documentation for config parameters [.env.example] — New parameters added but no explanation of valid ranges or performance impacts
