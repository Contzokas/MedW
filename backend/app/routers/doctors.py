from fastapi import APIRouter

from app.schemas.doctor import Doctor
from app.services import doctor_service

router = APIRouter()


@router.get("/doctors", response_model=list[Doctor])
async def list_doctors(specialty: str | None = None) -> list[Doctor]:
    return doctor_service.get_all(specialty=specialty)
