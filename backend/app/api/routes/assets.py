from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

from app.db.repository import get_db
from app.db.models import CharacterAsset, EnvironmentAsset, VoiceAsset, SceneVideo, Project

router = APIRouter(tags=["assets"])


RELEASE_TYPES = {
    "poster":         {"label": "Official Poster",  "ext": ".jpg",  "type_tag": "image"},
    "thumbnail":      {"label": "YouTube Thumbnail","ext": ".jpg",  "type_tag": "image"},
    "poster_vertical":{"label": "Vertical Poster",  "ext": ".jpg",  "type_tag": "image"},
    "banner":         {"label": "Social Banner",    "ext": ".jpg",  "type_tag": "image"},
    "trailer":        {"label": "Video Promo",      "ext": ".mp4",  "type_tag": "video"},
    "credits":        {"label": "End Credits",      "ext": ".json", "type_tag": "text"},
}

FILENAME_MAP = {
    "poster": "poster.jpg",
    "thumbnail": "thumbnail.jpg",
    "poster_vertical": "poster-vertical.jpg",
    "banner": "banner.jpg",
    "trailer": "trailer.mp4",
    "credits": "credits.json",
}


@router.get("/assets/global")
def get_global_assets(
    project_id: Optional[int] = Query(None, description="Filter assets by project ID"),
    search: Optional[str] = Query(None, description="Search term to filter asset names or prompts"),
    db: Session = Depends(get_db)
):
    """
    Get a unified list of all assets in the database, grouped by type.
    Only returns assets belonging to non-archived, non-deleted projects.
    Optionally filters by project_id or matches names/descriptions with a search query.
    """
    # 0. Only consider active (non-archived) projects
    active_project_ids = [
        p.id for p in db.query(Project.id).filter(Project.is_archived == False).all()
    ]
    if not active_project_ids:
        return {
            "characters": [], "environments": [], "voices": [],
            "videos": [], "posters": [], "video_promos": [], "end_credits": [],
        }

    # 1. Base queries — only active projects
    char_query = db.query(CharacterAsset).filter(CharacterAsset.project_id.in_(active_project_ids))
    env_query = db.query(EnvironmentAsset).filter(EnvironmentAsset.project_id.in_(active_project_ids))
    voice_query = db.query(VoiceAsset).filter(VoiceAsset.project_id.in_(active_project_ids))
    video_query = db.query(SceneVideo).filter(SceneVideo.project_id.in_(active_project_ids))

    # 2. Filter by project_id
    if project_id is not None:
        if project_id not in active_project_ids:
            return {
                "characters": [], "environments": [], "voices": [],
                "videos": [], "posters": [], "video_promos": [], "end_credits": [],
            }
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

    # 5. Get project title mappings
    projects = db.query(Project.id, Project.title).all()
    project_titles = {p.id: p.title for p in projects}

    # 6. Collect release assets from project.release_assets JSON
    posters = []
    video_promos = []
    end_credits = []

    project_query = db.query(Project).filter(Project.is_archived == False)
    if project_id is not None:
        project_query = project_query.filter(Project.id == project_id)
    all_projects = project_query.all()

    for proj in all_projects:
        ra = proj.release_assets or {}
        for key, info in RELEASE_TYPES.items():
            entry = ra.get(key)
            if not entry or not isinstance(entry, dict):
                continue
            if entry.get("status") != "completed" or not entry.get("url"):
                continue
            asset_item = {
                "id": f"release_{proj.id}_{key}",
                "project_id": proj.id,
                "project_title": proj.title or "Untitled",
                "label": info["label"],
                "type_tag": info["type_tag"],
                "asset_key": key,
                "url": entry["url"],
                "generated_at": entry.get("generated_at"),
                "duration": entry.get("duration"),
                "credit_data": entry.get("credit_data"),
            }
            if key in ("poster", "thumbnail", "poster_vertical", "banner"):
                posters.append(asset_item)
            elif key == "trailer":
                video_promos.append(asset_item)
            elif key == "credits":
                end_credits.append(asset_item)

    # Sort release assets by generated_at desc
    for lst in (posters, video_promos, end_credits):
        lst.sort(key=lambda x: x.get("generated_at") or "", reverse=True)

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
        "videos": [serialize_video(v) for v in videos],
        "posters": posters,
        "video_promos": video_promos,
        "end_credits": end_credits,
    }


# ── Delete endpoints ──────────────────────────────────────────────────────────


@router.delete("/assets/{asset_type}/{asset_id}")
def delete_asset(
    asset_type: str,
    asset_id: str,
    db: Session = Depends(get_db),
):
    """
    Delete an asset by type and ID.
    Supported types: character, environment, voice, video, release_asset
    """
    if asset_type == "character":
        asset = db.query(CharacterAsset).filter(CharacterAsset.id == int(asset_id)).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Character asset not found")
        db.delete(asset)
        db.commit()
        return {"status": "deleted", "type": "character"}

    elif asset_type == "environment":
        asset = db.query(EnvironmentAsset).filter(EnvironmentAsset.id == int(asset_id)).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Environment asset not found")
        db.delete(asset)
        db.commit()
        return {"status": "deleted", "type": "environment"}

    elif asset_type == "voice":
        asset = db.query(VoiceAsset).filter(VoiceAsset.id == int(asset_id)).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Voice asset not found")
        db.delete(asset)
        db.commit()
        return {"status": "deleted", "type": "voice"}

    elif asset_type == "video":
        asset = db.query(SceneVideo).filter(SceneVideo.id == int(asset_id)).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Video asset not found")
        db.delete(asset)
        db.commit()
        return {"status": "deleted", "type": "video"}

    elif asset_type == "release_asset":
        # asset_id format: release_{project_id}_{key}
        parts = asset_id.split("_", 2)
        if len(parts) != 3 or parts[0] != "release":
            raise HTTPException(status_code=400, detail="Invalid release asset ID format")
        project_id = int(parts[1])
        key = parts[2]
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        assets = dict(project.release_assets or {})
        if key not in assets:
            raise HTTPException(status_code=404, detail=f"Release asset '{key}' not found")
        # Remove the asset entry
        assets.pop(key, None)
        project.release_assets = assets
        db.commit()
        return {"status": "deleted", "type": "release_asset", "asset_key": key}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown asset type: {asset_type}")
