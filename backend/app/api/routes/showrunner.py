import logging
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.requests import GenerateRequest
from app.services.showrunner_service import showrunner_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/generate")
def generate_story(request: GenerateRequest):
    try:
        logger.info(f"Generating story for prompt: {request.prompt[:100]}... [Mode: {request.mode}]")
        result = showrunner_service.generate(request.prompt, mode=request.mode, production_type=request.production_type, files=request.files)
        logger.info(f"Generation complete: {len(result.script)} chars, {len(result.storyboard)} scenes")
        return result
    except Exception as e:
        logger.error(f"Generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/stream")
async def generate_story_stream(request: GenerateRequest):
    try:
        logger.info(f"Streaming story generation for prompt: {request.prompt[:100]}... [Mode: {request.mode}]")
        
        import asyncio
        queue = asyncio.Queue()
        loop = asyncio.get_running_loop()
        
        def run_sync_generation():
            try:
                for event in showrunner_service.generate_stream(
                    request.prompt, request.mode, request.production_type, files=request.files
                ):
                    loop.call_soon_threadsafe(queue.put_nowait, event)

                    # Auto-save when generation completes successfully
                    if event.get("type") == "complete":
                        _auto_save_project(request.prompt)

                loop.call_soon_threadsafe(queue.put_nowait, None)
            except Exception as e:
                logger.error(f"Error in background sync generation: {e}", exc_info=True)
                loop.call_soon_threadsafe(queue.put_nowait, {"type": "error", "message": str(e)})
                loop.call_soon_threadsafe(queue.put_nowait, None)

        loop.run_in_executor(None, run_sync_generation)
        
        async def event_generator():
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\n\n"
                
        headers = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
        return StreamingResponse(event_generator(), headers=headers, media_type="text/event-stream")
    except Exception as e:
        logger.error(f"Failed to initiate stream: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _auto_save_project(original_prompt: str) -> None:
    """
    Persist the just-completed generation to the database.
    Runs in the same background thread as generate_stream so we use a
    fresh DB session rather than an async-injected one.
    """
    try:
        from app.services.project_state import project_state
        from app.services.project_service import project_service
        from app.db.database import SessionLocal

        # Build the storyboard list from StoryboardScene objects (or plain dicts)
        storyboard_data = []
        for scene in (project_state.storyboard or []):
            if hasattr(scene, "__dict__"):
                # It's a StoryboardScene pydantic model or dataclass
                try:
                    storyboard_data.append(scene.model_dump())
                except AttributeError:
                    storyboard_data.append({
                        "scene": getattr(scene, "scene_number", None),
                        "shot": getattr(scene, "camera_shot", None),
                        "environment": getattr(scene, "environment", None),
                        "mood": getattr(scene, "mood", None),
                    })
            elif isinstance(scene, dict):
                storyboard_data.append(scene)

        db = SessionLocal()
        try:
            project_service.save_project(
                db,
                title=project_state.title or "Untitled Production",
                production_type=project_state.production_type,
                prompt=original_prompt,
                script=project_state.script,
                storyboard=storyboard_data,
                production_plan=project_state.production_plan,
            )
        finally:
            db.close()

    except Exception as exc:
        logger.error(f"Auto-save failed (non-fatal): {exc}", exc_info=True)
