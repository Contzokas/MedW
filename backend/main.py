from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health
from app.services.rag_service import seed_corpus_if_empty

load_dotenv()  # Load .env if present (development only)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_corpus_if_empty()
    yield


app = FastAPI(title="MedW API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
