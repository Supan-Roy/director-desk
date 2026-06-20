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

    # Pre-generate procedural VFX overlay video assets and SFX audio
    try:
        from app.utils.vfx_generator import generate_all_vfx_assets
        generate_all_vfx_assets()
    except Exception as exc:
        logger.error(f"Failed to generate procedural VFX assets on startup: {exc}")

    yield
    # (shutdown hooks go here if needed)


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
        ("projects", "approved", "BOOLEAN DEFAULT 0"),
        ("projects", "is_pinned", "BOOLEAN DEFAULT 0"),
        ("projects", "is_archived", "BOOLEAN DEFAULT 0"),
        ("projects", "scene_breakdown", "TEXT"),
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


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.router import api_router
from app.api.routes.showrunner import router as showrunner_router

app.include_router(api_router, prefix="/api")
app.include_router(showrunner_router, prefix="/api", tags=["Showrunner"])

from fastapi.staticfiles import StaticFiles
import os

os.makedirs("static/uploads", exist_ok=True)
os.makedirs("static/exports", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def root():
    return {"message": "Lights, Camera, Action!"}