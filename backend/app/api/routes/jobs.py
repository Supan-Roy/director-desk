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


async def run_environment_generation_job(job_id: str, project_id: int, environment_name: str):
    import json
    import uuid
    import hashlib
    import urllib.request
    import os
    import logging
    from app.db.database import SessionLocal
    from app.db.models import Project, EnvironmentAsset
    from app.services.qwen_service import qwen_service
    
    db = SessionLocal()
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Starting environment generation task for {environment_name} (Job: {job_id})")
        await redis_job_service.update_job_status(job_id, "processing", progress=10, message=f"Generating {environment_name}...")
        await asyncio.sleep(0.5)
        
        await redis_job_service.update_job_status(job_id, "processing", progress=30, message="Building World Profile...")
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with ID {project_id} not found.")
            
        script_context = project.script or ""
        breakdown_context = json.dumps(project.scene_breakdown or {})
        
        # Call Qwen text model to expand the environment profile
        prompt = f"""
        Analyze this project's script and scene breakdown to expand the environment/location '{environment_name}' into a structured creative visual JSON profile.
        
        Script Context:
        {script_context[:3000]}
        
        Breakdown Context:
        {breakdown_context[:2000]}
        
        Provide the response strictly as a JSON block with these keys (do not add markdown code blocks or any introductory text, output pure JSON):
        {{
          "name": "{environment_name}",
          "description": "creative and highly descriptive paragraph of the environment location's look and feel",
          "environment_type": "extract or determine environment type (e.g. Interior, Exterior, Megacity, Space Station, Chamber)",
          "architecture": "describe architectural structures, style, materials, layout, shapes",
          "lighting": "lighting style (e.g. dawn golden light, neon glow, atmospheric shadows)",
          "weather": "weather/atmospheric state (e.g. clear, overcast, holographic rain)",
          "color_palette": "dominant colors (e.g. slate gray, deep amber, cobalt blue)",
          "mood": "emotional vibe/atmosphere (e.g. optimistic, solitary, chaotic, ancient)",
          "time_of_day": "time of day (e.g. Dawn, Sunset, Midnight, Noon)",
          "scene_appearances": ["Scene 01", "Scene 03"]
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
            logger.error(f"Failed to expand environment profile: {e}")
            # default fallback
            profile = {
                "name": environment_name,
                "description": f"A location of significance representing {environment_name}.",
                "environment_type": "Interior",
                "architecture": "Modern structure",
                "lighting": "Standard dynamic lighting",
                "weather": "Clear",
                "color_palette": "Monochromatic",
                "mood": "Neutral",
                "time_of_day": "Daytime",
                "scene_appearances": []
            }
            
        await redis_job_service.update_job_status(job_id, "processing", progress=50, message="Building Visual Identity...")
        safe_name = "".join([c if c.isalnum() else "_" for c in environment_name]).lower()
        environment_id = f"env_{safe_name}_{uuid.uuid4().hex[:8]}"
        environment_signature = f"{profile.get('environment_type')}, {profile.get('architecture')}, {profile.get('lighting')}, {profile.get('weather')}, {profile.get('mood')}, palette: {profile.get('color_palette')}"
        consistency_hash = hashlib.sha256(environment_signature.encode('utf-8')).hexdigest()[:16]
        
        profile["environment_id"] = environment_id
        profile["environment_signature"] = environment_signature
        profile["consistency_hash"] = consistency_hash
        
        # Populate scene appearances from project's default environments mapping if profile scenes list is empty
        if not profile.get("scene_appearances") and project.environments:
            for env_item in project.environments:
                if env_item.get("name") == environment_name:
                    profile["scene_appearances"] = env_item.get("scenes", [])
                    break
        
        await asyncio.sleep(0.5)
        
        await redis_job_service.update_job_status(job_id, "processing", progress=70, message="Generating Environment Reference...")
        # Construct the image generation prompt focusing on world-building and establishing reference shot
        image_prompt = f"Wide cinematic establishing shot, production reference image, concept art style of {environment_name}. Location details: {environment_signature}. Mood: {profile.get('mood')}. Style: cinematic key lighting, world building, visual identity, photorealistic, high detail."
        
        try:
            raw_image_url = await asyncio.to_thread(qwen_service.generate_image, image_prompt)
        except Exception as e:
            logger.error(f"Failed to generate environment reference image: {e}")
            raw_image_url = f"https://placehold.co/1024x1024.png?text={environment_name}+Reference"
            
        await asyncio.sleep(0.5)
        await redis_job_service.update_job_status(job_id, "processing", progress=90, message="Saving Asset...")
        
        try:
            os.makedirs("static/uploads", exist_ok=True)
            filename = f"env_{safe_name}_{uuid.uuid4().hex[:8]}.png"
            filepath = os.path.join("static/uploads", filename)
            await asyncio.to_thread(urllib.request.urlretrieve, raw_image_url, filepath)
            local_image_url = f"/static/uploads/{filename}"
        except Exception as e:
            logger.error(f"Failed to download generated environment portrait: {e}")
            local_image_url = "/static/uploads/placeholder.png"
            
        # Get version count
        version_count = db.query(EnvironmentAsset).filter(
            EnvironmentAsset.project_id == project_id,
            EnvironmentAsset.environment_name == environment_name
        ).count()
        version_num = version_count + 1
        
        profile["version"] = version_num
        profile["is_preferred"] = (version_count == 0)
        
        asset = EnvironmentAsset(
            project_id=project_id,
            environment_name=environment_name,
            environment_profile=profile,
            image_url=local_image_url,
            generation_prompt=image_prompt
        )
        db.add(asset)
        
        # update the projects.environments list record to point to the new generation_status
        envs = list(project.environments or [])
        env_found = False
        for env_item in envs:
            if env_item.get("name") == environment_name:
                env_item["generation_status"] = "Reference Compiled"
                env_found = True
                break
        if env_found:
            project.environments = envs
            
        db.commit()
        db.refresh(asset)
        
        logger.info(f"Environment asset saved: ID={asset.id}, Name={environment_name}, Version=v{version_num}")
        await redis_job_service.update_job_status(job_id, "completed", progress=100, message="Completed")
        
    except Exception as e:
        logger.error(f"Error running environment generation: {e}")
        await redis_job_service.update_job_status(job_id, "failed", error=str(e), message="Failed")
    finally:
        db.close()

import re
import urllib.request
import urllib.error
import json
import os
import asyncio
import logging

logger = logging.getLogger(__name__)

def extract_first_dialogue(script: str, character_name: str) -> str:
    if not script:
        return f"Hello, I am {character_name}. This is a preview of my voice profile."
        
    upper_name = character_name.upper()
    
    # Try pattern 1: LEO: hello
    pattern1 = re.compile(rf"(?:^|\n)\s*{upper_name}\s*:\s*([^\n]+)", re.IGNORECASE)
    match = pattern1.search(script)
    if match:
        return match.group(1).strip()
        
    # Try pattern 2: LEO on one line, dialogue on next line
    pattern2 = re.compile(rf"(?:^|\n)\s*{upper_name}\s*\n\s*([^\n]+)", re.IGNORECASE)
    match = pattern2.search(script)
    if match:
        return match.group(1).strip()
        
    # Default fallback
    return f"Hello, I am {character_name}. This is a preview of my voice profile."


async def synthesize_speech_via_dashscope(text: str, voice_name: str, output_path: str) -> bool:
    api_key = os.getenv("QWEN_API_KEY")
    if not api_key:
        logging.getLogger(__name__).error("QWEN_API_KEY not set, skipping actual speech synthesis.")
        return False
        
    api_base = os.getenv("QWEN_API_BASE_URL") or "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    if "/compatible-mode" in api_base:
        base_host = api_base.split("/compatible-mode")[0]
    else:
        base_host = "https://dashscope-intl.aliyuncs.com"
        
    url = f"{base_host}/api/v1/services/aigc/multimodal-generation/generation"
    
    # Map voice gender. Qwen3-TTS supports system voices like Cherry (female) and Ethan (male)
    voice = "Ethan"
    if voice_name.lower() in ["female", "tongtong", "cherry"]:
        voice = "Cherry"
        
    payload = {
        "model": "qwen3-tts-flash",
        "input": {
            "text": text
        },
        "parameters": {
            "voice": voice
        }
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    logging.getLogger(__name__).info(f"Synthesizing voice for text: '{text[:60]}' using voice '{voice}' via DashScope endpoint: {url}")
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    def _do_post():
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read()
            
    try:
        content_bytes = await asyncio.to_thread(_do_post)
        resp_json = json.loads(content_bytes.decode("utf-8"))
        audio_url = resp_json.get("output", {}).get("audio", {}).get("url")
        if not audio_url:
            logging.getLogger(__name__).error(f"No audio URL returned from DashScope Qwen-TTS: {resp_json}")
            return False
            
        def _download():
            with urllib.request.urlopen(audio_url) as d_resp:
                return d_resp.read()
                
        audio_data = await asyncio.to_thread(_download)
        with open(output_path, "wb") as f:
            f.write(audio_data)
            
        logging.getLogger(__name__).info(f"Successfully synthesized audio via Qwen-TTS: {output_path} ({len(audio_data)} bytes)")
        return True
    except urllib.error.HTTPError as he:
        try:
            err_body = he.read().decode("utf-8", errors="replace")
            logging.getLogger(__name__).error(f"DashScope Qwen-TTS HTTP Error {he.code}: {err_body}")
        except Exception:
            logging.getLogger(__name__).error(f"DashScope Qwen-TTS HTTP Error {he.code}")
        return False
    except Exception as e:
        logging.getLogger(__name__).error(f"DashScope Qwen-TTS generic error: {e}")
        return False


async def run_voice_generation_job(job_id: str, project_id: int, character_name: str):
    import json
    import uuid
    import hashlib
    import os
    import logging
    from app.db.database import SessionLocal
    from app.db.models import Project, VoiceAsset
    from app.services.qwen_service import qwen_service
    
    db = SessionLocal()
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Starting voice generation task for {character_name} (Job: {job_id})")
        await redis_job_service.update_job_status(job_id, "processing", progress=10, message=f"Analyzing Dialogue for {character_name}...")
        await asyncio.sleep(0.5)
        
        await redis_job_service.update_job_status(job_id, "processing", progress=35, message="Building Voice Identity...")
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with ID {project_id} not found.")
            
        script_context = project.script or ""
        breakdown_context = json.dumps(project.scene_breakdown or {})
        
        await redis_job_service.update_job_status(job_id, "processing", progress=70, message="Creating Voice Profile...")
        
        # Call Qwen text model to expand voice details
        prompt = f"""
        Analyze this project's script and scene breakdown to expand and define a consistent voice identity profile for character '{character_name}'.
        
        Script Context:
        {script_context[:3000]}
        
        Breakdown Context:
        {breakdown_context[:2000]}
        
        Provide the response strictly as a JSON block with these keys (do not add markdown code blocks or any introductory text, output pure JSON):
        {{
          "character_name": "{character_name}",
          "age_range": "e.g. child (6-10), teenager (13-18), young adult (19-30), middle-aged (35-50), senior (60+)",
          "voice_tone": "e.g. raspy, warm, deep, breathy, melodic, crisp, metallic, gravelly",
          "voice_energy": "e.g. High, Medium, Low, Subdued, Intense",
          "speech_pace": "e.g. Fast, Measured, Slow, Erratic",
          "emotion_range": "e.g. Wide, Subdued, Monotone, Highly Expressive",
          "accent": "e.g. Neutral American, British RP, Brooklyn, Southern, Non-native English, Robotic",
          "speaking_style": "describe speaking styles, patterns, stuttering, word choices, sentence lengths",
          "narrative_function": "role of their voice, e.g. main dialogue contributor, narrator, helper guide"
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
            logger.error(f"Failed to expand voice profile: {e}")
            profile = {
                "character_name": character_name,
                "age_range": "Young Adult",
                "voice_tone": "Warm",
                "voice_energy": "Medium",
                "speech_pace": "Measured",
                "emotion_range": "Wide",
                "accent": "Neutral",
                "speaking_style": "Standard conversational speech.",
                "narrative_function": "Dialogue contributor"
            }
            
        await redis_job_service.update_job_status(job_id, "processing", progress=90, message="Saving Voice Asset...")
        
        safe_name = "".join([c if c.isalnum() else "_" for c in character_name]).lower()
        voice_id = f"voice_{safe_name}_{uuid.uuid4().hex[:8]}"
        voice_signature = f"{profile.get('age_range')}, {profile.get('voice_tone')}, {profile.get('voice_energy')}, accent: {profile.get('accent')}, speed: {profile.get('speech_pace')}"
        consistency_hash = hashlib.sha256(voice_signature.encode('utf-8')).hexdigest()[:16]
        
        profile["voice_id"] = voice_id
        profile["voice_signature"] = voice_signature
        profile["consistency_hash"] = consistency_hash
        
        # Get version count
        version_count = db.query(VoiceAsset).filter(
            VoiceAsset.project_id == project_id,
            VoiceAsset.character_name == character_name
        ).count()
        version_num = version_count + 1
        
        profile["version"] = version_num
        profile["is_preferred"] = (version_count == 0)
        
        # settings schema for future TTS integration
        voice_settings = {
            "pitch": 1.0,
            "speed": 1.0,
            "style_weight": 1.0,
            "model_type": "Qwen-TTS-v1-Base"
        }
        
        # Determine character's gender
        from app.db.models import CharacterAsset
        char_asset = db.query(CharacterAsset).filter(
            CharacterAsset.project_id == project_id,
            CharacterAsset.character_name == character_name
        ).first()
        gender = "male"
        if char_asset and char_asset.character_profile:
            gender = char_asset.character_profile.get("gender", "male").lower()
            
        voice_gender = "female" if "female" in gender else "male"
        voice_tts_name = "tongtong" if voice_gender == "female" else "longanyang"
        
        # Extract dialogue line to speak
        speech_text = extract_first_dialogue(script_context, character_name)

        # Placeholder voice preview audio file
        preview_url = f"/static/uploads/preview_{safe_name}.wav"
        
        # Ensure we write a valid preview file
        os.makedirs("static/uploads", exist_ok=True)
        preview_path = f"static/uploads/preview_{safe_name}.wav"
        
        # Synthesize real speech via DashScope CosyVoice API
        tts_success = await synthesize_speech_via_dashscope(speech_text, voice_tts_name, preview_path)
        
        if not tts_success:
            logger.warning("TTS synthesis failed, falling back to static sound copy.")
            import shutil
            sfx_source = "static/sfx/magic.mp3"
            if os.path.exists(sfx_source):
                try:
                    shutil.copy(sfx_source, preview_path)
                except Exception as copy_err:
                    logger.error(f"Failed to copy placeholder audio: {copy_err}")
                    with open(preview_path, "wb") as f:
                        f.write(b"")
            else:
                if not os.path.exists(preview_path) or os.path.getsize(preview_path) == 0:
                    with open(preview_path, "wb") as f:
                        f.write(b"")
                
        asset = VoiceAsset(
            project_id=project_id,
            character_name=character_name,
            voice_profile=profile,
            voice_signature=voice_signature,
            voice_settings=voice_settings,
            preview_url=preview_url
        )
        db.add(asset)
        
        # update the projects.voices list record to point to the new status
        p_voices = list(project.voices or [])
        voice_found = False
        for v_item in p_voices:
            if v_item.get("character") == character_name:
                v_item["status"] = "Voice Model Ready"
                v_item["voice_id"] = voice_id
                v_item["voice_preview"] = preview_url
                v_item["consistency_status"] = "Verified"
                voice_found = True
                break
        if voice_found:
            project.voices = p_voices
            
        db.commit()
        db.refresh(asset)
        
        logger.info(f"Voice asset saved: ID={asset.id}, Character={character_name}, Version=v{version_num}")
        await redis_job_service.update_job_status(job_id, "completed", progress=100, message="Completed")
        
    except Exception as e:
        logger.error(f"Error running voice generation: {e}")
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
    if not request.target_id:
        raise HTTPException(status_code=400, detail="target_id (environment_name) is required")
        
    job = await redis_job_service.create_job(
        project_id=request.project_id, 
        job_type="environment_generation", 
        target_id=request.target_id
    )
    background_tasks.add_task(
        run_environment_generation_job, 
        job["job_id"], 
        int(request.project_id), 
        request.target_id
    )
    return job


@router.post("/api/generate/voice")
async def generate_voice(background_tasks: BackgroundTasks, request: GenerateJobRequest):
    if not request.target_id:
        raise HTTPException(status_code=400, detail="target_id (character_name) is required")
        
    job = await redis_job_service.create_job(
        project_id=request.project_id, 
        job_type="voice_generation", 
        target_id=request.target_id
    )
    background_tasks.add_task(
        run_voice_generation_job, 
        job["job_id"], 
        int(request.project_id), 
        request.target_id
    )
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
