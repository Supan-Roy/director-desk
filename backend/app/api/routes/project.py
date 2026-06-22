"""
Project API routes.

Endpoints:
  GET  /project/status          — in-memory project state (existing)
  POST /project/reset           — reset in-memory state (existing)
  GET  /projects                — list all saved projects (sidebar)
  GET  /projects/{id}           — get full saved project
  DELETE /projects/{id}         — delete a saved project
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.services.project_state import project_state
from app.services.project_service import project_service
from app.schemas.project_schemas import ProjectDetail, ProjectSummary, ProjectUpdate
from app.db.repository import get_db

router = APIRouter(tags=["project"])


# ---------------------------------------------------------------------------
# Existing in-memory state endpoints
# ---------------------------------------------------------------------------

@router.get("/project/status")
def get_project_status():
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
    project_state.reset()
    return {"message": "Project reset"}


# ---------------------------------------------------------------------------
# Persisted project CRUD
# ---------------------------------------------------------------------------

@router.get("/projects", response_model=List[ProjectSummary])
def list_projects(db: Session = Depends(get_db)):
    """Return all saved projects ordered newest-first (sidebar list)."""
    return project_service.list_projects(db)


@router.get("/projects/{project_id}", response_model=ProjectDetail)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Return the full content of a single saved project."""
    return project_service.get_project(db, project_id)


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Permanently delete a saved project."""
    project_service.delete_project(db, project_id)


@router.patch("/projects/{project_id}", response_model=ProjectDetail)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    """Update a saved project's fields (like script or approval)."""
    # Check if the in-memory state is this project, and update it as well
    if project_state.has_project and project_state.id == project_id:
        if payload.script is not None:
            project_state.script = payload.script
        if payload.original_script is not None:
            project_state.original_script = payload.original_script
        if payload.critic_review is not None:
            project_state.critic_review = payload.critic_review
        if payload.scene_breakdown is not None:
            project_state.scene_breakdown = payload.scene_breakdown
        if payload.environments is not None:
            project_state.environments = payload.environments
        if payload.voices is not None:
            project_state.voices = payload.voices
        if payload.approved is not None:
            project_state.approved = payload.approved

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


@router.get("/projects/export", response_model=List[ProjectDetail])
def export_projects(db: Session = Depends(get_db)):
    """Writely export all saved projects with scripts, storyboards, plans."""
    from app.db.repository import project_repository
    projects = project_repository.get_all(db)
    return [ProjectDetail.model_validate(p) for p in projects]


@router.delete("/projects", status_code=204)
def delete_all_projects(db: Session = Depends(get_db)):
    """Permanently delete all saved projects and reset workspace."""
    project_service.delete_all_projects(db)
    project_state.reset()


