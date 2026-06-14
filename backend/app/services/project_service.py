"""
ProjectService — business logic layer between API routes and the repository.

Keeps all application logic out of routes and raw SQL out of services.
"""
import logging
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.repository import project_repository
from app.db.models import Project
from app.schemas.project_schemas import ProjectDetail, ProjectSummary

logger = logging.getLogger(__name__)


class ProjectService:

    def save_project(
        self,
        db: Session,
        *,
        title: str,
        production_type: Optional[str],
        prompt: Optional[str],
        script: Optional[str],
        original_script: Optional[str] = None,
        storyboard: Optional[list],
        production_plan: Optional[dict],
        critic_review: Optional[dict] = None,
        approved: bool = False,
    ) -> Project:
        """
        Persist a completed generation as a Project record.
        Called automatically after a successful generation stream completes.
        """
        logger.info(f"Auto-saving project: '{title}' [{production_type}]")
        project = project_repository.create(
            db,
            title=title,
            production_type=production_type,
            prompt=prompt,
            script=script,
            original_script=original_script or script,
            storyboard=storyboard,
            production_plan=production_plan,
            critic_review=critic_review,
            approved=approved,
        )
        logger.info(f"Project saved: id={project.id}")
        return project

    def list_projects(self, db: Session) -> List[ProjectSummary]:
        """Return all projects as lightweight summaries for the sidebar."""
        projects = project_repository.get_all(db)
        return [ProjectSummary.model_validate(p) for p in projects]

    def get_project(self, db: Session, project_id: int) -> ProjectDetail:
        """Return a full project record. Raises 404 if not found."""
        project = self.get_project_model(db, project_id)
        if not project:
            raise HTTPException(
                status_code=404,
                detail=f"Project {project_id} not found.",
            )
        return ProjectDetail.model_validate(project)

    def get_project_model(self, db: Session, project_id: int) -> Optional[Project]:
        """Return the raw Project database model."""
        return project_repository.get_by_id(db, project_id)

    def delete_project(self, db: Session, project_id: int) -> None:
        """Delete a project. Raises 404 if not found."""
        deleted = project_repository.delete(db, project_id)
        if not deleted:
            raise HTTPException(
                status_code=404,
                detail=f"Project {project_id} not found.",
            )

    def update_project(self, db: Session, project_id: int, **kwargs) -> ProjectDetail:
        """Update a project's fields dynamically. Raises 404 if not found."""
        project = project_repository.update(db, project_id, **kwargs)
        if not project:
            raise HTTPException(
                status_code=404,
                detail=f"Project {project_id} not found.",
            )
        return ProjectDetail.model_validate(project)


project_service = ProjectService()
