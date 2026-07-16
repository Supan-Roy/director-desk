import os
import uuid
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.repository import get_db, project_repository
from app.services import post_production_service, dubbing_service
from app.services import speaker_service, voice_casting_service
from app.services.ad_service import ad_tasks, generate_ad_background, AD_VOICES

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
        "dubbed_movies": project.dubbed_movies or {},
        "ad_movies": project.ad_movies or {},
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


# ---------------------------------------------------------------------------
# Dubbing schemas
# ---------------------------------------------------------------------------

class DubbingPayload(BaseModel):
    project_id: int = 0
    language: str
    movie_url: Optional[str] = None
    subtitles: Optional[List[SubtitleItem]] = None


# ---------------------------------------------------------------------------
# Dubbing — generate
# ---------------------------------------------------------------------------

@router.post("/post-production/dubbing/generate")
def generate_dub(
    payload: DubbingPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Start multilingual dubbing.

    Two modes:
      - **Project mode** (project_id > 0): reads movie_url + subtitles from the DB.
      - **Standalone mode** (project_id = 0): expects explicit ``movie_url`` + ``subtitles``.

    Returns immediately with a ``task_id``; poll
    ``GET /post-production/dubbing/status/{task_id}`` to follow progress.
    """
    movie_url = payload.movie_url
    subtitles_data = None

    if payload.project_id and payload.project_id > 0:
        project = project_repository.get_by_id(db, payload.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if not project.mastered_movie_url:
            raise HTTPException(status_code=400, detail="No mastered movie. Render in Studio Editor first.")
        movie_url = project.mastered_movie_url
        if project.subtitles:
            subtitles_data = project.subtitles
    else:
        if not movie_url:
            raise HTTPException(status_code=400, detail="movie_url is required for standalone dubbing.")
        if payload.subtitles:
            subtitles_data = [s.model_dump() for s in payload.subtitles]

    # Auto-generate subtitles if not provided
    if not subtitles_data:
        logger.info("No subtitles found; auto-transcribing for auto-dub...")
        try:
            subtitles_data = post_production_service.transcribe_sync(movie_url)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Auto subtitle generation failed: {exc}",
            )
        if not subtitles_data:
            raise HTTPException(status_code=400, detail="Failed to generate subtitles from the movie audio.")

    if not subtitles_data:
        raise HTTPException(status_code=400, detail="No subtitles available for dubbing.")
        subtitles_data = [s.model_dump() for s in payload.subtitles]

    if not dubbing_service.supports_language(payload.language):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{payload.language}'. Supported: {dubbing_service.get_supported_languages()}",
        )

    task_id = str(uuid.uuid4())
    background_tasks.add_task(
        dubbing_service.generate_dub_background,
        task_id,
        payload.project_id or 0,
        movie_url,
        payload.language,
        subtitles=subtitles_data,
    )

    return {"task_id": task_id, "status": "pending", "language": payload.language}


# ---------------------------------------------------------------------------
# Dubbing — status
# ---------------------------------------------------------------------------

@router.get("/post-production/dubbing/status/{task_id}")
def get_dub_status(task_id: str):
    """Poll the current dubbing task progress."""
    task = dubbing_service.dubbing_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Dubbing task not found")
    return task


# ---------------------------------------------------------------------------
# Dubbing — downloads
# ---------------------------------------------------------------------------

@router.get("/post-production/dubbing/download/{task_id}")
def download_dubbed_movie(task_id: str):
    """Download the fully dubbed movie for a completed task."""
    task = dubbing_service.dubbing_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Dubbing not yet completed")
    movie_path = task.get("movie_url", "").lstrip("/")
    if not movie_path or not os.path.exists(movie_path):
        raise HTTPException(status_code=404, detail="Dubbed movie file not found")

    filename = os.path.basename(movie_path)
    return FileResponse(path=movie_path, filename=filename, media_type="video/mp4")


@router.delete("/post-production/ad/project/{project_id}")
def delete_project_ad(project_id: int, language: str = Query(...), db: Session = Depends(get_db)):
    """Delete a previously generated AD track for a project, cleaning up files."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ads = project.ad_movies or {}
    ad_info = ads.get(language)
    if not ad_info:
        raise HTTPException(status_code=404, detail=f"No AD found for language '{language}'")

    # Remove files
    for key in ("movie_url", "audio_url"):
        path = ad_info.get(key, "").lstrip("/")
        if path and os.path.exists(path):
            try:
                os.remove(path)
                logger.info("Deleted AD file: %s", path)
            except Exception as exc:
                logger.warning("Failed to delete AD file %s: %s", path, exc)

    # Remove the parent task directory
    task_id = ad_info.get("task_id")
    if task_id:
        task_dir = os.path.join("static/ad", task_id)
        if os.path.isdir(task_dir):
            try:
                import shutil
                shutil.rmtree(task_dir, ignore_errors=True)
                logger.info("Removed AD task directory: %s", task_dir)
            except Exception as exc:
                logger.warning("Failed to remove task dir %s: %s", task_dir, exc)

    del ads[language]
    project_repository.update(db, project_id, ad_movies=ads)

    return {"status": "success", "language": language}


@router.get("/post-production/dubbing/download/audio/{task_id}")
def download_dubbed_audio(task_id: str):
    """Download the raw dubbed audio track."""
    task = dubbing_service.dubbing_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Dubbing not yet completed")
    audio_path = task.get("audio_url", "").lstrip("/")
    if not audio_path or not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Dubbed audio file not found")

    filename = os.path.basename(audio_path)
    return FileResponse(path=audio_path, filename=filename, media_type="audio/wav")


@router.get("/post-production/dubbing/download/subtitles/{task_id}")
def download_translated_subtitles(task_id: str):
    """Download translated subtitles as SRT for a completed dubbing task."""
    task = dubbing_service.dubbing_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Dubbing not yet completed")

    subs = task.get("translated_subtitles", [])
    if not subs:
        raise HTTPException(status_code=404, detail="No translated subtitles found")

    content = post_production_service.export_srt(subs)
    filename = f"translated_subtitles_{task_id[:8]}.srt"
    return Response(
        content=content,
        media_type="application/x-subrip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Smart Speaker Casting — Speaker Analysis
# ---------------------------------------------------------------------------

class SpeakerAnalysisPayload(BaseModel):
    movie_url: str
    subtitles: Optional[List[SubtitleItem]] = None


@router.post("/post-production/dubbing/analyze-speakers")
def analyze_speakers_route(payload: SpeakerAnalysisPayload):
    """
    Detect and profile speakers in a movie from its subtitle timeline.
    If no subtitles are provided, auto-generates them via Whisper first.
    Returns speaker list with gender/age estimates and suggested voices.
    """
    movie_path = post_production_service.resolve_filepath(payload.movie_url)
    if not movie_path or not os.path.exists(movie_path):
        raise HTTPException(status_code=400, detail=f"Movie file not found: {payload.movie_url}")

    # Auto-generate subtitles if not provided
    if not payload.subtitles:
        logger.info("No subtitles provided to analyze-speakers; auto-transcribing...")
        subtitle_dicts = post_production_service.transcribe_sync(payload.movie_url)
        if not subtitle_dicts:
            raise HTTPException(status_code=400, detail="Failed to generate subtitles from the movie audio.")
    else:
        subtitle_dicts = [s.model_dump() for s in payload.subtitles]

    speakers = speaker_service.analyze_speakers(movie_path, subtitle_dicts)

    return {"speakers": speakers, "subtitles": subtitle_dicts}


# ---------------------------------------------------------------------------
# Dubbing — delete a dubbed version
# ---------------------------------------------------------------------------

@router.delete("/post-production/dubbing/project/{project_id}")
def delete_project_dub(project_id: int, language: str = Query(...), db: Session = Depends(get_db)):
    """Delete a previously generated dub for a project, cleaning up files."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    dubs = project.dubbed_movies or {}
    dub_info = dubs.get(language)
    if not dub_info:
        raise HTTPException(status_code=404, detail=f"No dub found for language '{language}'")

    # Remove files
    for key in ("movie_url", "audio_url"):
        path = dub_info.get(key, "").lstrip("/")
        if path and os.path.exists(path):
            try:
                os.remove(path)
                logger.info("Deleted dub file: %s", path)
            except Exception as exc:
                logger.warning("Failed to delete dub file %s: %s", path, exc)

    # Also remove the parent task directory if it only contains these files
    task_id = dub_info.get("task_id")
    if task_id:
        task_dir = dubbing_service._task_dir(task_id)
        if os.path.isdir(task_dir):
            try:
                import shutil
                shutil.rmtree(task_dir, ignore_errors=True)
                logger.info("Removed dub task directory: %s", task_dir)
            except Exception as exc:
                logger.warning("Failed to remove task dir %s: %s", task_dir, exc)

    # Remove from db
    del dubs[language]
    project_repository.update(db, project_id, dubbed_movies=dubs)

    return {"status": "success", "language": language}


# ---------------------------------------------------------------------------
# Smart Speaker Casting — Voice Casting Plan
# ---------------------------------------------------------------------------

class CastingPlanPayload(BaseModel):
    speakers: List[Dict[str, Any]]
    target_language: str


@router.post("/post-production/dubbing/casting-plan")
def create_casting_plan_route(payload: CastingPlanPayload):
    """
    Create a voice casting plan: assign localized Edge TTS voices to each
    detected speaker based on their gender/age profile and the target language.
    Returns a ``plan_id`` for use with the smart dubbing endpoint.
    """
    plan_id = voice_casting_service.create_casting_plan(
        payload.speakers,
        payload.target_language,
    )
    plan = voice_casting_service.get_casting_plan(plan_id)
    return plan


@router.get("/post-production/dubbing/casting-plan/{plan_id}")
def get_casting_plan_route(plan_id: str):
    """Retrieve a casting plan by ID."""
    plan = voice_casting_service.get_casting_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Casting plan not found")
    return plan


class VoiceOverridePayload(BaseModel):
    speaker_id: int
    voice_name: str


@router.post("/post-production/dubbing/casting-plan/{plan_id}/override")
def override_voice_route(plan_id: str, payload: VoiceOverridePayload):
    """
    Override the assigned voice for a specific speaker in a casting plan.
    """
    success = voice_casting_service.update_voice_assignment(
        plan_id, payload.speaker_id, payload.voice_name,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Casting plan or speaker not found")
    plan = voice_casting_service.get_casting_plan(plan_id)
    return plan


# ---------------------------------------------------------------------------
# Smart Speaker Casting — Generate
# ---------------------------------------------------------------------------

class SmartDubbingPayload(BaseModel):
    project_id: int = 0
    target_language: str
    casting_plan_id: str
    movie_url: Optional[str] = None
    subtitles: Optional[List[SubtitleItem]] = None


@router.post("/post-production/dubbing/smart-generate")
def generate_smart_dub(
    payload: SmartDubbingPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Start speaker-aware dubbing using a voice casting plan.

    Each subtitle is spoken by the voice assigned to its detected speaker,
    preserving gender/age consistency throughout the film.

    Poll ``GET /post-production/dubbing/status/{task_id}`` for progress.
    """
    movie_url = payload.movie_url
    subtitles_data = None

    if payload.project_id and payload.project_id > 0:
        project = project_repository.get_by_id(db, payload.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if not project.mastered_movie_url:
            raise HTTPException(status_code=400, detail="No mastered movie. Render in Studio Editor first.")
        if not project.subtitles:
            raise HTTPException(status_code=400, detail="No subtitles. Generate subtitles first.")
        movie_url = project.mastered_movie_url
        subtitles_data = project.subtitles
    else:
        if not movie_url:
            raise HTTPException(status_code=400, detail="movie_url is required for standalone dubbing.")
        if not payload.subtitles:
            raise HTTPException(status_code=400, detail="subtitles are required for standalone dubbing.")
        subtitles_data = [s.model_dump() for s in payload.subtitles]

    if not dubbing_service.supports_language(payload.target_language):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{payload.target_language}'. Supported: {dubbing_service.get_supported_languages()}",
        )

    # Validate casting plan exists
    plan = voice_casting_service.get_casting_plan(payload.casting_plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Casting plan not found. Create one first via /casting-plan.")

    task_id = str(uuid.uuid4())
    background_tasks.add_task(
        dubbing_service.generate_smart_dub_background,
        task_id,
        payload.project_id or 0,
        movie_url,
        payload.target_language,
        payload.casting_plan_id,
        subtitles=subtitles_data,
    )

    return {"task_id": task_id, "status": "pending", "language": payload.target_language}


# ---------------------------------------------------------------------------
# Auto Dub — one-click: analyze speakers → create plan → generate
# ---------------------------------------------------------------------------

class AutoDubbingPayload(BaseModel):
    project_id: int = 0
    target_language: str
    movie_url: Optional[str] = None
    subtitles: Optional[List[SubtitleItem]] = None


@router.post("/post-production/dubbing/auto-generate")
def generate_auto_dub(
    payload: AutoDubbingPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    One-click auto dubbing: analyzes speakers, creates a voice casting plan,
    and generates the speaker-aware dub — all in a single call.

    No manual voice selection needed.  The system automatically picks
    gender-appropriate voices for each detected speaker.

    Poll ``GET /post-production/dubbing/status/{task_id}`` for progress.
    """
    movie_url = payload.movie_url
    subtitles_data = None

    if payload.project_id and payload.project_id > 0:
        project = project_repository.get_by_id(db, payload.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if not project.mastered_movie_url:
            raise HTTPException(status_code=400, detail="No mastered movie. Render in Studio Editor first.")
        movie_url = project.mastered_movie_url
        if project.subtitles:
            subtitles_data = project.subtitles
    else:
        if not movie_url:
            raise HTTPException(status_code=400, detail="movie_url is required for standalone dubbing.")
        if payload.subtitles:
            subtitles_data = [s.model_dump() for s in payload.subtitles]

    # Auto-generate subtitles if not provided
    if not subtitles_data:
        logger.info("No subtitles found; auto-transcribing for auto-dub...")
        try:
            subtitles_data = post_production_service.transcribe_sync(movie_url)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Auto subtitle generation failed: {exc}",
            )
        if not subtitles_data:
            raise HTTPException(status_code=400, detail="Failed to generate subtitles from the movie audio.")

        # Persist the auto-generated subtitles so they survive page reload
        if payload.project_id and payload.project_id > 0:
            try:
                project_repository.update(
                    db, payload.project_id,
                    subtitles=subtitles_data,
                    mastered_movie_url=movie_url,
                )
                logger.info("Persisted %d auto-generated subtitles to project %d", len(subtitles_data), payload.project_id)
            except Exception as exc2:
                logger.warning("Failed to persist auto-generated subtitles: %s", exc2)

    if not dubbing_service.supports_language(payload.target_language):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{payload.target_language}'. Supported: {dubbing_service.get_supported_languages()}",
        )

    movie_path = post_production_service.resolve_filepath(movie_url)
    if not movie_path or not os.path.exists(movie_path):
        raise HTTPException(status_code=400, detail=f"Movie file not found: {movie_url}")

    # Step 1: Analyze speakers (hybrid timing + acoustic clustering)
    speakers = speaker_service.analyze_speakers(movie_path, subtitles_data)
    if not speakers:
        logger.warning("No speakers detected; falling back to a single default speaker")
        speakers = [{
            "speaker_id": 0,
            "gender": "unknown",
            "age_group": "adult",
            "confidence": 0.0,
            "pitch_hz": None,
            "voice": None,
            "subtitle_count": len(subtitles_data),
            "sample_subtitle": subtitles_data[0],
        }]

    # Step 2: Create casting plan (auto-selects gender-appropriate voices)
    plan_id = voice_casting_service.create_casting_plan(speakers, payload.target_language)

    # Step 3: Generate smart dub
    task_id = str(uuid.uuid4())
    background_tasks.add_task(
        dubbing_service.generate_smart_dub_background,
        task_id,
        payload.project_id or 0,
        movie_url,
        payload.target_language,
        plan_id,
        subtitles=subtitles_data,
    )

    logger.info(
        "Auto-dub started: %d speakers detected, plan=%s, task=%s, lang=%s",
        len(speakers), plan_id, task_id, payload.target_language,
    )

    return {
        "task_id": task_id,
        "status": "pending",
        "language": payload.target_language,
        "speakers_detected": len(speakers),
        "speakers": speakers,
        "casting_plan_id": plan_id,
    }


# ---------------------------------------------------------------------------
# Voice Options
# ---------------------------------------------------------------------------

@router.get("/post-production/dubbing/voice-options/{language}")
def get_voice_options_route(language: str):
    """Return all available Edge TTS voices for a given language."""
    if not dubbing_service.supports_language(language):
        raise HTTPException(status_code=400, detail=f"Unsupported language '{language}'")
    options = voice_casting_service.get_voice_options(language)
    return {"language": language, "voices": options}


# ---------------------------------------------------------------------------
# Dubbing — supported languages
# ---------------------------------------------------------------------------

@router.get("/post-production/dubbing/languages")
def list_dub_languages():
    """Return the list of languages supported for dubbing."""
    return {"languages": dubbing_service.get_supported_languages()}


# ---------------------------------------------------------------------------
# Audio Description (AD)
# ---------------------------------------------------------------------------

class ADPayload(BaseModel):
    project_id: int
    target_language: str = "English"


@router.post("/post-production/ad/generate")
def generate_ad(
    payload: ADPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Generate Audio Description (AD) track for a project.

    AD provides narrated visual descriptions for visually impaired viewers,
    mixed with the original audio using professional side-chain ducking.
    Requires a project with script, scene breakdown, and mastered movie.
    """
    project = project_repository.get_by_id(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.mastered_movie_url:
        raise HTTPException(status_code=400, detail="No mastered movie. Render in Studio Editor first.")

    if not project.script and not project.scene_breakdown:
        raise HTTPException(status_code=400, detail="No script or scene data. AD requires a completed project with script.")

    if not dubbing_service.supports_language(payload.target_language):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{payload.target_language}'.",
        )

    task_id = str(uuid.uuid4())
    background_tasks.add_task(
        generate_ad_background,
        task_id,
        payload.project_id,
        project.mastered_movie_url,
        payload.target_language,
    )

    return {"task_id": task_id, "status": "pending", "language": payload.target_language}


@router.get("/post-production/ad/status/{task_id}")
def get_ad_status(task_id: str):
    """Poll AD generation progress."""
    task = ad_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="AD task not found")
    return task


@router.get("/post-production/ad/download/{task_id}")
def download_ad_movie(task_id: str):
    """Download the AD-mixed movie."""
    task = ad_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="AD task not found")
    if task.get("status") != "completed":
        raise HTTPException(status_code=400, detail="AD not yet completed")
    movie_path = task.get("movie_url", "").lstrip("/")
    if not movie_path or not os.path.exists(movie_path):
        raise HTTPException(status_code=404, detail="AD movie file not found")

    filename = os.path.basename(movie_path)
    return FileResponse(path=movie_path, filename=filename, media_type="video/mp4")
