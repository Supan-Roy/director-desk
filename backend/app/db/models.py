import json
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.types import TypeDecorator

from app.db.database import Base


class JSONType(TypeDecorator):
    """Stores Python dicts/lists as JSON text in SQLite."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return None


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, index=True, nullable=False)

    production_type = Column(String, nullable=True)

    prompt = Column(Text, nullable=True)

    script = Column(Text, nullable=True)

    original_script = Column(Text, nullable=True)

    critic_review = Column(JSONType, nullable=True)

    approved = Column(Boolean, default=False, nullable=False)

    is_pinned = Column(Boolean, default=False, nullable=False)

    is_archived = Column(Boolean, default=False, nullable=False)

    storyboard = Column(JSONType, nullable=True)       # list of scene dicts

    production_plan = Column(JSONType, nullable=True)  # nested plan dict

    scene_breakdown = Column(JSONType, nullable=True)  # nested breakdown dict

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )