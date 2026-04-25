import os


def _get_bool_env(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}

OLLAMA_HOST: str = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
OLLAMA_MODEL: str = os.environ.get("OLLAMA_MODEL", "medgemma:27b")
try:
    OLLAMA_TIMEOUT: int = max(1, int(os.environ.get("OLLAMA_TIMEOUT", "30")))
except ValueError:
    import logging as _logging
    _logging.getLogger(__name__).warning("Invalid OLLAMA_TIMEOUT env value; using default 30s")
    OLLAMA_TIMEOUT: int = 30
OLLAMA_WARMUP_ENABLED: bool = _get_bool_env("OLLAMA_WARMUP_ENABLED", True)
OLLAMA_WARMUP_KEEP_ALIVE: str = os.environ.get("OLLAMA_WARMUP_KEEP_ALIVE", "30m")
try:
    OLLAMA_WARMUP_RETRIES: int = max(1, int(os.environ.get("OLLAMA_WARMUP_RETRIES", "24")))
except ValueError:
    OLLAMA_WARMUP_RETRIES = 24
try:
    OLLAMA_WARMUP_RETRY_DELAY_SECONDS: int = max(
        1, int(os.environ.get("OLLAMA_WARMUP_RETRY_DELAY_SECONDS", "5"))
    )
except ValueError:
    OLLAMA_WARMUP_RETRY_DELAY_SECONDS = 5
CHROMA_HOST: str = os.environ.get("CHROMA_HOST", "chromadb")
try:
    CHROMA_PORT: int = int(os.environ.get("CHROMA_PORT", "8000"))
except ValueError:
    CHROMA_PORT: int = 8000
try:
    QUEUE_MAX_ENTRIES: int = max(1, int(os.environ.get("QUEUE_MAX_ENTRIES", "1000")))
except ValueError:
    QUEUE_MAX_ENTRIES: int = 1000
