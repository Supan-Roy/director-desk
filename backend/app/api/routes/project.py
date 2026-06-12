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
    """Update a saved project's fields (like script)."""
    # Check if the in-memory state is this project, and update it as well
    if project_state.has_project and project_state.id == project_id:
        if payload.script is not None:
            project_state.script = payload.script

    return project_service.update_project(db, project_id, script=payload.script)

