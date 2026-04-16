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
