# Deferred Work

## Deferred from: code review of 1-1-monorepo-scaffold-and-project-structure (2026-04-16)

- `langchain==1.2.15`, `langchain-core==1.2.29`, `chromadb==1.5.7` version pins in `backend/requirements.txt` comments should be verified against PyPI before Story 1.2 populates the file. LangChain historically used a `0.x` version scheme; if these versions are incorrect, `pip install` will fail when Story 1.2 populates requirements.txt.
- `"lint": "eslint"` in `frontend/package.json` has no target path. ESLint 9 with flat config requires explicit targets (e.g., `eslint .`). `npm run lint` will either error or lint zero files. Should be addressed when CI/linting is configured in a future story.
