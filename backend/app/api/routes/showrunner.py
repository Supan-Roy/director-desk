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
                for event in showrunner_service.generate_stream(request.prompt, request.mode, request.production_type, files=request.files):
                    loop.call_soon_threadsafe(queue.put_nowait, event)
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

