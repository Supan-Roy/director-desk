from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.repository import get_db

router = APIRouter(tags=['rendering'])


@router.get("/projects/{project_id}/scenes/videos")
def get_project_scene_videos(project_id: int, db: Session = Depends(get_db)):
    """Return all generated scene video versions for a project."""
    from app.db.models import SceneVideo
    videos = db.query(SceneVideo).filter(SceneVideo.project_id == project_id).all()
    return [
        {
            "id": v.id,
            "project_id": v.project_id,
            "scene_number": v.scene_number,
            "video_url": v.video_url,
            "thumbnail_url": v.thumbnail_url,
            "duration": v.duration,
            "generation_model": v.generation_model,
            "prompt_used": v.prompt_used,
            "status": v.status,
            "version": v.version,
            "is_approved": v.is_approved,
            "credits_used": v.credits_used,
            "error_message": v.error_message,
            "created_at": v.created_at.isoformat(),
            "updated_at": v.updated_at.isoformat()
        }
        for v in videos
    ]


@router.get("/projects/{project_id}/scenes/status")
def get_project_scenes_status(project_id: int, db: Session = Depends(get_db)):
    """Validate per-scene dependency readiness — checks characters, environments, voices, and prompts are generated."""
    from app.db.models import Project, CharacterAsset, EnvironmentAsset, VoiceAsset
    from sqlalchemy import func
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project.production_type in ("Podcast", "Audio Story"):
        label = "Podcast Audio" if project.production_type == "Podcast" else "Audio Story"
        return [{
            "scene_number": 1,
            "scene_number_str": label,
            "package_ready": True,
            "missing_assets": [],
            "details": {
                "location": "N/A",
                "characters": [],
                "duration": "5 Minutes",
                "summary": f"Full {project.production_type} audio compilation of the script",
                "prompt": f"{project.production_type} audio generation"
            }
        }]

    breakdown = project.scene_breakdown or {}
    scenes = breakdown.get("scenes", [])
    if not scenes:
        # Fallback to storyboard if scene_breakdown is not generated yet
        storyboard = project.storyboard or []
        scenes = []
        for idx, item in enumerate(storyboard):
            scene_num_str = f"SCENE {str(idx + 1).zfill(2)}"
            scenes.append({
                "scene_number": scene_num_str,
                "summary": item.get("description", ""),
                "ai_generation_prompt": item.get("ai_generation_prompt", item.get("description", "")),
                "negative_prompt": "cartoon, 3d, low quality",
                "location": item.get("environment", ""),
                "characters": []
            })
            
    # Load all character names for whom we have at least one character asset and voice asset in the DB
    char_assets = db.query(CharacterAsset.character_name).filter(CharacterAsset.project_id == project_id).all()
    char_assets_set = {c[0].lower().strip() for c in char_assets}
    
    voice_assets = db.query(VoiceAsset.character_name).filter(VoiceAsset.project_id == project_id).all()
    voice_assets_set = {v[0].lower().strip() for v in voice_assets}
    
    # Load all environment names for which we have reference assets
    env_assets = db.query(EnvironmentAsset.environment_name).filter(EnvironmentAsset.project_id == project_id).all()
    env_assets_set = {e[0].lower().strip() for e in env_assets}
    
    status_list = []
    
    for scene in scenes:
        scene_num_raw = scene.get("scene_number", "")
        scene_number = 1
        try:
            import re
            digits = re.findall(r'\d+', str(scene_num_raw))
            if digits:
                scene_number = int(digits[0])
        except Exception:
            pass
            
        scene_chars = scene.get("characters", [])
        if isinstance(scene_chars, str):
            scene_chars = [scene_chars]
            
        missing_assets = []
        
        # 1. Validate characters & voice profiles
        characters_ready = True
        voices_ready = True
        is_audio = project.production_type in ["Podcast", "Audio Story"]
        for char in scene_chars:
            trimmed_char = char.lower().strip() if isinstance(char, str) else ""
            if not trimmed_char:
                continue
            if not is_audio and trimmed_char not in char_assets_set:
                characters_ready = False
                missing_assets.append(f"Character asset for '{char}' is missing")
            if trimmed_char not in voice_assets_set:
                voices_ready = False
                missing_assets.append(f"Voice profile for '{char}' is missing")
                 
        # 2. Validate environment concept reference
        environments_ready = True
        location_name = scene.get("location") or scene.get("environment") or ""
        trimmed_loc = location_name.lower().strip()
        if trimmed_loc:
            env_found = False
            for ea in env_assets_set:
                if ea in trimmed_loc or trimmed_loc in ea:
                    env_found = True
                    break
            if not is_audio and not env_found:
                environments_ready = False
                missing_assets.append(f"Environment asset for '{location_name}' is missing")
                
        # 3. Validate prompt
        prompt_ready = bool(scene.get("ai_generation_prompt") or scene.get("summary"))
        if not prompt_ready:
            missing_assets.append("Scene prompt is missing")
            
        # 4. Overall production package status
        package_ready = characters_ready and environments_ready and voices_ready and prompt_ready
        
        status_list.append({
            "scene_number_str": scene_num_raw,
            "scene_number": scene_number,
            "characters_ready": characters_ready,
            "environments_ready": environments_ready,
            "voices_ready": voices_ready,
            "prompt_ready": prompt_ready,
            "package_ready": package_ready,
            "missing_assets": missing_assets,
            "details": {
                "location": location_name,
                "characters": scene_chars,
                "duration": scene.get("duration", "10 seconds"),
                "summary": scene.get("summary", ""),
                "prompt": scene.get("ai_generation_prompt", "")
            }
        })
        
    return status_list


@router.post("/projects/{project_id}/scenes/videos/{video_id}/approve")
def approve_scene_video(project_id: int, video_id: int, db: Session = Depends(get_db)):
    """Mark a specific scene video version as active/approved, and un-approve others."""
    from app.db.models import SceneVideo
    video = db.query(SceneVideo).filter(SceneVideo.id == video_id, SceneVideo.project_id == project_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    db.query(SceneVideo).filter(
        SceneVideo.project_id == project_id,
        SceneVideo.scene_number == video.scene_number,
        SceneVideo.id != video_id
    ).update({SceneVideo.is_approved: False}, synchronize_session=False)
    
    video.is_approved = True
    db.commit()
    return {"status": "success", "message": f"Scene {video.scene_number} version {video.version} approved"}


@router.post("/projects/{project_id}/scenes/videos/{video_id}/delete")
def delete_scene_video(project_id: int, video_id: int, db: Session = Depends(get_db)):
    """Delete a scene video version from history."""
    from app.db.models import SceneVideo
    video = db.query(SceneVideo).filter(SceneVideo.id == video_id, SceneVideo.project_id == project_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    db.delete(video)
    db.commit()
    return {"status": "success", "message": "Video version deleted successfully"}

