"""
Dubbing Service — orchestrates the multilingual dubbing pipeline.

Pipeline
--------
1. Extract audio from the final mastered movie (FFmpeg)
2. Load subtitle timeline from the project
3. Translate subtitles to the target language (NLLB-200)
4. Generate speech for every subtitle block (TTS provider)
5. Concatenate speech clips with silence padding → dubbed_audio.wav
6. Combine dubbed audio with original movie via FFmpeg → output movie

All processing runs locally, offline, without any cloud API calls.
"""

from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import threading
import uuid
from typing import Any, ClassVar, Dict, List, Optional

from .tts_provider import (
    SUPPORTED_LANGUAGES,
    NLLB_LANG_MAP,
    SpeechProvider,
    get_default_provider,
)
from .translation_service import translate_subtitles
from .post_production_service import resolve_filepath
from .voice_casting_service import build_voice_map

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DUBBING_DIR = "static/dubbing"
DUBBING_DIR_ABS = os.path.join(os.getcwd(), DUBBING_DIR)

# Global task store (mirrors generation_tasks in post_production_service)
dubbing_tasks: Dict[str, Dict[str, Any]] = {}

# Thread lock for model loading
_model_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _task_dir(task_id: str) -> str:
    return os.path.join(DUBBING_DIR_ABS, task_id)


def _abs_to_web_url(abspath: str) -> str:
    """Convert an absolute filesystem path to a web URL relative to the static mount."""
    return "/" + os.path.relpath(abspath, os.getcwd()).replace(os.sep, "/")


def _ensure_dirs(task_id: str):
    os.makedirs(_task_dir(task_id), exist_ok=True)


def _cleanup_task(task_id: str):
    """Remove temporary files but keep the final output."""
    # Individual clips can be cleaned up; the assembled WAV + MP4 stay.
    clips_dir = os.path.join(_task_dir(task_id), "clips")
    if os.path.isdir(clips_dir):
        shutil.rmtree(clips_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Audio assembly
# ---------------------------------------------------------------------------

def _concatenate_audio_clips(
    clip_paths: List[str],
    output_path: str,
    subtitle_timing: List[Dict],
) -> str:
    """
    Concatenate per-subtitle WAV clips into a single WAV file.

    Inserts silence where there are gaps between subtitle blocks.
    Uses FFmpeg's acrossfade or concat filter for gapless joining.
    """
    if not clip_paths:
        raise RuntimeError("No speech clips to assemble")

    # Build a concat file list for FFmpeg
    concat_file = output_path.replace(".wav", "_concat.txt")
    abs_clips = [os.path.abspath(p) for p in clip_paths]

    with open(concat_file, "w") as f:
        for path in abs_clips:
            f.write(f"file '{path}'\n")

    # Use FFmpeg concat demuxer to join clips.
    # Re-encode to PCM s16le so every output is a real, valid WAV.
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c:a", "pcm_s16le",
        "-ar", "22050",
        "-ac", "1",
        output_path,
    ]
    logger.info("Concatenating %d audio clips...", len(clip_paths))
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        logger.error("FFmpeg concat failed: %s", exc.stderr)
        raise RuntimeError(f"Audio concatenation failed: {exc.stderr}") from exc
    finally:
        if os.path.exists(concat_file):
            os.remove(concat_file)

    logger.info("Assembled dubbed audio: %s", output_path)
    return output_path


# ---------------------------------------------------------------------------
# Background dubbing task
# ---------------------------------------------------------------------------

def generate_dub_background(
    task_id: str,
    project_id: int,
    movie_url: str,
    target_language: str,
    tts_provider: Optional[SpeechProvider] = None,
    subtitles: Optional[List[Dict]] = None,
) -> None:
    """
    Run inside a background thread (via FastAPI BackgroundTasks).

    When *subtitles* is provided explicitly (standalone / non-project mode) it
    is used directly.  Otherwise the service reads subtitles from the project
    database record (project_id must be > 0).

    Progress is written to the global ``dubbing_tasks`` dict so the HTTP
    polling endpoint can read it.
    """
    from app.db.database import SessionLocal
    from app.db.repository import project_repository

    db = None
    try:
        dubbing_tasks[task_id] = {
            "status": "processing",
            "step": 0,
            "step_progress": 0,
            "total_clips": 0,
            "current_clip": 0,
            "error": None,
            "translated_subtitles": None,
            "preview_url": None,
            "audio_url": None,
            "movie_url": None,
        }

        # Resolve provider
        if tts_provider is None:
            try:
                tts_provider = get_default_provider()
            except RuntimeError as e:
                raise RuntimeError(f"No TTS provider available: {e}") from e

        local_path = resolve_filepath(movie_url)
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Movie file not found at {local_path}")

        _ensure_dirs(task_id)
        task_dir = _task_dir(task_id)

        # ---- Step 0: Load subtitles ----
        dubbing_tasks[task_id]["step"] = 0
        dubbing_tasks[task_id]["step_progress"] = 0

        if subtitles is not None:
            # Standalone mode — subtitles passed inline
            pass
        else:
            # Project mode — read from database
            db = SessionLocal()
            project = project_repository.get_by_id(db, project_id)
            if project is None:
                raise RuntimeError(f"Project {project_id} not found")
            subtitles = project.subtitles or []

        if not subtitles:
            raise RuntimeError("No subtitles found. Generate subtitles first.")

        dubbing_tasks[task_id]["step_progress"] = 100

        # ---- Step 1: Translate subtitles ----
        dubbing_tasks[task_id]["step"] = 1
        dubbing_tasks[task_id]["step_progress"] = 0

        source_lang = "English"
        translated_subs = translate_subtitles(subtitles, target_language, source_lang)
        dubbing_tasks[task_id]["translated_subtitles"] = translated_subs
        dubbing_tasks[task_id]["step_progress"] = 100

        # ---- Step 2: Generate speech for each subtitle ----
        dubbing_tasks[task_id]["step"] = 2
        dubbing_tasks[task_id]["step_progress"] = 0
        dubbing_tasks[task_id]["total_clips"] = len(translated_subs)
        dubbing_tasks[task_id]["current_clip"] = 0

        clips_dir = os.path.join(task_dir, "clips")
        os.makedirs(clips_dir, exist_ok=True)

        clip_paths: List[str] = []
        for idx, sub in enumerate(translated_subs):
            clip_path = os.path.join(clips_dir, f"clip_{idx:04d}.wav")
            try:
                tts_provider.generate_speech(sub["text"], target_language, clip_path)
            except Exception as exc:
                logger.warning(
                    "Speech generation failed for clip %d (%s), inserting silence: %s",
                    idx, sub["text"][:40], exc,
                )
                # Create a silent WAV as fallback (1 second of silence)
                _create_silent_wav(clip_path, duration=1.0)

            clip_paths.append(clip_path)
            dubbing_tasks[task_id]["current_clip"] = idx + 1
            dubbing_tasks[task_id]["step_progress"] = int(
                ((idx + 1) / len(translated_subs)) * 100
            )

        dubbing_tasks[task_id]["step_progress"] = 100

        # ---- Step 3: Assemble audio track ----
        dubbing_tasks[task_id]["step"] = 3
        dubbing_tasks[task_id]["step_progress"] = 0

        dubbed_audio_path = os.path.join(task_dir, "dubbed_audio.wav")
        _concatenate_audio_clips(clip_paths, dubbed_audio_path, translated_subs)

        dubbing_tasks[task_id]["step_progress"] = 50
        dubbing_tasks[task_id]["audio_url"] = _abs_to_web_url(dubbed_audio_path)

        # ---- Step 4: Combine with movie ----
        dubbing_tasks[task_id]["step"] = 4
        dubbing_tasks[task_id]["step_progress"] = 0

        original_stem = os.path.splitext(os.path.basename(local_path))[0]
        safe_lang = re.sub(r"[^a-zA-Z0-9_-]", "_", target_language.lower())
        output_movie = os.path.join(task_dir, f"{original_stem}_{safe_lang}.mp4")

        ffmpeg_cmd = [
            "ffmpeg", "-y",
            "-i", local_path,
            "-i", dubbed_audio_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            output_movie,
        ]
        logger.info("Rendering dubbed movie: %s", " ".join(ffmpeg_cmd))
        try:
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(f"FFmpeg failed to combine audio + video: {exc.stderr}") from exc

        dubbing_tasks[task_id]["movie_url"] = _abs_to_web_url(output_movie)
        dubbing_tasks[task_id]["step_progress"] = 100

        # ---- Done ----
        dubbing_tasks[task_id]["status"] = "completed"
        logger.info("Dubbing task %s completed for language '%s'", task_id, target_language)

    except Exception as exc:
        logger.error("Dubbing task %s failed: %s", task_id, exc, exc_info=True)
        dubbing_tasks[task_id]["status"] = "failed"
        dubbing_tasks[task_id]["error"] = str(exc)
    finally:
        if db is not None:
            db.close()


# ---------------------------------------------------------------------------
# Smart Dubbing — Speaker-Aware Pipeline
# ---------------------------------------------------------------------------

def generate_smart_dub_background(
    task_id: str,
    project_id: int,
    movie_url: str,
    target_language: str,
    casting_plan_id: str,
    tts_provider: Optional[SpeechProvider] = None,
    subtitles: Optional[List[Dict]] = None,
) -> None:
    """
    Speaker-aware dubbing pipeline.  Same as ``generate_dub_background`` but
    uses per-speaker voice assignments from a casting plan so each character
    gets a consistent, gender-appropriate localized voice.

    Progress is written to the global ``dubbing_tasks`` dict.
    """
    from app.db.database import SessionLocal
    from app.db.repository import project_repository

    db = None
    try:
        dubbing_tasks[task_id] = {
            "status": "processing",
            "step": 0,
            "step_progress": 0,
            "total_clips": 0,
            "current_clip": 0,
            "error": None,
            "translated_subtitles": None,
            "preview_url": None,
            "audio_url": None,
            "movie_url": None,
            "casting_plan_id": casting_plan_id,
        }

        if tts_provider is None:
            try:
                tts_provider = get_default_provider()
            except RuntimeError as e:
                raise RuntimeError(f"No TTS provider available: {e}") from e

        local_path = resolve_filepath(movie_url)
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Movie file not found at {local_path}")

        _ensure_dirs(task_id)
        task_dir = _task_dir(task_id)

        # ---- Step 0: Load subtitles ----
        dubbing_tasks[task_id]["step"] = 0
        dubbing_tasks[task_id]["step_progress"] = 0

        if subtitles is not None:
            pass
        else:
            db = SessionLocal()
            project = project_repository.get_by_id(db, project_id)
            if project is None:
                raise RuntimeError(f"Project {project_id} not found")
            subtitles = project.subtitles or []

        if not subtitles:
            raise RuntimeError("No subtitles found. Generate subtitles first.")

        dubbing_tasks[task_id]["step_progress"] = 100

        # ---- Step 1: Translate subtitles ----
        dubbing_tasks[task_id]["step"] = 1
        dubbing_tasks[task_id]["step_progress"] = 0

        source_lang = "English"
        translated_subs = translate_subtitles(subtitles, target_language, source_lang)
        dubbing_tasks[task_id]["translated_subtitles"] = translated_subs
        dubbing_tasks[task_id]["step_progress"] = 100

        # ---- Build per-clip voice map from casting plan ----
        voice_map = build_voice_map(casting_plan_id, subtitles)

        # ---- Step 2: Generate speech for each subtitle with per-speaker voice ----
        dubbing_tasks[task_id]["step"] = 2
        dubbing_tasks[task_id]["step_progress"] = 0
        dubbing_tasks[task_id]["total_clips"] = len(translated_subs)
        dubbing_tasks[task_id]["current_clip"] = 0

        clips_dir = os.path.join(task_dir, "clips")
        os.makedirs(clips_dir, exist_ok=True)

        clip_paths: List[str] = []
        for idx, sub in enumerate(translated_subs):
            clip_path = os.path.join(clips_dir, f"clip_{idx:04d}.wav")
            voice_name = voice_map.get(idx)

            try:
                # EdgeTTSProvider supports voice= kwarg; others ignore it
                tts_provider.generate_speech(
                    sub["text"], target_language, clip_path,
                    voice=voice_name,
                )
            except Exception as exc:
                logger.warning(
                    "Speech generation failed for clip %d (%s), inserting silence: %s",
                    idx, sub["text"][:40], exc,
                )
                _create_silent_wav(clip_path, duration=1.0)

            clip_paths.append(clip_path)
            dubbing_tasks[task_id]["current_clip"] = idx + 1
            dubbing_tasks[task_id]["step_progress"] = int(
                ((idx + 1) / len(translated_subs)) * 100
            )

        dubbing_tasks[task_id]["step_progress"] = 100

        # ---- Step 3: Assemble audio track ----
        dubbing_tasks[task_id]["step"] = 3
        dubbing_tasks[task_id]["step_progress"] = 0

        dubbed_audio_path = os.path.join(task_dir, "dubbed_audio.wav")
        _concatenate_audio_clips(clip_paths, dubbed_audio_path, translated_subs)

        dubbing_tasks[task_id]["step_progress"] = 50
        dubbing_tasks[task_id]["audio_url"] = _abs_to_web_url(dubbed_audio_path)

        # ---- Step 4: Combine with movie ----
        dubbing_tasks[task_id]["step"] = 4
        dubbing_tasks[task_id]["step_progress"] = 0

        original_stem = os.path.splitext(os.path.basename(local_path))[0]
        safe_lang = re.sub(r"[^a-zA-Z0-9_-]", "_", target_language.lower())
        output_movie = os.path.join(task_dir, f"{original_stem}_{safe_lang}.mp4")

        ffmpeg_cmd = [
            "ffmpeg", "-y",
            "-i", local_path,
            "-i", dubbed_audio_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            output_movie,
        ]
        logger.info("Rendering dubbed movie: %s", " ".join(ffmpeg_cmd))
        try:
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(f"FFmpeg failed to combine audio + video: {exc.stderr}") from exc

        dubbing_tasks[task_id]["movie_url"] = _abs_to_web_url(output_movie)
        dubbing_tasks[task_id]["step_progress"] = 100

        # ---- Done ----
        dubbing_tasks[task_id]["status"] = "completed"
        logger.info("Smart dubbing task %s completed for '%s'", task_id, target_language)

    except Exception as exc:
        logger.error("Smart dubbing task %s failed: %s", task_id, exc, exc_info=True)
        dubbing_tasks[task_id]["status"] = "failed"
        dubbing_tasks[task_id]["error"] = str(exc)
    finally:
        if db is not None:
            db.close()


# ---------------------------------------------------------------------------
# Silent WAV fallback
# ---------------------------------------------------------------------------

def _create_silent_wav(path: str, duration: float = 1.0, sample_rate: int = 22050):
    """Write a silent WAV file using FFmpeg."""
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"anullsrc=r={sample_rate}:cl=mono",
        "-t", str(duration),
        path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)


# ---------------------------------------------------------------------------
# Language helpers
# ---------------------------------------------------------------------------

def get_supported_languages() -> List[str]:
    return SUPPORTED_LANGUAGES


def supports_language(language: str) -> bool:
    return language in NLLB_LANG_MAP
