from fastapi import APIRouter

from app.services.llm_service import get_warmup_status

router = APIRouter()


@router.get("/health")
def health_check() -> dict:
    warmup_status = get_warmup_status()
    return {
        "status": "ok",
        "nim_warmup": {
            "ready": warmup_status["ready"],
            "attempts": warmup_status["attempts"],
            "first_success_at": warmup_status["last_success_at"],
        },
    }


@router.get("/health/warmup")
def warmup_health_check() -> dict:
    return {"status": "ok", "warmup": get_warmup_status()}
