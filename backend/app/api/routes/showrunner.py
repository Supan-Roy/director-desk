from fastapi import APIRouter

from app.schemas.requests import GenerateRequest
from app.services.showrunner_service import showrunner_service

router = APIRouter()

@router.post("/generate")
def generate_story(request: GenerateRequest):

    return showrunner_service.generate(
        request.prompt
    )
