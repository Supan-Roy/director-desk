"""
Project API routes.

Endpoints:
  GET  /project/status          — in-memory project state (existing)
  POST /project/reset           — reset in-memory state (existing)
  GET  /projects                — list all saved projects (sidebar)
  GET  /projects/{id}           — get full saved project
  DELETE /projects/{id}         — delete a saved project
"""
from typing import List, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.services.project_state import project_state
from app.services.project_service import project_service
from app.schemas.project_schemas import ProjectDetail, ProjectSummary, ProjectUpdate
from app.db.repository import get_db
from app.services.auth_service import get_current_user, require_user
from app.db.models import User

router = APIRouter(tags=["project"])


# ---------------------------------------------------------------------------
# Existing in-memory state endpoints
# ---------------------------------------------------------------------------

@router.get("/project/status")
def get_project_status():
    """Return the current in-memory project state — agents, script, storyboard, plan, and review."""
    agents = [agent.to_dict() for agent in project_state.agents]
    return {
        "id": project_state.id,
        "hasProject": project_state.has_project,
        "title": project_state.title,
        "agents": agents,
        "productionType": project_state.production_type,
        "criticReview": project_state.critic_review,
        "sceneBreakdown": project_state.scene_breakdown,
        "environments": project_state.environments,
        "voices": project_state.voices,
        "originalScript": project_state.original_script,
        "script": project_state.script,
        "approved": project_state.approved,
    }


@router.post("/project/reset")
def reset_project():
    """Reset the in-memory project state to default (clear agents, script, storyboard)."""
    project_state.reset()
    return {"message": "Project reset"}


# ---------------------------------------------------------------------------
# Persisted project CRUD
# ---------------------------------------------------------------------------

@router.get("/projects/featured")
def get_featured_projects():
    """Return the list of featured productions (demo content) for the dashboard."""
    return [
        {
            "id": "neo-tokyo",
            "title": "Neo Tokyo 2099",
            "tag": "Cyberpunk Thriller",
            "description": "A noir detective follows a digital signal deep into the towering, wet skyscrapers of Tokyo.",
            "image": "/images/neotokyo_featured.png",
            "scenes": "32 Scenes",
            "agents": "4 Agents",
            "rating": "98% Match",
            "accent": "#8b5cf6",
            "format": "4K RED RAW // Rec.2020",
            "status": "VFX Master Render",
            "progress": 92
        },
        {
            "id": "quiet-camera",
            "title": "The Quiet Camera",
            "tag": "Drama",
            "description": "An elderly lady recalls a lifetime of moments long forgotten.",
            "image": "/images/camera_featured.png",
            "scenes": "18 Scenes",
            "agents": "3 Agents",
            "rating": "95% Match",
            "accent": "#f59e0b",
            "format": "35mm Kodak // Dolby Vision",
            "status": "Color Grading",
            "progress": 85
        },
        {
            "id": "echoes-apollo",
            "title": "Echoes of Apollo",
            "tag": "Sci-Fi",
            "description": "Stranded on the moon, a lone engineer detects a signal from Earth.",
            "image": "/images/apollo_featured.png",
            "scenes": "24 Scenes",
            "agents": "5 Agents",
            "rating": "99% Match",
            "accent": "#ec4899",
            "format": "70mm IMAX // Atmos 16-bit",
            "status": "Audio Master Align",
            "progress": 99
        },
        {
            "id": "last-lighthouse",
            "title": "The Last Lighthouse",
            "tag": "Drama",
            "description": "A keeper's final log before the storm that changed everything.",
            "image": "/images/lighthouse_featured.png",
            "scenes": "16 Scenes",
            "agents": "3 Agents",
            "rating": "97% Match",
            "accent": "#10b981",
            "format": "Arri Alexa 65 // Rec.709",
            "status": "Release Master Ready",
            "progress": 100
        }
    ]

@router.post("/projects/demo")
def create_demo_project(db: Session = Depends(get_db)):
    """Load the pre-generated demo project JSON fixture and insert it directly into the database."""
    import json
    import os
    
    # Try different relative paths to find the JSON fixture file
    fixture_path = os.path.join("app", "data", "demo_project_fixture.json")
    if not os.path.exists(fixture_path):
        fixture_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "demo_project_fixture.json")
        
    if not os.path.exists(fixture_path):
        fixture_path = os.path.join("backend", "app", "data", "demo_project_fixture.json")
        
    if not os.path.exists(fixture_path):
        raise HTTPException(status_code=404, detail="Demo project fixture not found.")
        
    try:
        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to parse demo project fixture: {str(exc)}")
        
    from app.db.repository import project_repository
    try:
        project = project_repository.create(
            db,
            title=data.get("title", "The Boy Who Built His Robot Best Friend"),
            production_type=data.get("production_type", "Short Film"),
            prompt=data.get("prompt"),
            script=data.get("script"),
            original_script=data.get("original_script"),
            storyboard=data.get("storyboard"),
            production_plan=data.get("production_plan"),
            critic_review=data.get("critic_review"),
            scene_breakdown=data.get("scene_breakdown"),
            environments=data.get("environments"),
            voices=data.get("voices"),
            approved=data.get("approved", True),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database insertion failed: {str(exc)}")
        
    return {"status": "success", "id": project.id, "title": project.title}
@router.get("/projects", response_model=List[ProjectSummary])
def list_projects(db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user)):
    """Return all saved projects belonging to the logged in user, or anonymous ones if not logged in."""
    user_id = current_user.id if current_user else None
    return project_service.list_projects(db, user_id=user_id)


@router.get("/projects/export", response_model=List[ProjectDetail])
def export_projects(db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    """Writely export all saved projects with scripts, storyboards, plans for current user."""
    from app.db.repository import project_repository
    projects = project_repository.get_all(db, user_id=current_user.id)
    return [ProjectDetail.model_validate(p) for p in projects]


@router.get("/projects/{project_id}", response_model=ProjectDetail)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Return the full content of a single saved project."""
    project_model = project_service.get_project_model(db, project_id)
    if not project_model:
        raise HTTPException(status_code=404, detail="Project not found.")

    return project_service.get_project(db, project_id)


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user)):
    """Permanently delete a saved project after verifying ownership."""
    project_model = project_service.get_project_model(db, project_id)
    if not project_model:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Allow if project is unowned (legacy/guest) or belongs to the authenticated user
    if project_model.user_id is not None and (not current_user or project_model.user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this project."
        )

    project_service.delete_project(db, project_id)


@router.post("/projects/save-current", response_model=ProjectDetail)
def save_current_project(db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    """Persist the current in-memory project workspace to database under the current user's profile."""
    if not project_state.has_project:
        raise HTTPException(status_code=400, detail="No active project in-memory to save.")

    storyboard_data = []
    for scene in (project_state.storyboard or []):
        if hasattr(scene, "__dict__"):
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

    project = project_service.save_project(
        db,
        title=project_state.title or "Untitled Production",
        user_id=current_user.id,
        production_type=project_state.production_type,
        prompt=project_state.prompt or "Manual script creation",
        script=project_state.script,
        original_script=project_state.original_script,
        storyboard=storyboard_data,
        production_plan=project_state.production_plan,
        critic_review=project_state.critic_review,
        scene_breakdown=project_state.scene_breakdown,
        approved=project_state.approved,
    )

    project_state.id = project.id
    return project_service.get_project(db, project.id)


@router.patch("/projects/{project_id}", response_model=ProjectDetail)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user)):
    """Update a saved project's fields after verifying ownership."""
    project_model = project_service.get_project_model(db, project_id)
    if not project_model:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Allow if project is unowned (legacy/guest) or belongs to the authenticated user
    if project_model.user_id is not None and (not current_user or project_model.user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this project."
        )

    update_dict = payload.model_dump(exclude_unset=True)
    return project_service.update_project(db, project_id, **update_dict)


@router.post("/projects/{project_id}/refine", response_model=ProjectDetail)
def refine_project_endpoint(project_id: int, db: Session = Depends(get_db)):
    """Use Editor Agent to refine a project's script based on its critic review."""
    project = project_service.get_project_model(db, project_id)
    if not project:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not project.critic_review:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Project does not have a critic review yet")
        
    # Run the Editor Agent
    from app.agents.editor_agent import editor_agent
    original_script = project.original_script or project.script or ""
    refined_script = editor_agent.refine_script(original_script, project.critic_review)
    
    # Save the refined script in the database, leaving original_script untouched
    updated_project = project_service.update_project(db, project_id, script=refined_script, approved=False)
    
    # Sync with in-memory project_state if active
    if project_state.has_project and project_state.id == project_id:
        project_state.script = refined_script
        project_state.approved = False
        
    return updated_project


@router.post("/projects/refine-raw")
def refine_raw_script(payload: dict):
    """Refine a raw script based on a raw critic review body."""
    script = payload.get("script", "")
    critic_review = payload.get("critic_review", {})
    if not script or not critic_review:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="script and critic_review are required")
        
    from app.agents.editor_agent import editor_agent
    refined_script = editor_agent.refine_script(script, critic_review)
    return {"refined_script": refined_script}


@router.delete("/projects", status_code=204)
def delete_all_projects(db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    """Permanently delete all saved projects belonging to current user and reset in-memory workspace."""
    from app.db.models import Project
    db.query(Project).filter(Project.user_id == current_user.id).delete()
    db.commit()
    project_state.reset()


def _verify_project_ownership(db: Session, project_id: int, user: Optional[User]):
    project_model = project_service.get_project_model(db, project_id)
    if not project_model:
        raise HTTPException(status_code=404, detail="Project not found.")
    if project_model.user_id is not None:
        if not user or user.id != project_model.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this project's assets."
            )


class SelectVersionRequest(BaseModel):
    character_name: str
    preferred_asset_id: int


@router.get("/projects/{project_id}/characters")
def get_project_characters(project_id: int, db: Session = Depends(get_db)):
    """Return all generated character assets for a given project."""
    from app.db.models import CharacterAsset
    assets = db.query(CharacterAsset).filter(CharacterAsset.project_id == project_id).all()
    return [
        {
            "id": asset.id,
            "project_id": asset.project_id,
            "character_name": asset.character_name,
            "character_profile": asset.character_profile,
            "image_url": asset.image_url,
            "generation_prompt": asset.generation_prompt,
            "created_at": asset.created_at.isoformat(),
            "updated_at": asset.updated_at.isoformat()
        }
        for asset in assets
    ]


@router.post("/projects/{project_id}/characters/select-version")
def select_character_version(project_id: int, payload: SelectVersionRequest, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    """Set a specific character version as the preferred/active one."""
    _verify_project_ownership(db, project_id, current_user)
    from app.db.models import CharacterAsset
    assets = db.query(CharacterAsset).filter(
        CharacterAsset.project_id == project_id, 
        CharacterAsset.character_name == payload.character_name
    ).all()
    
    for asset in assets:
        profile = dict(asset.character_profile)
        profile["is_preferred"] = (asset.id == payload.preferred_asset_id)
        # SQLAlchemy requires assignment to mark the field as dirty
        asset.character_profile = profile
        
    db.commit()
    return {"status": "success"}


class SelectEnvironmentVersionRequest(BaseModel):
    environment_name: str
    preferred_asset_id: int


@router.get("/projects/{project_id}/environments")
def get_project_environments(project_id: int, db: Session = Depends(get_db)):
    """Return all generated environment assets for a given project."""
    from app.db.models import EnvironmentAsset
    assets = db.query(EnvironmentAsset).filter(EnvironmentAsset.project_id == project_id).all()
    return [
        {
            "id": asset.id,
            "project_id": asset.project_id,
            "environment_name": asset.environment_name,
            "environment_profile": asset.environment_profile,
            "image_url": asset.image_url,
            "generation_prompt": asset.generation_prompt,
            "created_at": asset.created_at.isoformat(),
            "updated_at": asset.updated_at.isoformat()
        }
        for asset in assets
    ]


@router.post("/projects/{project_id}/environments/select-version")
def select_environment_version(project_id: int, payload: SelectEnvironmentVersionRequest, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    """Set a specific environment version as the preferred/active one."""
    _verify_project_ownership(db, project_id, current_user)
    from app.db.models import EnvironmentAsset
    assets = db.query(EnvironmentAsset).filter(
        EnvironmentAsset.project_id == project_id, 
        EnvironmentAsset.environment_name == payload.environment_name
    ).all()
    
    for asset in assets:
        profile = dict(asset.environment_profile)
        profile["is_preferred"] = (asset.id == payload.preferred_asset_id)
        # SQLAlchemy requires assignment to mark the field as dirty
        asset.environment_profile = profile
        
    db.commit()
    return {"status": "success"}


class SelectVoiceVersionRequest(BaseModel):
    character_name: str
    preferred_asset_id: int


@router.get("/projects/{project_id}/voices")
def get_project_voices(project_id: int, db: Session = Depends(get_db)):
    """Return all generated voice assets for a given project."""

    from app.db.models import VoiceAsset
    assets = db.query(VoiceAsset).filter(VoiceAsset.project_id == project_id).all()
    return [
        {
            "id": asset.id,
            "project_id": asset.project_id,
            "character_name": asset.character_name,
            "voice_profile": asset.voice_profile,
            "voice_signature": asset.voice_signature,
            "voice_settings": asset.voice_settings,
            "preview_url": asset.preview_url,
            "created_at": asset.created_at.isoformat(),
            "updated_at": asset.updated_at.isoformat()
        }
        for asset in assets
    ]


@router.post("/projects/{project_id}/voices/select-version")
def select_voice_version(project_id: int, payload: SelectVoiceVersionRequest, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    """Set a specific voice version as the preferred/active one."""
    _verify_project_ownership(db, project_id, current_user)
    from app.db.models import VoiceAsset
    assets = db.query(VoiceAsset).filter(
        VoiceAsset.project_id == project_id, 
        VoiceAsset.character_name == payload.character_name
    ).all()
    
    for asset in assets:
        profile = dict(asset.voice_profile)
        profile["is_preferred"] = (asset.id == payload.preferred_asset_id)
        asset.voice_profile = profile
        
    db.commit()
    return {"status": "success"}


# ---------------------------------------------------------------------------
# Custom Templates CRUD
# ---------------------------------------------------------------------------

class CreateTemplateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    production_type: str
    aspect_ratio: str = "16:9"
    camera_style: str = "pan"
    lenses: Optional[str] = None
    lighting: Optional[str] = None
    color_grade: Optional[str] = None
    prompt_examples: Optional[List[str]] = None


@router.get("/templates/custom")
def get_custom_templates(db: Session = Depends(get_db)):
    """List all user-defined custom templates."""
    from app.db.models import CreativeTemplateModel
    templates = db.query(CreativeTemplateModel).order_by(CreativeTemplateModel.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "production_type": t.production_type,
            "aspect_ratio": t.aspect_ratio,
            "camera_style": t.camera_style,
            "lenses": t.lenses,
            "lighting": t.lighting,
            "color_grade": t.color_grade,
            "prompt_examples": t.prompt_examples or [],
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in templates
    ]


@router.post("/templates/custom")
def create_custom_template(payload: CreateTemplateRequest, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    """Create a new custom template (requires registration)."""
    from app.db.models import CreativeTemplateModel
    t = CreativeTemplateModel(
        title=payload.title,
        description=payload.description,
        production_type=payload.production_type,
        aspect_ratio=payload.aspect_ratio,
        camera_style=payload.camera_style,
        lenses=payload.lenses,
        lighting=payload.lighting,
        color_grade=payload.color_grade,
        prompt_examples=payload.prompt_examples or []
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"status": "success", "id": t.id}


@router.delete("/templates/custom/{id}")
def delete_custom_template(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    """Delete a custom template by id (requires registration)."""
    from app.db.models import CreativeTemplateModel
    t = db.query(CreativeTemplateModel).filter(CreativeTemplateModel.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t)
    db.commit()
    return {"status": "success"}





