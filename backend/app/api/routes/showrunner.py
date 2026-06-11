import logging

from fastapi import APIRouter, HTTPException

from app.schemas.requests import GenerateRequest
from app.services.showrunner_service import showrunner_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/generate")
def generate_story(request: GenerateRequest):
    try:
        logger.info(f"Generating story for prompt: {request.prompt[:100]}... [Mode: {request.mode}]")
        result = showrunner_service.generate(request.prompt, mode=request.mode)
        logger.info(f"Generation complete: {len(result.script)} chars, {len(result.storyboard)} scenes")
        return result
    except Exception as e:
        logger.error(f"Generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
