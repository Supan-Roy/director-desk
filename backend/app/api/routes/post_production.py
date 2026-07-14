import os
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.repository import get_db, project_repository
from app.services import post_production_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Post Production"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class GenerateSubtitlesPayload(BaseModel):
    project_id: Optional[int] = 0
    movie_url: str


class SubtitleItem(BaseModel):
    id: int
    start: float
    end: float
    text: str


class UpdateSubtitlesPayload(BaseModel):
    project_id: int
    subtitles: List[SubtitleItem]


# ---------------------------------------------------------------------------
# Generate (async – returns task_id for polling)
# ---------------------------------------------------------------------------

@router.post("/post-production/subtitles/generate")
def generate_subtitles(payload: GenerateSubtitlesPayload,
                        background_tasks: BackgroundTasks,
                        db: Session = Depends(get_db)):
    """
    Kick off local (cost-free) subtitle generation via FFmpeg + faster-whisper.
    Returns immediately with a task_id; poll the status endpoint to track progress.
    Accepts project_id = 0 for unregistered (non-project) videos.
    """
    if payload.project_id and payload.project_id > 0:
        project = project_repository.get_by_id(db, payload.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        # Persist the movie URL up front so the front-end can reference it
        project_repository.update(db, payload.project_id,
                                  mastered_movie_url=payload.movie_url)

    task_id = str(uuid.uuid4())
    background_tasks.add_task(
        post_production_service.generate_subtitles_background,
        task_id,
        payload.project_id or 0,
        payload.movie_url,
    )

    return {"task_id": task_id, "status": "pending"}


# ---------------------------------------------------------------------------
# Generation status (polled by the front-end)
# ---------------------------------------------------------------------------

@router.get("/post-production/subtitles/generate/status/{task_id}")
def get_generation_status(task_id: str):
    """
    Return the current progress of a subtitle generation task.
    Matches the editor's export status pattern.
    """
    task = post_production_service.generation_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# ---------------------------------------------------------------------------
# Read / Update stored subtitles
# ---------------------------------------------------------------------------

@router.get("/post-production/subtitles")
def get_subtitles(project_id: int = Query(...), db: Session = Depends(get_db)):
    """Fetch the persisted subtitle timeline + metadata for a project."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    subtitles = project.subtitles or []
    stats = post_production_service.calculate_statistics(subtitles)

    return {
        "status": "success",
        "subtitles": subtitles,
        "statistics": stats,
        "mastered_movie_url": project.mastered_movie_url,
    }


@router.delete("/post-production/subtitles")
def delete_subtitles(project_id: int = Query(...), db: Session = Depends(get_db)):
    """Delete all subtitles for a project."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_repository.update(db, project_id, subtitles=[])
    return {"status": "success", "subtitles": []}


@router.put("/post-production/subtitles")
def update_subtitles(payload: UpdateSubtitlesPayload, db: Session = Depends(get_db)):
    """Save user-edited subtitle segments."""
    project = project_repository.get_by_id(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    updated_subs = [sub.model_dump() for sub in payload.subtitles]
    project_repository.update(db, payload.project_id, subtitles=updated_subs)
    stats = post_production_service.calculate_statistics(updated_subs)

    return {
        "status": "success",
        "subtitles": updated_subs,
        "statistics": stats,
    }


# ---------------------------------------------------------------------------
# Downloads
# ---------------------------------------------------------------------------

@router.get("/post-production/export/movie")
def download_master_movie(project_id: int = Query(...), db: Session = Depends(get_db)):
    """Download the mastered movie file."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.mastered_movie_url:
        raise HTTPException(status_code=400, detail="No mastered movie exists for this project.")

    filepath = post_production_service.resolve_filepath(project.mastered_movie_url)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Mastered movie not found: {filepath}")

    filename = os.path.basename(filepath)
    return FileResponse(path=filepath, filename=filename, media_type="video/mp4")


@router.get("/post-production/export/subtitles")
def download_subtitles(project_id: int = Query(...),
                        format: str = Query("srt"),
                        db: Session = Depends(get_db)):
    """Download subtitles as SRT or WebVTT."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    subtitles = project.subtitles or []
    if not subtitles:
        raise HTTPException(status_code=400, detail="No subtitles generated for this project.")

    fmt = format.lower()
    if fmt in ("vtt", "webvtt"):
        content = post_production_service.export_vtt(subtitles)
        media_type = "text/vtt"
        ext = "vtt"
    else:
        content = post_production_service.export_srt(subtitles)
        media_type = "application/x-subrip"
        ext = "srt"

    safe_title = "".join([c if c.isalnum() else "_" for c in project.title])
    filename = f"{safe_title}_subtitles.{ext}"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
