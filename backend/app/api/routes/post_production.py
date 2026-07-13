import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.repository import get_db, project_repository
from app.services import post_production_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Post Production"])


class GenerateSubtitlesPayload(BaseModel):
    project_id: int
    movie_url: str


class SubtitleItem(BaseModel):
    id: int
    start: float
    end: float
    text: str


class UpdateSubtitlesPayload(BaseModel):
    project_id: int
    subtitles: List[SubtitleItem]


@router.post("/post-production/subtitles/generate")
def generate_subtitles(payload: GenerateSubtitlesPayload, db: Session = Depends(get_db)):
    """
    Triggers subtitle generation for the mastered movie of a project.
    Stores the generated subtitle timeline in the database.
    """
    project = project_repository.get_by_id(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        # Save movie_url as mastered_movie_url first
        project_repository.update(db, payload.project_id, mastered_movie_url=payload.movie_url)

        # Transcribe audio to build subtitle timeline
        subtitles = post_production_service.transcribe_audio(payload.project_id, payload.movie_url, db)

        # Save generated subtitles to project
        project_repository.update(db, payload.project_id, subtitles=subtitles)

        # Calculate subtitle timeline metrics
        stats = post_production_service.calculate_statistics(subtitles)

        return {
            "status": "success",
            "subtitles": subtitles,
            "statistics": stats
        }
    except Exception as e:
        logger.error(f"Subtitle generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/post-production/subtitles")
def get_subtitles(project_id: int = Query(...), db: Session = Depends(get_db)):
    """
    Fetches the generated subtitle timeline for a project.
    """
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    subtitles = project.subtitles or []
    stats = post_production_service.calculate_statistics(subtitles)
    
    return {
        "status": "success",
        "subtitles": subtitles,
        "statistics": stats,
        "mastered_movie_url": project.mastered_movie_url
    }


@router.put("/post-production/subtitles")
def update_subtitles(payload: UpdateSubtitlesPayload, db: Session = Depends(get_db)):
    """
    Updates the subtitle timeline with user modifications.
    """
    project = project_repository.get_by_id(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        updated_subs = [sub.model_dump() for sub in payload.subtitles]
        project_repository.update(db, payload.project_id, subtitles=updated_subs)
        stats = post_production_service.calculate_statistics(updated_subs)

        return {
            "status": "success",
            "subtitles": updated_subs,
            "statistics": stats
        }
    except Exception as e:
        logger.error(f"Failed to update subtitles: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/post-production/export/movie")
def download_master_movie(project_id: int = Query(...), db: Session = Depends(get_db)):
    """
    Download the mastered video file for a project.
    """
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.mastered_movie_url:
        raise HTTPException(status_code=400, detail="No mastered movie exists for this project.")

    filepath = post_production_service.resolve_filepath(project.mastered_movie_url)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Mastered movie file not found: {filepath}")

    filename = os.path.basename(filepath)
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="video/mp4"
    )


@router.get("/post-production/export/subtitles")
def download_subtitles(project_id: int = Query(...), format: str = Query("srt"), db: Session = Depends(get_db)):
    """
    Download subtitles in SRT or WebVTT format.
    """
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    subtitles = project.subtitles or []
    if not subtitles:
        raise HTTPException(status_code=400, detail="No subtitles generated for this project.")

    fmt = format.lower()
    if fmt == "vtt" or fmt == "webvtt":
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
            "Cache-Control": "no-cache"
        }
    )
