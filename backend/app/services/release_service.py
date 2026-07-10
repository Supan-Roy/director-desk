"""
Release Studio Service — business logic for generating promotional and release assets.

Generates posters, thumbnails, banners, trailers, and credits using project
context (title, genre, script, characters, environments, scene videos) and
AI (Qwen for image generation, Qwen text analysis for trailer planning, and
FFmpeg for trailer assembly).
"""
import os
import json
import logging
import subprocess
import shutil
import zipfile
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session

from app.db.models import Project, SceneVideo, User
from app.services.qwen_service import qwen_service
from app.db.database import SessionLocal
from app.db.repository import project_repository, user_repository

logger = logging.getLogger(__name__)

# ── Global cancellation flags ────────────────────────────────────────────────
cancel_flags: Dict[int, bool] = {}


def cancel_generation(project_id: int):
    """Set the cancellation flag for a project. Background tasks check this."""
    cancel_flags[project_id] = True
    logger.info(f"Release generation cancelled for project {project_id}")


def is_cancelled(project_id: int) -> bool:
    return cancel_flags.get(project_id, False)


def _clear_cancel(project_id: int):
    cancel_flags.pop(project_id, None)


# ── Constants ────────────────────────────────────────────────────────────────

RELEASE_DIR = "static/release-assets"


def _release_dir(project_id: int) -> str:
    """Get the directory for a project's release assets."""
    path = os.path.join(RELEASE_DIR, str(project_id))
    os.makedirs(path, exist_ok=True)
    return path


def _asset_path(project_id: int, filename: str) -> str:
    """Get the full filesystem path for a release asset file."""
    return os.path.join(_release_dir(project_id), filename)


def _asset_url(project_id: int, filename: str) -> str:
    """Get the URL path for a release asset (served by static mount)."""
    return f"/static/release-assets/{project_id}/{filename}"


# ── Prompt Builders ──────────────────────────────────────────────────────────

def _get_script_excerpt(project: Project, max_chars: int = 1500) -> str:
    """Get a synopsis from the script."""
    if project.script:
        return project.script[:max_chars]
    return ""


def _get_character_summary(project: Project) -> str:
    """Build a summary of main characters."""
    parts = []
    characters = getattr(project, "character_assets", None)
    if characters:
        for c in characters:
            name = getattr(c, "character_name", None)
            profile = getattr(c, "character_profile", None) or {}
            descr = profile.get("description", "")
            if name:
                parts.append(f"{name}: {descr}" if descr else name)
    if not parts:
        environments_data = project.environments
        if environments_data and isinstance(environments_data, list):
            for env in environments_data:
                chars_for_scene = env.get("characters", [])
                if isinstance(chars_for_scene, list):
                    for c in chars_for_scene:
                        name = c.get("name", "") if isinstance(c, dict) else str(c)
                        if name and name not in parts:
                            parts.append(name)
    return "; ".join(parts) if parts else "Original characters"


def _get_environment_summary(project: Project) -> str:
    """Build a summary of environments."""
    envs = project.environments
    if envs and isinstance(envs, list):
        names = []
        for e in envs:
            name = e.get("name", "") if isinstance(e, dict) else str(e)
            if name:
                names.append(name)
        return "; ".join(names) if names else "Various locations"
    return "Various locations"


def _get_mood_from_script(script: str) -> str:
    """Heuristic for mood based on genre or script content."""
    if not script:
        return "Cinematic"
    script_lower = script.lower()
    mood_keywords = {
        "dark": "Dark, intense",
        "mystery": "Mysterious, suspenseful",
        "thriller": "Tense, thrilling",
        "drama": "Emotional, dramatic",
        "comedy": "Light, vibrant",
        "romantic": "Warm, intimate",
        "action": "Dynamic, high-energy",
        "sci-fi": "Futuristic, awe-inspiring",
        "fantasy": "Magical, epic",
        "horror": "Ominous, terrifying",
        "noir": "Shadowy, atmospheric",
    }
    for keyword, mood in mood_keywords.items():
        if keyword in script_lower:
            return mood
    return "Cinematic, atmospheric"


def _get_scene_breakdown_summary(project: Project) -> str:
    """Extract key visual moments from scene breakdown."""
    bd = project.scene_breakdown
    if not bd:
        return ""
    # Scene breakdown is a dict with scenes or a list
    scenes = []
    if isinstance(bd, dict):
        scenes = bd.get("scenes", bd.get("scene_breakdown", []))
    elif isinstance(bd, list):
        scenes = bd
    moments = []
    for scene in scenes[:5]:
        if isinstance(scene, dict):
            desc = scene.get("description") or scene.get("visual_description") or scene.get("setting", "")
            if desc:
                moments.append(desc[:200])
    return "\n".join(moments)


# ── Core prompt builder ──────────────────────────────────────────────────────

def build_release_prompt(target: str, project: Project) -> str:
    """
    Build a detailed, cinematic image prompt from project context.
    No user prompt required — Director Desk knows everything.

    target: "poster", "thumbnail", "poster_vertical", or "banner"
    """
    title = project.title or "Untitled"
    genre = project.production_type or "Drama"
    synopsis = _get_script_excerpt(project, 800)
    characters = _get_character_summary(project)
    environments = _get_environment_summary(project)
    mood = _get_mood_from_script(project.script or "")
    scene_moments = _get_scene_breakdown_summary(project)

    base_context = (
        f"Title: {title}\n"
        f"Genre: {genre}\n"
        f"Mood: {mood}\n"
        f"Main Characters: {characters}\n"
        f"Key Locations: {environments}\n"
    )
    if synopsis:
        base_context += f"Story: {synopsis}\n"
    if scene_moments:
        base_context += f"Key Scenes: {scene_moments}\n"

    aspect_map = {
        "poster": "16:9 horizontal theatrical poster",
        "thumbnail": "16:9 YouTube thumbnail, bold readable composition",
        "poster_vertical": "9:16 vertical mobile poster, tall cinematic",
        "banner": "21:9 ultra-wide social media banner",
    }
    aspect_desc = aspect_map.get(target, "16:9 horizontal")

    dimensions_map = {
        "poster": "1920x1080",
        "thumbnail": "1280x720",
        "poster_vertical": "1080x1920",
        "banner": "2560x1440",
    }
    dimensions = dimensions_map.get(target, "1920x1080")

    text_instruction = {
        "poster": f"Must include the movie title '{title}' displayed prominently on the poster in professional cinematic typography.",
        "thumbnail": f"Must include the movie title '{title}' in bold readable text, designed for YouTube thumbnail composition.",
        "poster_vertical": f"Must include the movie title '{title}' displayed vertically in professional typography.",
        "banner": f"Must include the movie title '{title}' in the banner text area.",
    }
    text_req = text_instruction.get(target, f"Include the title '{title}' in the design.")

    prompt = (
        f"Create a professional {aspect_desc} for the film '{title}'. "
        f"Genre: {genre}. Mood: {mood}. "
        f"Resolution: {dimensions}. "
        f"{text_req} "
        f"Film release marketing material, high-end cinema quality, "
        f"lush lighting, professional color grading, photorealistic.\n\n"
        f"--- Context ---\n{base_context}\n"
        f"--- Output ---\n"
        f"A single {dimensions} image suitable for official film release marketing."
    )
    return prompt.strip()


# ── Tagline Generator ────────────────────────────────────────────────────────

def _generate_tagline(project: Project) -> str:
    """Generate a short tagline using Qwen based on project context."""
    try:
        prompt = (
            f"Generate a short, powerful, one-line tagline for this film:\n"
            f"Title: {project.title or 'Untitled'}\n"
            f"Genre: {project.production_type or 'Drama'}\n"
            f"Story: {_get_script_excerpt(project, 500)}\n"
            f"Mood: {_get_mood_from_script(project.script or '')}\n\n"
            f"Return ONLY the tagline, no quotes, no extra text."
        )
        tagline = qwen_service.generate_text(prompt)
        return tagline.strip().strip('"').strip("'")[:120]
    except Exception as e:
        logger.warning(f"Tagline generation failed: {e}")
        return ""


# ── Asset Generators ─────────────────────────────────────────────────────────

def _generate_image_asset(
    project_id: int,
    target: str,
    filename: str,
    db: Session,
) -> str:
    """
    Generate an image asset using Qwen.
    Returns the URL path of the generated image.
    """
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")

    prompt = build_release_prompt(target, project)

    # Map aspect to model size parameters
    size_map = {
        "poster": "1920x1080",
        "thumbnail": "1280x720",
        "poster_vertical": "1080x1920",
        "banner": "2560x1440",
    }
    size = size_map.get(target, "1920x1080")

    # Call Qwen to generate the image
    image_url = qwen_service.generate_image(prompt=prompt)

    if not image_url:
        raise RuntimeError(f"Image generation returned no URL for {target}")

    # Download the image to our release directory
    import urllib.request
    urllib.request.urlretrieve(image_url, _asset_path(project_id, filename))

    return _asset_url(project_id, filename)


# ── Trailer Generator ────────────────────────────────────────────────────────

def _analyze_scenes_for_trailer(project: Project) -> List[Dict[str, Any]]:
    """
    Use Qwen to analyze the project's scene breakdown and storyboard,
    selecting the most impactful scenes for a trailer.
    Returns a list of scene selections with timestamps.
    """
    bd = project.scene_breakdown
    storyboard = project.storyboard

    # Build scene context for Qwen
    scenes_text = ""
    bd_scenes = []
    if isinstance(bd, dict):
        bd_scenes = bd.get("scenes", bd.get("scene_breakdown", []))
    elif isinstance(bd, list):
        bd_scenes = bd

    for i, scene in enumerate(bd_scenes[:30]):
        if isinstance(scene, dict):
            desc = scene.get("description") or scene.get("visual_description", "")
            scenes_text += f"Scene {i + 1}: {desc[:300]}\n"

    sb_text = ""
    if storyboard and isinstance(storyboard, list):
        for i, sb in enumerate(storyboard[:30]):
            if isinstance(sb, dict):
                desc = sb.get("description", sb.get("visual", ""))
                sb_text += f"Storyboard {i + 1}: {desc[:200]}\n"

    context = (
        f"Film: {project.title or 'Untitled'} ({project.production_type or 'Drama'})\n\n"
        f"--- Scene Breakdown ---\n{scenes_text}\n"
        f"--- Storyboard ---\n{sb_text}\n"
    )

    analysis_prompt = (
        f"Analyze the following film and identify the most emotionally impactful "
        f"and narratively engaging scenes for a 30-second trailer.\n\n"
        f"{context}\n\n"
        f"Return ONLY a JSON array of objects, each with:\n"
        f"- scene_number (int, 1-based): the scene to include\n"
        f"- clip_duration (float, seconds): how long to show this clip (2-8s)\n"
        f"- transition (string): one of 'fade', 'crossfade', 'cut'\n"
        f"- reason (string, 1 sentence): why this scene was chosen\n\n"
        f"Select 4-8 scenes. Order them for best narrative flow: "
        f"opening hook → build-up → climax moment → emotional resolution.\n"
        f"Return ONLY valid JSON, no markdown, no other text."
    )

    try:
        result = qwen_service.generate_text(analysis_prompt)
        # Parse JSON from response
        result = result.strip()
        # Remove markdown code fences if present
        if result.startswith("```"):
            lines = result.split("\n")
            result = "\n".join(lines[1:-1]).strip()
        selections = json.loads(result)
        if isinstance(selections, list):
            return selections
        return []
    except Exception as e:
        logger.error(f"Trailer scene analysis failed: {e}")
        # Fallback: select first 4-6 scenes
        fallback = []
        for i, scene in enumerate(bd_scenes[:6]):
            fallback.append({
                "scene_number": i + 1,
                "clip_duration": 5.0,
                "transition": "crossfade",
                "reason": "Key narrative scene",
            })
        return fallback


def _assemble_trailer(
    project_id: int,
    scene_selections: List[Dict[str, Any]],
    db: Session,
    target_duration: int = 30,
) -> str:
    """
    Assemble the trailer video using FFmpeg.
    Trims existing approved scene videos, applies fades, adds title and credits.
    Returns the URL path of the generated trailer.
    """
    output_path = _asset_path(project_id, "trailer.mp4")

    # Get approved scene videos
    scene_videos = (
        db.query(SceneVideo)
        .filter(
            SceneVideo.project_id == project_id,
            SceneVideo.is_approved == True,
            SceneVideo.status == "completed",
        )
        .all()
    )
    video_map = {sv.scene_number: sv for sv in scene_videos}

    # Build filter_complex for clips
    filter_parts = []
    input_index = 0
    concat_inputs = []
    clip_durations = []

    for selection in scene_selections:
        scene_num = selection.get("scene_number")
        duration = selection.get("clip_duration", 5.0)
        video = video_map.get(scene_num)
        if not video:
            logger.warning(f"No approved video for scene {scene_num}, skipping")
            continue

        video_path = video.video_url
        # Resolve URL to local path
        if video_path.startswith("/static/"):
            local_path = video_path[1:]  # Remove leading slash
        elif video_path.startswith("http"):
            logger.warning(f"Cannot use remote video URL for trailer: {video_path}")
            continue
        else:
            local_path = video_path

        if not os.path.exists(local_path):
            logger.warning(f"Video file not found: {local_path}")
            continue

        # Trim clip with crossfade prep
        clip_label = f"c{input_index}"
        trim_label = f"t{input_index}"

        # Trim to desired duration
        filter_parts.append(
            f"[{input_index}:v]trim=0:{duration},setpts=PTS-STARTPTS[v{input_index}];"
            f"[{input_index}:a]atrim=0:{duration},asetpts=PTS-STARTPTS[a{input_index}]"
        )
        concat_inputs.append(f"[v{input_index}][a{input_index}]")
        clip_durations.append(duration)
        input_index += 1

    if input_index == 0:
        raise RuntimeError("No approved scene videos available for trailer")

    # Build concat filter
    concat_filter = "".join(concat_inputs) + f"concat=n={input_index}:v=1:a=1[outv][outa]"
    all_filters = ";".join(filter_parts) + ";" + concat_filter

    # Build FFmpeg command
    cmd = ["ffmpeg", "-y"]

    # Add inputs
    for selection in scene_selections:
        scene_num = selection.get("scene_number")
        video = video_map.get(scene_num)
        if not video:
            continue
        local_path = video.video_url[1:] if video.video_url.startswith("/static/") else video.video_url
        if os.path.exists(local_path):
            cmd.extend(["-i", local_path])

    # If no inputs were added, fall back to a simple trailer
    if len(cmd) <= 2:
        raise RuntimeError("No valid video files found for trailer")

    cmd.extend(["-filter_complex", all_filters, "-map", "[outv]", "-map", "[outa]"])
    cmd.extend(["-c:v", "libx264", "-preset", "medium", "-crf", "23"])
    cmd.extend(["-c:a", "aac", "-b:a", "128k"])
    cmd.extend(["-t", str(target_duration)])
    cmd.append(output_path)

    logger.info(f"Running FFmpeg trailer assembly: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=300)
        logger.info(f"Trailer generated successfully: {output_path}")
        return _asset_url(project_id, "trailer.mp4")
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg trailer assembly failed: {e.stderr}")
        raise RuntimeError(f"Trailer assembly failed: {e.stderr[:500]}")


# ── Credits Builder ──────────────────────────────────────────────────────────

def build_credits(project: Project, user: Optional[User] = None) -> Dict[str, Any]:
    """Build movie credits from project metadata."""
    # Collect unique AI models used
    ai_models = set()
    try:
        scene_videos = getattr(project, "scene_videos", [])
        if not scene_videos:
            scene_videos = project.scene_videos or []
        for sv in scene_videos:
            if sv.generation_model:
                ai_models.add(sv.generation_model)
    except Exception:
        pass

    models_list = sorted(ai_models) or ["Qwen", "Wan"]

    director_name = "Director Desk"
    if user:
        director_name = f"{user.name} {user.last_name or ''}".strip() or director_name

    return {
        "title": project.title or "Untitled",
        "director": director_name,
        "written_by": "Director Desk AI",
        "created_by": director_name,
        "ai_models": models_list,
        "genre": project.production_type or "Drama",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "description": _get_script_excerpt(project, 300),
    }


# ── DB update helper ─────────────────────────────────────────────────────────

def _update_release_asset(
    project: Project,
    asset_key: str,
    url: Optional[str] = None,
    status: str = "pending",
    error: Optional[str] = None,
    db: Optional[Session] = None,
    extra: Optional[Dict] = None,
):
    """Update a single entry in the release_assets JSON field and commit."""
    assets = project.release_assets or {}
    entry = assets.get(asset_key, {})
    if url is not None:
        entry["url"] = url
    entry["status"] = status
    if error is not None:
        entry["error"] = error
    if status == "completed":
        entry["generated_at"] = datetime.now(timezone.utc).isoformat()
    if status == "generating":
        entry["started_at"] = datetime.now(timezone.utc).isoformat()
    if extra:
        entry.update(extra)
    assets[asset_key] = entry
    project.release_assets = assets
    if db:
        db.commit()


# ── Background task wrappers (open their own DB sessions) ────────────────────


def _bg_generate_poster(project_id: int):
    """Background task wrapper for poster generation."""
    db = SessionLocal()
    try:
        project = project_repository.get_by_id(db, project_id)
        if not project:
            logger.error(f"Project {project_id} not found in background task")
            return
        _update_release_asset(project, "poster", status="generating", db=db)
        try:
            url = _generate_image_asset(project_id, "poster", "poster.jpg", db)
            # Re-fetch from DB — cancel endpoint may have flipped status while Qwen was running
            db.refresh(project)
            entry_status = (project.release_assets or {}).get("poster", {}).get("status")
            if entry_status == "cancelled":
                # Still save the URL so user can see the generated image, keep status as cancelled
                _update_release_asset(project, "poster", url=url, status="cancelled", db=db)
                return
            _update_release_asset(project, "poster", url=url, status="completed", db=db)
            logger.info(f"Poster generated: {url}")
        except Exception as e:
            logger.error(f"Poster generation failed: {e}")
            db.refresh(project)
            if (project.release_assets or {}).get("poster", {}).get("status") != "cancelled":
                _update_release_asset(project, "poster", status="failed", error=str(e), db=db)
    finally:
        db.close()


def _bg_generate_thumbnail(project_id: int):
    """Background task wrapper for thumbnail generation."""
    db = SessionLocal()
    try:
        project = project_repository.get_by_id(db, project_id)
        if not project:
            return
        _update_release_asset(project, "thumbnail", status="generating", db=db)
        try:
            url = _generate_image_asset(project_id, "thumbnail", "thumbnail.jpg", db)
            db.refresh(project)
            entry_status = (project.release_assets or {}).get("thumbnail", {}).get("status")
            if entry_status == "cancelled":
                _update_release_asset(project, "thumbnail", url=url, status="cancelled", db=db)
                return
            _update_release_asset(project, "thumbnail", url=url, status="completed", db=db)
        except Exception as e:
            db.refresh(project)
            if (project.release_assets or {}).get("thumbnail", {}).get("status") != "cancelled":
                _update_release_asset(project, "thumbnail", status="failed", error=str(e), db=db)
    finally:
        db.close()


def _bg_generate_poster_vertical(project_id: int):
    """Background task wrapper for vertical poster generation."""
    db = SessionLocal()
    try:
        project = project_repository.get_by_id(db, project_id)
        if not project:
            return
        _update_release_asset(project, "poster_vertical", status="generating", db=db)
        try:
            url = _generate_image_asset(project_id, "poster_vertical", "poster-vertical.jpg", db)
            db.refresh(project)
            entry_status = (project.release_assets or {}).get("poster_vertical", {}).get("status")
            if entry_status == "cancelled":
                _update_release_asset(project, "poster_vertical", url=url, status="cancelled", db=db)
                return
            _update_release_asset(project, "poster_vertical", url=url, status="completed", db=db)
        except Exception as e:
            db.refresh(project)
            if (project.release_assets or {}).get("poster_vertical", {}).get("status") != "cancelled":
                _update_release_asset(project, "poster_vertical", status="failed", error=str(e), db=db)
    finally:
        db.close()


def _bg_generate_banner(project_id: int):
    """Background task wrapper for banner generation."""
    db = SessionLocal()
    try:
        project = project_repository.get_by_id(db, project_id)
        if not project:
            return
        _update_release_asset(project, "banner", status="generating", db=db)
        try:
            url = _generate_image_asset(project_id, "banner", "banner.jpg", db)
            db.refresh(project)
            entry_status = (project.release_assets or {}).get("banner", {}).get("status")
            if entry_status == "cancelled":
                _update_release_asset(project, "banner", url=url, status="cancelled", db=db)
                return
            _update_release_asset(project, "banner", url=url, status="completed", db=db)
        except Exception as e:
            db.refresh(project)
            if (project.release_assets or {}).get("banner", {}).get("status") != "cancelled":
                _update_release_asset(project, "banner", status="failed", error=str(e), db=db)
    finally:
        db.close()


def _bg_generate_trailer(project_id: int, target_duration: int = 30):
    """Background task wrapper for trailer generation."""
    db = SessionLocal()
    try:
        project = project_repository.get_by_id(db, project_id)
        if not project:
            return
        _update_release_asset(project, "trailer", status="generating", db=db)

        try:
            scene_selections = _analyze_scenes_for_trailer(project)
            db.refresh(project)
            if (project.release_assets or {}).get("trailer", {}).get("status") == "cancelled":
                return
            trailer_url = _assemble_trailer(project_id, scene_selections, db, target_duration)
            db.refresh(project)
            entry_status = (project.release_assets or {}).get("trailer", {}).get("status")
            if entry_status == "cancelled":
                _update_release_asset(project, "trailer", url=trailer_url, status="cancelled", db=db)
                return
            _update_release_asset(
                project, "trailer",
                url=trailer_url,
                status="completed",
                db=db,
                extra={"duration": target_duration},
            )
        except Exception as e:
            db.refresh(project)
            if (project.release_assets or {}).get("trailer", {}).get("status") != "cancelled":
                _update_release_asset(project, "trailer", status="failed", error=str(e), db=db)
    finally:
        db.close()


def _bg_generate_all(project_id: int, trailer_duration: int = 30, user_id: Optional[int] = None):
    """Background task wrapper to generate all release assets sequentially."""
    try:
        _bg_generate_poster(project_id)
        _bg_generate_thumbnail(project_id)
        _bg_generate_poster_vertical(project_id)
        _bg_generate_banner(project_id)
        try:
            db_local2 = SessionLocal()
            try:
                project2 = project_repository.get_by_id(db_local2, project_id)
                if project2:
                    user = user_repository.get_by_id(db_local2, user_id) if user_id else None
                    credits = build_credits(project2, user)
                    credits_path = _asset_path(project_id, "credits.json")
                    with open(credits_path, "w", encoding="utf-8") as f:
                        json.dump(credits, f, indent=2, ensure_ascii=False)
                    url = _asset_url(project_id, "credits.json")
                    _update_release_asset(project2, "credits", url=url, status="completed", db=db_local2)
            except Exception as e:
                logger.error(f"Credits generation failed in _bg_generate_all: {e}")
            finally:
                db_local2.close()
        except Exception as e:
            logger.error(f"Credits generation failed: {e}")
        try:
            _bg_generate_trailer(project_id, trailer_duration)
        except Exception as e:
            logger.error(f"Trailer generation failed (non-fatal): {e}")
        logger.info(f"All release assets generated for project {project_id}")
    except Exception as e:
        logger.error(f"Bulk release generation failed for project {project_id}: {e}")


# ── Public helpers (for sync calls from route) ────────────────────────────────


def generate_poster(project_id: int, db: Session) -> str:
    """Generate the official movie poster (sync, for use within an active session)."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    url = _generate_image_asset(project_id, "poster", "poster.jpg", db)
    return url


def generate_thumbnail(project_id: int, db: Session) -> str:
    """Generate YouTube thumbnail (sync)."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    url = _generate_image_asset(project_id, "thumbnail", "thumbnail.jpg", db)
    return url


def generate_poster_vertical(project_id: int, db: Session) -> str:
    """Generate vertical mobile poster (sync)."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    url = _generate_image_asset(project_id, "poster_vertical", "poster-vertical.jpg", db)
    return url


def generate_banner(project_id: int, db: Session) -> str:
    """Generate social media banner (sync)."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    url = _generate_image_asset(project_id, "banner", "banner.jpg", db)
    return url


def generate_credits(project_id: int, db: Session, user: Optional[User] = None) -> str:
    """Generate movie credits (sync)."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    credits = build_credits(project, user)
    credits_path = _asset_path(project_id, "credits.json")
    with open(credits_path, "w", encoding="utf-8") as f:
        json.dump(credits, f, indent=2, ensure_ascii=False)
    return _asset_url(project_id, "credits.json")


def generate_trailer(project_id: int, db: Session, target_duration: int = 30) -> str:
    """Generate trailer (sync)."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    scene_selections = _analyze_scenes_for_trailer(project)
    return _assemble_trailer(project_id, scene_selections, db, target_duration)


def download_package(project_id: int, db: Session) -> str:
    """Create a ZIP package of all completed release assets and return the URL path."""
    project = project_repository.get_by_id(db, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")

    assets = project.release_assets or {}
    zip_path = _asset_path(project_id, "release-package.zip")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for asset_key, entry in assets.items():
            if asset_key == "package":
                continue
            url = entry.get("url", "")
            if url and entry.get("status") == "completed":
                # Convert URL to local path
                if url.startswith("/static/"):
                    local_path = url[1:]  # Remove leading /
                else:
                    local_path = url
                if os.path.exists(local_path):
                    arcname = f"{asset_key}{os.path.splitext(local_path)[1]}"
                    if asset_key == "credits":
                        arcname = "credits.json"
                    elif asset_key == "trailer":
                        arcname = "trailer.mp4"
                    zf.write(local_path, arcname)

    return _asset_url(project_id, "release-package.zip")
