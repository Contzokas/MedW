from contextlib import asynccontextmanager
import logging
import os
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import doctors, health
from app.services import doctor_service
from app.services.rag_service import seed_corpus_if_empty

load_dotenv()  # Load .env if present (development only)
logger = logging.getLogger(__name__)

_DEBUG = os.getenv("DEBUG", "").lower() in ("1", "true", "yes")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_corpus_if_empty()
    try:
        doctor_service.load_doctors()
    except doctor_service.DoctorDataLoadError as exc:
        logger.exception("Doctor dataset load failed during startup")
        raise RuntimeError("Startup aborted: doctor dataset failed to load") from exc
    yield


app = FastAPI(title="MedW API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception for %s %s", request.method, request.url.path)
    content: dict = {"detail": "Internal server error"}
    if _DEBUG:
        content["trace"] = traceback.format_exc()
    return JSONResponse(status_code=500, content=content)


app.include_router(health.router, prefix="/api/v1")
app.include_router(doctors.router, prefix="/api/v1")
from app.routers import triage
app.include_router(triage.router, prefix="/api/v1")
