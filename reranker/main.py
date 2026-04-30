from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import CrossEncoder

logger = logging.getLogger("reranker")
logging.basicConfig(level=logging.INFO)

MODEL_NAME = os.getenv("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")

_model: CrossEncoder | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    logger.info("Loading cross-encoder model: %s", MODEL_NAME)
    _model = CrossEncoder(MODEL_NAME)
    logger.info("Model loaded.")
    yield


app = FastAPI(lifespan=lifespan)


class Query(BaseModel):
    text: str


class Passage(BaseModel):
    text: str


class RankingRequest(BaseModel):
    model: str
    query: Query
    passages: list[Passage]


class RankingResult(BaseModel):
    index: int
    logit: float


class RankingResponse(BaseModel):
    rankings: list[RankingResult]


@app.post("/v1/ranking", response_model=RankingResponse)
def rank(req: RankingRequest):
    if not _model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    pairs = [(req.query.text, p.text) for p in req.passages]
    scores = _model.predict(pairs).tolist()
    rankings = [
        RankingResult(index=i, logit=float(score))
        for i, score in enumerate(scores)
    ]
    rankings.sort(key=lambda r: r.logit, reverse=True)
    return RankingResponse(rankings=rankings)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "loaded": _model is not None}
