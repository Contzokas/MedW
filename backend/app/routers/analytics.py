from fastapi import APIRouter
from app.services.analytics_service import get_triage_analytics

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

@router.get("/")
async def get_analytics():
    return await get_triage_analytics()
