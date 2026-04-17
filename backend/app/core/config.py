import os

OLLAMA_HOST: str = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
OLLAMA_MODEL: str = os.environ.get("OLLAMA_MODEL", "mistral:7b")
try:
    OLLAMA_TIMEOUT: int = max(1, int(os.environ.get("OLLAMA_TIMEOUT", "30")))
except ValueError:
    import logging as _logging
    _logging.getLogger(__name__).warning("Invalid OLLAMA_TIMEOUT env value; using default 30s")
    OLLAMA_TIMEOUT: int = 30
CHROMA_HOST: str = os.environ.get("CHROMA_HOST", "chromadb")
try:
    CHROMA_PORT: int = int(os.environ.get("CHROMA_PORT", "8000"))
except ValueError:
    CHROMA_PORT: int = 8000
