import json

import httpx

from app.core.config import NIM_BASE_URL, NIM_TIMEOUT, RAG_SERVER_URL, RAG_SERVER_TIMEOUT


async def check_nim_ready(base_url: str = NIM_BASE_URL, timeout: float = float(NIM_TIMEOUT)) -> None:
    """Probe NIM health endpoint. Raises httpx errors on failure."""
    endpoint = f"{base_url.rstrip('/')}/health/ready"
    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout)) as client:
        response = await client.get(endpoint)
        response.raise_for_status()


async def query_rag_server(query: str, timeout: float = float(RAG_SERVER_TIMEOUT)) -> str:
    """Call NVIDIA RAG Server. Returns response text. Raises httpx errors on failure."""
    payload = json.dumps({"query": query}, ensure_ascii=False).encode("utf-8")
    async with httpx.AsyncClient(base_url=RAG_SERVER_URL, timeout=httpx.Timeout(timeout)) as client:
        response = await client.post(
            "/v1/query",
            content=payload,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        data = response.json()
        return data.get("text", data.get("answer", ""))
