import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import doctors, health
from app.routers import history
from app.services import doctor_service
from app.services.llm_service import warmup_model
from app.services.rag_service import seed_corpus_if_empty

load_dotenv()  # Load .env if present (development only)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_corpus_if_empty()
    try:
        doctor_service.load_doctors()
    except doctor_service.DoctorDataLoadError as exc:
        logger.exception("Doctor dataset load failed during startup")
        raise RuntimeError("Startup aborted: doctor dataset failed to load") from exc
    await warmup_model()
    from app.core.database import close_db, get_db
    await get_db()
    yield
    await close_db()


app = FastAPI(title="MedW API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

app.include_router(health.router, prefix="/api/v1")
app.include_router(doctors.router, prefix="/api/v1")
from app.routers import triage
app.include_router(triage.router, prefix="/api/v1")
from app.routers import rag_debug
app.include_router(rag_debug.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
from app.routers import analytics
app.include_router(analytics.router, prefix="/api/v1")
