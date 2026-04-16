import os

OLLAMA_HOST: str = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
CHROMA_HOST: str = os.environ.get("CHROMA_HOST", "chromadb")
try:
    CHROMA_PORT: int = int(os.environ.get("CHROMA_PORT", "8001"))
except ValueError:
    CHROMA_PORT: int = 8001
