import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.redis import redis_manager
from app.services.redis_job_service import redis_job_service

logger = logging.getLogger(__name__)

router = APIRouter()

QUEUES = [
    "character_generation_queue",
    "environment_generation_queue",
    "voice_generation_queue",
    "asset_generation_queue",
    "video_generation_queue",
    "future_render_queue"
]


class GenerateJobRequest(BaseModel):
    project_id: str = "test_project"
    target_id: Optional[str] = None


async def run_simulated_job(job_id: str, duration_seconds: int = 10):
    logger.info(f"Simulated worker started for job {job_id}")
    try:
        await redis_job_service.update_job_status(job_id, "processing", progress=0)
        
        steps = 10
        interval = duration_seconds / steps
        for i in range(1, steps + 1):
            await asyncio.sleep(interval)
            progress = int((i / steps) * 100)
            await redis_job_service.update_job_status(job_id, "processing", progress=progress)
            
        await redis_job_service.update_job_status(job_id, "completed", progress=100)
    except Exception as e:
        logger.error(f"Simulated worker error on job {job_id}: {e}")
        await redis_job_service.update_job_status(job_id, "failed", error=str(e))


@router.get("/debug/redis")
async def get_redis_debug():
    try:
        health = await redis_manager.check_health()
        if not health["connected"]:
            return {
                "connected": False,
                "redis_version": "unknown",
                "queue_size": 0,
                "active_jobs": 0
            }
        
        client = await redis_manager.get_client()
        queue_size = 0
        for q in QUEUES:
            queue_size += await client.llen(f"queue:{q}")
            
        active_jobs = await client.scard("active_jobs")
        return {
            "connected": True,
            "redis_version": health["redis_version"],
            "queue_size": queue_size,
            "active_jobs": active_jobs
        }
    except Exception as e:
        logger.error(f"Error in debug redis: {e}")
        return {
            "connected": False,
            "redis_version": "unknown",
            "queue_size": 0,
            "active_jobs": 0,
            "error": str(e)
        }


@router.post("/debug/test-job")
async def create_test_job(background_tasks: BackgroundTasks, request: Optional[GenerateJobRequest] = None):
    project_id = "test_project"
    if request and request.project_id:
        project_id = request.project_id
        
    job = await redis_job_service.create_job(project_id=project_id, job_type="test_job")
    background_tasks.add_task(run_simulated_job, job["job_id"], 10)
    return job


@router.get("/jobs/stream")
async def stream_job_updates():
    async def event_generator():
        client = await redis_manager.get_client()
        pubsub = client.pubsub()
        await pubsub.subscribe("job_updates")
        
        try:
            # Yield an initial connected event
            yield "data: {\"event\": \"connected\"}\n\n"
            
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    data = message["data"]
                    yield f"data: {data}\n\n"
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            logger.info("Client disconnected from jobs SSE stream")
        finally:
            await pubsub.unsubscribe("job_updates")
            await pubsub.close()
            
    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), headers=headers, media_type="text/event-stream")


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = await redis_job_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


async def run_character_generation_job(job_id: str, project_id: int, character_name: str):
    import json
    import uuid
    import hashlib
    import urllib.request
    import os
    import logging
    from app.db.database import SessionLocal
    from app.db.models import Project, CharacterAsset
    from app.services.qwen_service import qwen_service
    
    db = SessionLocal()
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Starting character generation task for {character_name} (Job: {job_id})")
        await redis_job_service.update_job_status(job_id, "processing", progress=10, message=f"Generating {character_name}...")
        await asyncio.sleep(0.5)
        
        await redis_job_service.update_job_status(job_id, "processing", progress=30, message="Analyzing Character Profile...")
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with ID {project_id} not found.")
            
        script_context = project.script or ""
        breakdown_context = json.dumps(project.scene_breakdown or {})
        
        prompt = f"""
        Analyze this project's script and scene breakdown to expand the character '{character_name}' into a structured JSON profile.
        
        Script Context:
        {script_context[:3000]}
        
        Breakdown Context:
        {breakdown_context[:2000]}
        
        Provide the response strictly as a JSON block with these keys (do not add markdown code blocks or any introductory text, output pure JSON):
        {{
          "name": "{character_name}",
          "age": "estimate or extract age",
          "gender": "extract gender",
          "role": "Lead or Supporting",
          "personality": "summary of character personality",
          "wardrobe": "clothing description matching their scenes",
          "visual_profile": "detailed physical appearance, facial features, hair, build, styling keys",
          "environment_context": "environments they appear in",
          "story_context": "their narrative goal and motivations",
          "scene_appearances": ["Scene 1", "Scene 2"]
        }}
        """
        
        try:
            expanded_profile_str = await asyncio.to_thread(qwen_service.generate_text, prompt)
            cleaned = expanded_profile_str.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            profile = json.loads(cleaned.strip())
        except Exception as e:
            logger.error(f"Failed to expand character profile: {e}")
            profile = {
                "name": character_name,
                "age": "Unknown",
                "gender": "Unknown",
                "role": "Supporting",
                "personality": "Intriguing character from the script.",
                "wardrobe": "Standard apparel.",
                "visual_profile": "No visual details specified.",
                "environment_context": "Default scene setting.",
                "story_context": "Appears in narrative scenes.",
                "scene_appearances": ["Scene 1"]
            }
            
        await asyncio.sleep(0.5)
        
        await redis_job_service.update_job_status(job_id, "processing", progress=50, message="Building Visual Identity...")
        character_id = f"char_{character_name.lower()}_{uuid.uuid4().hex[:8]}"
        visual_signature = f"{profile.get('age')}, {profile.get('gender')}, {profile.get('visual_profile')}, wearing {profile.get('wardrobe')}"
        consistency_hash = hashlib.sha256(visual_signature.encode('utf-8')).hexdigest()[:16]
        
        profile["character_id"] = character_id
        profile["visual_signature"] = visual_signature
        profile["consistency_hash"] = consistency_hash
        
        await asyncio.sleep(0.5)
        
        await redis_job_service.update_job_status(job_id, "processing", progress=70, message="Generating Reference Portrait...")
        image_prompt = f"Studio portrait, front view, face reference sheet. Character: {character_name}. Visual details: {visual_signature}. Style: cinematic film key lighting, high detail, photorealistic."
        
        try:
            raw_image_url = await asyncio.to_thread(qwen_service.generate_image, image_prompt)
        except Exception as e:
            logger.error(f"Failed to generate image: {e}")
            raw_image_url = f"https://placehold.co/1024x1024.png?text={character_name}+Portrait"
            
        await asyncio.sleep(0.5)
        
        await redis_job_service.update_job_status(job_id, "processing", progress=90, message="Saving Asset...")
        
        try:
            os.makedirs("static/uploads", exist_ok=True)
            safe_name = "".join([c if c.isalnum() else "_" for c in character_name]).lower()
            filename = f"char_{safe_name}_{uuid.uuid4().hex[:8]}.png"
            filepath = os.path.join("static/uploads", filename)
            await asyncio.to_thread(urllib.request.urlretrieve, raw_image_url, filepath)
            local_image_url = f"/static/uploads/{filename}"
        except Exception as e:
            logger.error(f"Failed to download generated portrait: {e}")
            local_image_url = "/static/uploads/placeholder.png"
            
        version_count = db.query(CharacterAsset).filter(
            CharacterAsset.project_id == project_id, 
            CharacterAsset.character_name == character_name
        ).count()
        version_num = version_count + 1
        
        profile["version"] = version_num
        profile["is_preferred"] = (version_count == 0)
        
        asset = CharacterAsset(
            project_id=project_id,
            character_name=character_name,
            character_profile=profile,
            image_url=local_image_url,
            generation_prompt=image_prompt
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        
        logger.info(f"Character asset saved: ID={asset.id}, Name={character_name}, Version=v{version_num}")
        await redis_job_service.update_job_status(job_id, "completed", progress=100, message="Completed")
        
    except Exception as e:
        logger.error(f"Error running character generation: {e}")
        await redis_job_service.update_job_status(job_id, "failed", error=str(e), message="Failed")
    finally:
        db.close()


# Production Studio endpoints
@router.post("/api/generate/character")
async def generate_character(background_tasks: BackgroundTasks, request: GenerateJobRequest):
    if not request.target_id:
        raise HTTPException(status_code=400, detail="target_id (character_name) is required")
        
    job = await redis_job_service.create_job(
        project_id=request.project_id, 
        job_type="character_generation", 
        target_id=request.target_id
    )
    background_tasks.add_task(
        run_character_generation_job, 
        job["job_id"], 
        int(request.project_id), 
        request.target_id
    )
    return job


@router.post("/api/generate/environment")
async def generate_environment(background_tasks: BackgroundTasks, request: GenerateJobRequest):
    job = await redis_job_service.create_job(project_id=request.project_id, job_type="environment_generation")
    background_tasks.add_task(run_simulated_job, job["job_id"], 5)
    return job


@router.post("/api/generate/voice")
async def generate_voice(background_tasks: BackgroundTasks, request: GenerateJobRequest):
    job = await redis_job_service.create_job(project_id=request.project_id, job_type="voice_generation")
    background_tasks.add_task(run_simulated_job, job["job_id"], 5)
    return job


@router.post("/api/generate/asset")
async def generate_asset(background_tasks: BackgroundTasks, request: GenerateJobRequest):
    job = await redis_job_service.create_job(project_id=request.project_id, job_type="asset_generation")
    background_tasks.add_task(run_simulated_job, job["job_id"], 8)
    return job


@router.post("/api/generate/scene")
async def generate_scene(background_tasks: BackgroundTasks, request: GenerateJobRequest):
    job = await redis_job_service.create_job(project_id=request.project_id, job_type="scene_generation")
    background_tasks.add_task(run_simulated_job, job["job_id"], 10)
    return job


@router.post("/api/generate/film")
async def generate_film(background_tasks: BackgroundTasks, request: GenerateJobRequest):
    job = await redis_job_service.create_job(project_id=request.project_id, job_type="film_generation")
    background_tasks.add_task(run_simulated_job, job["job_id"], 12)
    return job
