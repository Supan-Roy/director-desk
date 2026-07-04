import logging
import json

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from app.schemas.requests import GenerateRequest
from app.services.showrunner_service import showrunner_service
from app.utils.security import RateLimiter

logger = logging.getLogger(__name__)

router = APIRouter()


def check_prompt_safety(prompt: str) -> tuple[bool, str]:
    if not prompt:
        return True, ""
        
    prompt_lower = prompt.lower()
    
    # 1. ALWAYS BLOCKED keywords (regardless of context)
    always_blocked = [
        "suicide", "self-harm", "cut myself", "kill myself", "hang myself",
        "ied", "terrorist", "terrorism", "child abuse", "pedophile", 
        "pedophilia", "rape", "sexual assault", "fentanyl", "methamphetamine",
        "heroin", "cocaine", "ecstasy", "illegal drug", "hack into", "bypass security",
        "how to hack", "steal money", "bank robbery", "kidnap", "assassinate",
        "poisoning", "murder", "how to steal", "cyberattack", "malware",
        "trojan virus", "ddos attack"
    ]
    
    for kw in always_blocked:
        if kw in prompt_lower:
            return False, "I can only assist with creative storytelling, filmmaking, audio productions, and other constructive projects. Let's stick to actual work and focus on building your next masterpiece!"

    # 2. Instructional Harm / Danger / Weapons manufacturing / Violence checks
    instructional_verbs = [
        "how to make", "how to build", "how to craft", "how to manufacture", 
        "how to assemble", "how to construct", "guide to make", "tutorial to make",
        "recipe for", "formula for", "instructions to make", "instructions for making",
        "how to create", "3d print a", "3d printing a", "method to make",
        "how to synthesize", "synthesizing", "how to cook", "assembly of",
        "how to kill", "how to hurt", "how to shoot", "how to injure", 
        "how to assault", "how to attack", "how to poison", "how to murder"
    ]
    
    harmful_nouns = [
        "firearm", "firearms", "gun", "guns", "weapon", "weapons", "pistol", 
        "rifles", "rifle", "shotgun", "shotguns", "handgun", "handguns", 
        "revolver", "revolvers", "ammunition", "ammo", "bullet", "bullets", 
        "grenade", "grenades", "bomb", "bombs", "explosive", "explosives", 
        "poison", "poisons", "cyanide", "nerve agent", "mustard gas",
        "someone", "somebody", "a person", "people", "anyone", "anybody"
    ]
    
    # Check if there is an instructional verb + a harmful noun in the prompt
    for verb in instructional_verbs:
        if verb in prompt_lower:
            # Check if this verb by itself is a direct violent command (e.g. "how to kill" or "how to murder")
            # which does not require an additional noun from harmful_nouns
            if verb in ["how to kill", "how to murder", "how to poison", "how to assassinate"]:
                return False, "I can only assist with creative storytelling, filmmaking, audio productions, and other constructive projects. Let's stick to actual work and focus on building your next masterpiece!"
                
            for noun in harmful_nouns:
                if noun in prompt_lower:
                    return False, "I can only assist with creative storytelling, filmmaking, audio productions, and other constructive projects. Let's stick to actual work and focus on building your next masterpiece!"

    # 3. Direct Hate Speech, AI abuse, or offensive content
    hate_keywords = [
        "stupid ai", "dumb robot", "useless assistant", "fuck you", "bastard",
        "retard", "idiot ai", "hate you", "you are piece of shit", "hate ai",
        "ai is trash", "you suck", "kill all humans"
    ]
    
    for kw in hate_keywords:
        if kw in prompt_lower:
            return False, "I'm here to support your creative work and pair program constructively. Let's stick to actual work and focus on building your project!"
            
    return True, ""


@router.post("/generate")
def generate_story(request: GenerateRequest):
    is_safe, error_msg = check_prompt_safety(request.prompt)
    if not is_safe:
        raise HTTPException(status_code=400, detail=error_msg)
        
    try:
        logger.info(f"Generating story for prompt: {request.prompt[:100]}... [Mode: {request.mode}]")
        result = showrunner_service.generate(request.prompt, mode=request.mode, production_type=request.production_type, files=request.files)
        logger.info(f"Generation complete: {len(result.script)} chars, {len(result.storyboard)} scenes")
        return result
    except Exception as e:
        logger.error(f"Generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/stream", dependencies=[Depends(RateLimiter(limit=3, window=60))])
async def generate_story_stream(request: GenerateRequest):
    is_safe, error_msg = check_prompt_safety(request.prompt)
    if not is_safe:
        raise HTTPException(status_code=400, detail=error_msg)
        
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


@router.post("/generate/stream/resume/{project_id}", dependencies=[Depends(RateLimiter(limit=3, window=60))])
async def resume_story_stream(project_id: int):
    try:
        logger.info(f"Resuming streaming story generation for project: {project_id}")
        
        import asyncio
        queue = asyncio.Queue()
        loop = asyncio.get_running_loop()
        
        def run_sync_generation():
            try:
                for event in showrunner_service.resume_generate_stream(project_id):
                    loop.call_soon_threadsafe(queue.put_nowait, event)
                loop.call_soon_threadsafe(queue.put_nowait, None)
            except Exception as e:
                logger.error(f"Error in background resume generation: {e}", exc_info=True)
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
        logger.error(f"Failed to initiate resume stream: {e}", exc_info=True)
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
            project = project_service.save_project(
                db,
                title=project_state.title or "Untitled Production",
                production_type=project_state.production_type,
                prompt=original_prompt,
                script=project_state.script,
                original_script=project_state.original_script,
                storyboard=storyboard_data,
                production_plan=project_state.production_plan,
                critic_review=project_state.critic_review,
                scene_breakdown=project_state.scene_breakdown,
                approved=project_state.approved,
            )
            project_state.id = project.id
        finally:
            db.close()

    except Exception as exc:
        logger.error(f"Auto-save failed (non-fatal): {exc}", exc_info=True)
