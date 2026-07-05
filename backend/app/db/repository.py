"""
ProjectRepository — database access layer.

All raw SQLAlchemy queries live here. Nothing above this layer
should import or touch the Session directly.
"""
from datetime import datetime, timezone
from typing import Generator, List, Optional

from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Project, User


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
# Repositories
# ---------------------------------------------------------------------------

class ProjectRepository:

    def create(
        self,
        db: Session,
        *,
        title: str,
        user_id: Optional[int] = None,
        production_type: Optional[str] = None,
        prompt: Optional[str] = None,
        script: Optional[str] = None,
        original_script: Optional[str] = None,
        storyboard: Optional[list] = None,
        production_plan: Optional[dict] = None,
        critic_review: Optional[dict] = None,
        scene_breakdown: Optional[dict] = None,
        environments: Optional[list] = None,
        voices: Optional[list] = None,
        approved: bool = False,
    ) -> Project:
        """Persist a new Project and return the saved instance."""
        now = datetime.now(timezone.utc)
        project = Project(
            title=title,
            user_id=user_id,
            production_type=production_type,
            prompt=prompt,
            script=script,
            original_script=original_script or script,
            storyboard=storyboard,
            production_plan=production_plan,
            critic_review=critic_review,
            scene_breakdown=scene_breakdown,
            environments=environments,
            voices=voices,
            approved=approved,
            created_at=now,
            updated_at=now,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    def get_all(self, db: Session, user_id: Optional[int] = None) -> List[Project]:
        """Return all projects filtered by user (if provided) ordered by newest modification first."""
        query = db.query(Project)
        if user_id is not None:
            query = query.filter(Project.user_id == user_id)
        return (
            query.order_by(Project.updated_at.desc())
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
        
        # Only update timestamp if modifying content fields (excluding title, pin, archive states)
        metadata_fields = {"title", "is_pinned", "is_archived"}
        if any(key not in metadata_fields for key in kwargs):
            project.updated_at = datetime.now(timezone.utc)
            
        db.commit()
        db.refresh(project)
        return project

    def delete_all(self, db: Session) -> None:
        """Permanently delete all project records from database."""
        db.query(Project).delete()
        db.commit()


class UserRepository:
    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.lower().strip()).first()

    def get_by_id(self, db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def get_by_delete_token(self, db: Session, token: str) -> Optional[User]:
        return db.query(User).filter(User.delete_token == token).first()

    def create(
        self,
        db: Session,
        *,
        name: str,
        last_name: Optional[str] = None,
        email: str,
        hashed_password: Optional[str] = None,
        is_google: bool = False
    ) -> User:
        now = datetime.now(timezone.utc)
        user = User(
            name=name,
            last_name=last_name,
            email=email.lower().strip(),
            hashed_password=hashed_password,
            is_google=is_google,
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def update(self, db: Session, user_id: int, **kwargs) -> Optional[User]:
        user = self.get_by_id(db, user_id)
        if not user:
            return None
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user

    def delete(self, db: Session, user_id: int) -> bool:
        user = self.get_by_id(db, user_id)
        if not user:
            return False
        db.delete(user)
        db.commit()
        return True


project_repository = ProjectRepository()
user_repository = UserRepository()
