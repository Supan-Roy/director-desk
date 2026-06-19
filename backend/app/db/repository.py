"""
ProjectRepository — database access layer.

All raw SQLAlchemy queries live here. Nothing above this layer
should import or touch the Session directly.
"""
from datetime import datetime, timezone
from typing import Generator, List, Optional

from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Project


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

def get_db() -> Generator[Session, None, None]:
    """Yield a SQLAlchemy session and close it when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Repository
# ---------------------------------------------------------------------------

class ProjectRepository:

    def create(
        self,
        db: Session,
        *,
        title: str,
        production_type: Optional[str] = None,
        prompt: Optional[str] = None,
        script: Optional[str] = None,
        original_script: Optional[str] = None,
        storyboard: Optional[list] = None,
        production_plan: Optional[dict] = None,
        critic_review: Optional[dict] = None,
        approved: bool = False,
    ) -> Project:
        """Persist a new Project and return the saved instance."""
        now = datetime.now(timezone.utc)
        project = Project(
            title=title,
            production_type=production_type,
            prompt=prompt,
            script=script,
            original_script=original_script or script,
            storyboard=storyboard,
            production_plan=production_plan,
            critic_review=critic_review,
            approved=approved,
            created_at=now,
            updated_at=now,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    def get_all(self, db: Session) -> List[Project]:
        """Return all projects ordered by newest modification first (summary only)."""
        return (
            db.query(Project)
            .order_by(Project.updated_at.desc())
            .all()
        )

    def get_by_id(self, db: Session, project_id: int) -> Optional[Project]:
        """Return a single project by id, or None if not found."""
        return db.query(Project).filter(Project.id == project_id).first()

    def delete(self, db: Session, project_id: int) -> bool:
        """Delete a project. Returns True if deleted, False if not found."""
        project = self.get_by_id(db, project_id)
        if not project:
            return False
        db.delete(project)
        db.commit()
        return True

    def update(self, db: Session, project_id: int, **kwargs) -> Optional[Project]:
        """Update a project's fields and return the updated instance."""
        project = self.get_by_id(db, project_id)
        if not project:
            return None
        for key, value in kwargs.items():
            if hasattr(project, key):
                setattr(project, key, value)
        project.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(project)
        return project

    def delete_all(self, db: Session) -> None:
        """Permanently delete all project records from database."""
        db.query(Project).delete()
        db.commit()


project_repository = ProjectRepository()
