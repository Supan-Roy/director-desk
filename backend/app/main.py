import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown lifecycle."""
    from app.db.database import engine
    from app.db.models import Base

    # Create tables that don't exist yet (idempotent)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialised.")

    # Run lightweight migrations for columns added after initial schema
    _run_migrations(engine)

    # Pre-generate procedural VFX overlay video assets and SFX audio in the background
    try:
        import threading
        from app.utils.vfx_generator import generate_all_vfx_assets
        threading.Thread(target=generate_all_vfx_assets, daemon=True).start()
    except Exception as exc:
        logger.error(f"Failed to start background procedural VFX generation: {exc}")

    # Connect to Redis
    from app.core.redis import redis_manager
    try:
        await redis_manager.connect()
    except Exception as exc:
        logger.error(f"Failed to connect to Redis on startup: {exc}")

    yield

    # Disconnect from Redis
    try:
        await redis_manager.disconnect()
    except Exception as exc:
        logger.error(f"Failed to disconnect from Redis on shutdown: {exc}")


def _run_migrations(engine) -> None:
    """
    Safely add any columns that exist in the ORM model but are missing from
    the live SQLite table (handles databases created before schema changes).
    """
    import sqlalchemy as sa

    migrations = [
        # (table, column_name, column_definition)
        ("projects", "updated_at", "DATETIME"),
        ("projects", "original_script", "TEXT"),
        ("projects", "critic_review", "TEXT"),
        ("users", "is_verified", "BOOLEAN DEFAULT 0"),
        ("users", "photo", "TEXT"),
        ("users", "dob", "TEXT"),
        ("projects", "approved", "BOOLEAN DEFAULT 0"),
        ("projects", "is_pinned", "BOOLEAN DEFAULT 0"),
        ("projects", "is_archived", "BOOLEAN DEFAULT 0"),
        ("projects", "scene_breakdown", "TEXT"),
        ("projects", "environments", "TEXT"),
        ("projects", "voices", "TEXT"),
        ("projects", "user_id", "INTEGER REFERENCES users(id) ON DELETE CASCADE"),
        ("projects", "release_assets", "TEXT"),
        ("projects", "subtitles", "TEXT"),
        ("projects", "mastered_movie_url", "TEXT"),
    ]

    with engine.connect() as conn:
        for table, col, col_def in migrations:
            try:
                result = conn.execute(sa.text(f"PRAGMA table_info({table})"))
                existing_cols = {row[1] for row in result}
                if col not in existing_cols:
                    conn.execute(sa.text(
                        f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"
                    ))
                    conn.commit()
                    logger.info(f"Migration: added column '{col}' to '{table}'")
            except Exception as exc:
                logger.warning(f"Migration skipped for {table}.{col}: {exc}")


openapi_tags = [
    {"name": "health", "description": "Server health check endpoints."},
    {"name": "script", "description": "Read and update the current working script."},
    {"name": "storyboard", "description": "Read the current storyboard data."},
    {"name": "scene_breakdown", "description": "Read the current scene breakdown (per-scene technical specs)."},
    {"name": "planning", "description": "Read the current production plan."},
    {"name": "project", "description": "Create, read, update, delete, export, and list saved projects."},
    {"name": "Showrunner", "description": "Generate stories — synchronous or streaming — and resume interrupted generations."},
    {"name": "agents", "description": "List available agents and chat with them for modifications."},
    {"name": "assets", "description": "Browse global generated assets (characters, environments, voices, videos)."},
    {"name": "editor", "description": "Upload media files, export videos, and check export status."},
    {"name": "rendering", "description": "List, approve, and delete scene video versions."},
    {"name": "auth", "description": "User authentication — email/password login, registration, OTP verification, Google OAuth, logout, and session."},
    {"name": "settings_auth", "description": "Account deletion request and confirmation (OTP-verified)."},
    {"name": "jobs", "description": "Background job management for asset generation and scene video rendering."},
    {"name": "release", "description": "Release Studio — generate promotional assets (poster, thumbnail, trailer, credits) and download release packages."},
]

app = FastAPI(
    title="Director Desk API",
    description="AI-powered film production studio API. Orchestrates the entire creative pipeline — from screenwriting and storyboarding to asset generation, scene video rendering, and final video export.\n\n---\n\n### Key Capabilities\n\n- **Story Generation** — Synchronous and streaming generation with Writer, Storyboard, Planner, and Critic agents\n- **Scene Breakdown** — Per-scene technical specs optimized for AI video models (Wan, Veo, HappyHorse, Luma)\n- **Asset Generation** — Character portraits, environment references, voice profiles with version management\n- **Scene Videos** — Generate, approve, version, and delete per-scene AI videos\n- **Video Editor** — Multi-track video assembly with FFmpeg export (subtitles, VFX, filters, audio sync)\n- **User Accounts** — Email/password auth with OTP verification, Google OAuth, profile management\n- **Projects** — Full CRUD with save, archive, pin, export backup as JSON\n",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=openapi_tags,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.router import api_router
from app.api.routes.showrunner import router as showrunner_router
from app.api.routes.jobs import router as jobs_router

app.include_router(api_router, prefix="/api")
app.include_router(showrunner_router, prefix="/api", tags=["Showrunner"])
app.include_router(jobs_router)

from fastapi.staticfiles import StaticFiles
import os

os.makedirs("static/uploads", exist_ok=True)
os.makedirs("static/exports", exist_ok=True)
os.makedirs("static/release-assets", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def root():
    """Root health check — returns a cinematic greeting."""
    return {"message": "Lights, Camera, Action!"}