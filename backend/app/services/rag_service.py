import asyncio
import logging
import os
import time
from functools import lru_cache
from pathlib import Path

# Must be set before pymilvus imports gRPC to prevent "too_many_pings" GOAWAY from Milvus Lite
os.environ["GRPC_KEEPALIVE_TIME_MS"] = "120000"
os.environ["GRPC_KEEPALIVE_TIMEOUT_MS"] = "30000"
os.environ["GRPC_KEEPALIVE_PERMIT_WITHOUT_CALLS"] = "1"

import httpx
from pymilvus import DataType, MilvusClient

from app.core.config import (
    MILVUS_URI,
    NIM_API_KEY,
    NIM_EMBED_BASE_URL,
    NIM_EMBED_MODEL,
    NIM_RERANKER_BASE_URL,
    NIM_RERANKER_MODEL,
)

logger = logging.getLogger(__name__)

COLLECTION_NAME = "clinical_context"
CORPUS_DIR = Path(__file__).parent.parent.parent / "data" / "corpus"
TOP_K = 3
RETRIEVAL_CANDIDATES = TOP_K * 3
CACHE_MAX_SIZE = 1024
_EMBED_BATCH_SIZE = 32
_EMBED_MAX_RETRIES = 5
_EMBED_INITIAL_BACKOFF = 2.0

_milvus_client: MilvusClient | None = None


class RAGUnavailableError(Exception):
    pass


def _get_milvus_client() -> MilvusClient:
    global _milvus_client
    if _milvus_client is None:
        logger.info("Initializing Milvus client with URI: %s", MILVUS_URI)
        try:
            _milvus_client = MilvusClient(
                uri=MILVUS_URI,
                timeout=30,
            )
            # Test the connection
            _milvus_client.list_collections()
            logger.info("Milvus client initialized successfully")
        except Exception as exc:
            logger.error("Failed to initialize Milvus client: %s", exc)
            _milvus_client = None
            raise
    return _milvus_client


def _embed_texts(texts: list[str], input_type: str = "passage") -> list[list[float]]:
    last_exception = None
    for attempt in range(_EMBED_MAX_RETRIES):
        try:
            response = httpx.post(
                f"{NIM_EMBED_BASE_URL.rstrip('/')}/embeddings",
                headers={"Authorization": f"Bearer {NIM_API_KEY}"},
                json={"model": NIM_EMBED_MODEL, "input": texts, "input_type": input_type},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()["data"]
            return [item["embedding"] for item in sorted(data, key=lambda x: x["index"])]
        except httpx.HTTPStatusError as exc:
            last_exception = exc
            if exc.response.status_code == 400 and attempt < _EMBED_MAX_RETRIES - 1:
                backoff = _EMBED_INITIAL_BACKOFF * (2 ** attempt)
                logger.warning(
                    "Embeddings service returned 400, retrying in %.1fs (attempt %d/%d)",
                    backoff,
                    attempt + 1,
                    _EMBED_MAX_RETRIES,
                )
                time.sleep(backoff)
            else:
                raise
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            last_exception = exc
            if attempt < _EMBED_MAX_RETRIES - 1:
                backoff = _EMBED_INITIAL_BACKOFF * (2 ** attempt)
                logger.warning(
                    "Embeddings service unavailable, retrying in %.1fs (attempt %d/%d): %s",
                    backoff,
                    attempt + 1,
                    _EMBED_MAX_RETRIES,
                    exc,
                )
                time.sleep(backoff)
            else:
                raise
    raise last_exception


def _ensure_collection(client: MilvusClient) -> None:
    if client.has_collection(COLLECTION_NAME):
        return

    # Probe actual embedding dimension from NIM rather than hardcoding it
    dim = None
    for attempt in range(20):
        try:
            dim = len(_embed_texts(["probe"])[0])
            break
        except Exception as exc:
            logger.info("Waiting for NIM Embed to become ready (attempt %d/20)...", attempt + 1)
            time.sleep(15)

    if dim is None:
        raise Exception("NIM Embed service did not become ready in time")

    schema = client.create_schema(auto_id=False, enable_dynamic_field=False)
    schema.add_field("id", DataType.VARCHAR, max_length=256, is_primary=True)
    schema.add_field("text", DataType.VARCHAR, max_length=65535)
    schema.add_field("embedding", DataType.FLOAT_VECTOR, dim=dim)

    index_params = client.prepare_index_params()
    index_params.add_index(
        field_name="embedding",
        index_type="AUTOINDEX",
        metric_type="COSINE",
    )

    client.create_collection(
        collection_name=COLLECTION_NAME,
        schema=schema,
        index_params=index_params,
    )
    logger.info("Created Milvus collection '%s' (dim=%d).", COLLECTION_NAME, dim)


def _rerank_sync(query: str, docs: list[str]) -> list[str]:
    last_exception = None
    for attempt in range(_EMBED_MAX_RETRIES):
        try:
            response = httpx.post(
                f"{NIM_RERANKER_BASE_URL.rstrip('/')}/ranking",
                headers={"Authorization": f"Bearer {NIM_API_KEY}"},
                json={
                    "model": NIM_RERANKER_MODEL,
                    "query": {"text": query},
                    "passages": [{"text": d} for d in docs],
                },
                timeout=30.0,
            )
            response.raise_for_status()
            rankings = response.json()["rankings"]
            ranked = sorted(rankings, key=lambda r: r["logit"], reverse=True)
            return [docs[r["index"]] for r in ranked[:TOP_K]]
        except (httpx.HTTPStatusError, httpx.ConnectError, httpx.TimeoutException) as exc:
            last_exception = exc
            if attempt < _EMBED_MAX_RETRIES - 1:
                backoff = _EMBED_INITIAL_BACKOFF * (2 ** attempt)
                logger.warning(
                    "Reranker service unavailable, retrying in %.1fs (attempt %d/%d): %s",
                    backoff,
                    attempt + 1,
                    _EMBED_MAX_RETRIES,
                    exc,
                )
                time.sleep(backoff)
            else:
                break
    logger.warning("Reranker unavailable after retries, falling back to retrieval order: %s", last_exception)
    return docs[:TOP_K]


def _seed_sync() -> None:
    max_retries = 3
    last_exception = None

    for attempt in range(max_retries):
        try:
            if not CORPUS_DIR.exists():
                logger.warning("Corpus directory '%s' not found — skipping seeding.", CORPUS_DIR)
                return

            client = _get_milvus_client()

            # Check connection health on retries
            if attempt > 0 and not _check_milvus_connection(client):
                logger.warning("Milvus connection lost during seeding, attempting to reconnect...")
                global _milvus_client
                _milvus_client = None
                client = _get_milvus_client()

            _ensure_collection(client)

            stats = client.get_collection_stats(COLLECTION_NAME)
            if int(stats.get("row_count", 0)) > 0:
                logger.info("Milvus collection '%s' already seeded, skipping.", COLLECTION_NAME)
                return

            documents: list[str] = []
            ids: list[str] = []
            for corpus_file in sorted(CORPUS_DIR.glob("*.md")):
                text = corpus_file.read_text(encoding="utf-8")
                chunks = [c.strip() for c in text.split("\n\n") if c.strip()]
                for i, chunk in enumerate(chunks):
                    ids.append(f"{corpus_file.stem}_{i}")
                    documents.append(chunk)

            if not documents:
                logger.warning("No documents found in corpus directory.")
                return

            embeddings: list[list[float]] = []
            for i in range(0, len(documents), _EMBED_BATCH_SIZE):
                batch = documents[i : i + _EMBED_BATCH_SIZE]
                logger.debug("Embedding batch %d/%d (documents %d-%d)",
                             i // _EMBED_BATCH_SIZE + 1,
                             (len(documents) + _EMBED_BATCH_SIZE - 1) // _EMBED_BATCH_SIZE,
                             i + 1,
                             min(i + _EMBED_BATCH_SIZE, len(documents)))
                embeddings.extend(_embed_texts(batch))

            data = [
                {"id": ids[i], "text": documents[i], "embedding": embeddings[i]}
                for i in range(len(documents))
            ]
            client.insert(collection_name=COLLECTION_NAME, data=data)
            logger.info("Seeded Milvus collection '%s' with %d chunks.", COLLECTION_NAME, len(documents))
            _cached_retrieve.cache_clear()
            return

        except Exception as exc:
            last_exception = exc
            logger.warning(
                "Milvus corpus seeding failed (attempt %d/%d): %s",
                attempt + 1,
                max_retries,
                exc
            )
            if attempt < max_retries - 1:
                time.sleep(2.0)  # Brief pause before retry
            else:
                logger.error("Milvus corpus seeding failed after all retries: %s", last_exception)
                raise


def _check_milvus_connection(client: MilvusClient) -> bool:
    """Check if Milvus connection is still alive."""
    try:
        client.list_collections()
        return True
    except Exception as exc:
        logger.warning("Milvus connection check failed: %s", exc)
        return False


@lru_cache(maxsize=CACHE_MAX_SIZE)
def _cached_retrieve(symptoms: str) -> str:
    max_retries = 3
    last_exception = None

    for attempt in range(max_retries):
        try:
            client = _get_milvus_client()

            # Check connection health on retries
            if attempt > 0 and not _check_milvus_connection(client):
                logger.warning("Milvus connection lost, attempting to reconnect...")
                global _milvus_client
                _milvus_client = None
                client = _get_milvus_client()

            stats = client.get_collection_stats(COLLECTION_NAME)
            row_count = int(stats.get("row_count", 0))
            if row_count == 0:
                return ""

            query_emb = _embed_texts([symptoms], input_type="query")[0]
            n = min(RETRIEVAL_CANDIDATES, row_count)
            results = client.search(
                collection_name=COLLECTION_NAME,
                data=[query_emb],
                limit=n,
                output_fields=["text"],
            )
            docs = [hit["entity"]["text"] for hit in results[0]]
            if not docs:
                return ""
            reranked = _rerank_sync(symptoms, docs)
            return "\n\n".join(reranked)

        except Exception as exc:
            last_exception = exc
            logger.warning(
                "Milvus retrieval failed (attempt %d/%d): %s",
                attempt + 1,
                max_retries,
                exc
            )
            if attempt < max_retries - 1:
                time.sleep(1.0)  # Brief pause before retry

    logger.error("Milvus retrieval failed after all retries: %s", last_exception)
    raise RAGUnavailableError("Milvus unavailable after retries") from last_exception


def _retrieve_sync(symptoms: str) -> str:
    return _cached_retrieve(symptoms)


def clear_retrieval_cache() -> None:
    _cached_retrieve.cache_clear()


async def seed_corpus_if_empty() -> None:
    try:
        await asyncio.to_thread(_seed_sync)
    except Exception as exc:
        logger.error("Milvus corpus seeding failed: %s", exc, exc_info=True)


async def retrieve_context(symptoms: str) -> str:
    try:
        return await asyncio.to_thread(_retrieve_sync, symptoms)
    except Exception as exc:
        logger.error("Milvus retrieval failed: %s", exc, exc_info=True)
        raise RAGUnavailableError("Milvus unavailable") from exc
