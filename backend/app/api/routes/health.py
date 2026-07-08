from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter(tags=['health'])


@router.get('/health', response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return server health status."""
    return HealthResponse(status="Director in Action!")
