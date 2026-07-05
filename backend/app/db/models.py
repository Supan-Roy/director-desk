import json
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    is_google = Column(Boolean, default=False, nullable=False)
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    delete_token = Column(String, nullable=True)
    delete_token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    title = Column(String, index=True, nullable=False)
    production_type = Column(String, nullable=True)
    prompt = Column(Text, nullable=True)

    user = relationship("User", back_populates="projects")

    script = Column(Text, nullable=True)

    original_script = Column(Text, nullable=True)

    critic_review = Column(JSONType, nullable=True)

    approved = Column(Boolean, default=False, nullable=False)

    is_pinned = Column(Boolean, default=False, nullable=False)

    is_archived = Column(Boolean, default=False, nullable=False)

    storyboard = Column(JSONType, nullable=True)       # list of scene dicts

    production_plan = Column(JSONType, nullable=True)  # nested plan dict

    scene_breakdown = Column(JSONType, nullable=True)  # nested breakdown dict

    environments = Column(JSONType, nullable=True)     # list of environment dicts
    voices = Column(JSONType, nullable=True)           # list of voice dicts

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    @property
    def aspect_ratio(self) -> str:
        """Dynamically extract aspect ratio from prompt tag fallback to 16:9."""
        if not self.prompt:
            return "16:9"
        import re
        match = re.search(r'\[Aspect:\s*([^,\]]+)', self.prompt)
        if match:
            return match.group(1).strip()
        return "16:9"


class CharacterAsset(Base):
    __tablename__ = "character_assets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True, nullable=False)
    character_name = Column(String, index=True, nullable=False)
    character_profile = Column(JSONType, nullable=False)
    image_url = Column(String, nullable=True)
    generation_prompt = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class EnvironmentAsset(Base):
    __tablename__ = "environment_assets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True, nullable=False)
    environment_name = Column(String, index=True, nullable=False)
    environment_profile = Column(JSONType, nullable=False)
    image_url = Column(String, nullable=True)
    generation_prompt = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class VoiceAsset(Base):
    __tablename__ = "voice_assets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True, nullable=False)
    character_name = Column(String, index=True, nullable=False)
    voice_profile = Column(JSONType, nullable=False)
    voice_signature = Column(String, nullable=True)
    voice_settings = Column(JSONType, nullable=True)
    preview_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SceneVideo(Base):
    __tablename__ = "scene_videos"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True, nullable=False)
    scene_number = Column(Integer, index=True, nullable=False)
    video_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    duration = Column(Integer, nullable=True)
    generation_model = Column(String, nullable=False)
    prompt_used = Column(Text, nullable=False)
    status = Column(String, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    is_approved = Column(Boolean, default=False, nullable=False)
    credits_used = Column(Integer, default=80, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class CreativeTemplateModel(Base):
    __tablename__ = "custom_templates"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    production_type = Column(String, nullable=False)
    aspect_ratio = Column(String, default="16:9")
    camera_style = Column(String, default="pan")
    lenses = Column(String, nullable=True)
    lighting = Column(String, nullable=True)
    color_grade = Column(String, nullable=True)
    prompt_examples = Column(JSONType, nullable=True)  # list of strings
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )