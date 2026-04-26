import os


def _get_bool_env(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}

NIM_BASE_URL: str = os.environ.get("NIM_BASE_URL", "http://nim:8000/v1")
NIM_MODEL: str = os.environ.get("NIM_MODEL", "nvidia/nemotron-3-super-120b-a12b")
NIM_API_KEY: str = os.environ.get("NIM_API_KEY", "nim-local")
try:
    NIM_TIMEOUT: int = max(1, int(os.environ.get("NIM_TIMEOUT", "120")))
except ValueError:
    import logging as _logging
    _logging.getLogger(__name__).warning("Invalid NIM_TIMEOUT env value; using default 120s")
    NIM_TIMEOUT: int = 120
NIM_WARMUP_ENABLED: bool = _get_bool_env("NIM_WARMUP_ENABLED", True)
try:
    NIM_WARMUP_RETRIES: int = max(1, int(os.environ.get("NIM_WARMUP_RETRIES", "120")))
except ValueError:
    NIM_WARMUP_RETRIES = 120
try:
    NIM_WARMUP_RETRY_DELAY_SECONDS: int = max(
        1, int(os.environ.get("NIM_WARMUP_RETRY_DELAY_SECONDS", "25"))
    )
except ValueError:
    NIM_WARMUP_RETRY_DELAY_SECONDS = 25
CHROMA_HOST: str = os.environ.get("CHROMA_HOST", "chromadb")
try:
    CHROMA_PORT: int = int(os.environ.get("CHROMA_PORT", "8000"))
except ValueError:
    CHROMA_PORT: int = 8000
try:
    QUEUE_MAX_ENTRIES: int = max(1, int(os.environ.get("QUEUE_MAX_ENTRIES", "1000")))
except ValueError:
    QUEUE_MAX_ENTRIES: int = 1000
