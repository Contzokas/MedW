from fastapi import APIRouter

from app.services.llm_service import get_warmup_status

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/warmup")
def warmup_health_check() -> dict:
    return {"status": "ok", "warmup": get_warmup_status()}
