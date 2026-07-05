from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List

from app.db.repository import get_db
from app.db.models import CharacterAsset, EnvironmentAsset, VoiceAsset, SceneVideo, Project

router = APIRouter(tags=["assets"])


@router.get("/assets/global")
def get_global_assets(
    project_id: Optional[int] = Query(None, description="Filter assets by project ID"),
    search: Optional[str] = Query(None, description="Search term to filter asset names or prompts"),
    db: Session = Depends(get_db)
):
    """
    Get a unified list of all assets in the database, grouped by type.
    Optionally filters by project_id or matches names/descriptions with a search query.
    """
    # 1. Base queries
    char_query = db.query(CharacterAsset)
    env_query = db.query(EnvironmentAsset)
    voice_query = db.query(VoiceAsset)
    video_query = db.query(SceneVideo)

    # 2. Filter by project_id
    if project_id is not None:
        char_query = char_query.filter(CharacterAsset.project_id == project_id)
        env_query = env_query.filter(EnvironmentAsset.project_id == project_id)
        voice_query = voice_query.filter(VoiceAsset.project_id == project_id)
        video_query = video_query.filter(SceneVideo.project_id == project_id)

    # 3. Filter by search query
    if search:
        search_term = f"%{search}%"
        char_query = char_query.filter(
            CharacterAsset.character_name.ilike(search_term) |
            CharacterAsset.generation_prompt.ilike(search_term)
        )
        env_query = env_query.filter(
            EnvironmentAsset.environment_name.ilike(search_term) |
            EnvironmentAsset.generation_prompt.ilike(search_term)
        )
        voice_query = voice_query.filter(
            VoiceAsset.character_name.ilike(search_term)
        )
        video_query = video_query.filter(
            SceneVideo.prompt_used.ilike(search_term) |
            SceneVideo.video_url.ilike(search_term)
        )

    # 4. Fetch results
    characters = char_query.order_by(CharacterAsset.created_at.desc()).all()
    environments = env_query.order_by(EnvironmentAsset.created_at.desc()).all()
    voices = voice_query.order_by(VoiceAsset.created_at.desc()).all()
    videos = video_query.order_by(SceneVideo.created_at.desc()).all()

    # 5. Get project title mappings for visual context in global mode
    projects = db.query(Project.id, Project.title).all()
    project_titles = {p.id: p.title for p in projects}

    # Helper to serialize assets and append project titles
    def serialize_char(c):
        return {
            "id": c.id,
            "project_id": c.project_id,
            "project_title": project_titles.get(c.project_id, "Unknown Project"),
            "character_name": c.character_name,
            "character_profile": c.character_profile,
            "image_url": c.image_url,
            "generation_prompt": c.generation_prompt,
            "created_at": c.created_at
        }

    def serialize_env(e):
        return {
            "id": e.id,
            "project_id": e.project_id,
            "project_title": project_titles.get(e.project_id, "Unknown Project"),
            "environment_name": e.environment_name,
            "environment_profile": e.environment_profile,
            "image_url": e.image_url,
            "generation_prompt": e.generation_prompt,
            "created_at": e.created_at
        }

    def serialize_voice(v):
        return {
            "id": v.id,
            "project_id": v.project_id,
            "project_title": project_titles.get(v.project_id, "Unknown Project"),
            "character_name": v.character_name,
            "voice_profile": v.voice_profile,
            "voice_signature": v.voice_signature,
            "preview_url": v.preview_url,
            "created_at": v.created_at
        }

    def serialize_video(vid):
        return {
            "id": vid.id,
            "project_id": vid.project_id,
            "project_title": project_titles.get(vid.project_id, "Unknown Project"),
            "scene_number": vid.scene_number,
            "video_url": vid.video_url,
            "thumbnail_url": vid.thumbnail_url,
            "duration": vid.duration,
            "generation_model": vid.generation_model,
            "prompt_used": vid.prompt_used,
            "status": vid.status,
            "version": vid.version,
            "is_approved": vid.is_approved,
            "error_message": vid.error_message,
            "created_at": vid.created_at
        }

    return {
        "characters": [serialize_char(c) for c in characters],
        "environments": [serialize_env(e) for e in environments],
        "voices": [serialize_voice(v) for v in voices],
        "videos": [serialize_video(v) for v in videos]
    }
