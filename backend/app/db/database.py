import os
import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///director_desk.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# ---------------------------------------------------------------------------
# Lightweight migration — add columns that may not exist yet
# ---------------------------------------------------------------------------

def run_migrations():
    """Add any missing columns to existing tables (safe for repeated runs)."""
    try:
        inspector = inspect(engine)
        columns = {c["name"] for c in inspector.get_columns("projects")}

        if "dubbed_movies" not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE projects ADD COLUMN dubbed_movies TEXT"))
                conn.commit()
                logger.info("Migration: added 'dubbed_movies' column to projects table")
    except Exception as exc:
        logger.warning("Migration check failed (table may not exist yet): %s", exc)


run_migrations()