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


# Production Studio endpoints
@router.post("/api/generate/character")
async def generate_character(background_tasks: BackgroundTasks, request: GenerateJobRequest):
    job = await redis_job_service.create_job(project_id=request.project_id, job_type="character_generation")
    background_tasks.add_task(run_simulated_job, job["job_id"], 5)
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
