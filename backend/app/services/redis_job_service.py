import uuid
import json
import logging
from datetime import datetime
from app.core.redis import redis_manager

logger = logging.getLogger(__name__)

# Queue mapping
JOB_TYPE_TO_QUEUE = {
    "character_generation": "character_generation_queue",
    "environment_generation": "environment_generation_queue",
    "voice_generation": "voice_generation_queue",
    "asset_generation": "asset_generation_queue",
    "scene_generation": "scene_generation_queue",
    "film_generation": "video_generation_queue",
    "test_job": "character_generation_queue"
}


class RedisJobService:
    async def create_job(self, project_id: str, job_type: str, target_id: str = None) -> dict:
        """Create a new Redis job and push it to the queue list."""
        client = await redis_manager.get_client()
        job_id = f"job:{uuid.uuid4().hex[:12]}"
        
        queue_name = JOB_TYPE_TO_QUEUE.get(job_type, "future_render_queue")
        
        job = {
            "job_id": job_id,
            "project_id": str(project_id),
            "type": job_type,
            "target_id": target_id,
            "status": "queued",
            "progress": 0,
            "message": "Job queued",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Save metadata to Redis (string JSON)
        await client.set(job_id, json.dumps(job))
        
        # Push to the queue List
        await client.rpush(f"queue:{queue_name}", job_id)
        
        # Publish update to event stream
        await client.publish("job_updates", json.dumps(job))
        
        logger.info(f"Job Created: ID={job_id}, Type={job_type}, Queue={queue_name}")
        return job

    async def get_job(self, job_id: str) -> dict | None:
        """Retrieve job details from Redis."""
        client = await redis_manager.get_client()
        # Handle prefix if client passes "job:xxx" or "xxx"
        key = job_id if job_id.startswith("job:") else f"job:{job_id}"
        
        data = await client.get(key)
        if not data:
            return None
        return json.loads(data)

    async def update_job_status(self, job_id: str, status: str, progress: int = None, error: str = None, message: str = None) -> dict | None:
        """Update the status and progress of a job and publish progress."""
        client = await redis_manager.get_client()
        key = job_id if job_id.startswith("job:") else f"job:{job_id}"
        
        job = await self.get_job(key)
        if not job:
            logger.warning(f"Attempted to update non-existent job: {job_id}")
            return None
            
        old_status = job.get("status")
        job["status"] = status
        if progress is not None:
            job["progress"] = progress
        if error:
            job["error"] = error
        if message:
            job["message"] = message
            
        # Manage active jobs set
        if status == "processing":
            await client.sadd("active_jobs", key)
            if old_status != "processing":
                logger.info(f"Job Started: ID={key}")
        elif status in ["completed", "failed", "cancelled"]:
            await client.srem("active_jobs", key)
            if status == "completed":
                logger.info(f"Job Completed: ID={key}")
            elif status == "failed":
                logger.error(f"Job Failed: ID={key}, Error={error}")
        
        # Save updated metadata to Redis
        await client.set(key, json.dumps(job))
        
        # Publish to event stream
        await client.publish("job_updates", json.dumps(job))
        
        return job


redis_job_service = RedisJobService()
