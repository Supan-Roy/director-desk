"""
Dubbing Service — orchestrates the multilingual dubbing pipeline.

Pipeline
--------
1. Load subtitle timeline from the project
2. Translate subtitles to the target language (NLLB-200)
3. Generate speech for every subtitle block (TTS provider)
4. **Timed audio assembly** — place each speech clip at its original
   subtitle start time, padded/trimmed to match the original subtitle
   duration.  The assembled audio track always has the same length as
   the source video, so the dubbed movie never gets truncated.
5. Combine dubbed audio with original video via FFmpeg → output movie
"""

from __future__ import annotations

import json
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

# Max clips to process in a single FFmpeg amix filter graph
# If there are more clips than this, they are layered in batches
MAX_AMIX_INPUTS = 50


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
    clips_dir = os.path.join(_task_dir(task_id), "clips")
    if os.path.isdir(clips_dir):
        shutil.rmtree(clips_dir, ignore_errors=True)


def _get_media_duration(path: str) -> float:
    """Get total duration (seconds) of a media file via ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path,
    ]
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=15)
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError) as exc:
        logger.warning("Failed to probe media duration for %s: %s", path, exc)
        return 0.0


def _get_audio_duration(path: str) -> float:
    """Get duration (seconds) of a WAV/audio file via ffprobe."""
    return _get_media_duration(path)


def _pad_wav_to_duration(input_path: str, output_path: str, target_dur: float):
    """Pad or trim *input_path* to exactly *target_dur* seconds."""
    subprocess.run([
        "ffmpeg", "-y",
        "-i", input_path,
        "-af", f"atrim=0:{target_dur},apad=pad_dur={target_dur}",
        "-c:a", "pcm_s16le",
        "-ar", "22050",
        "-ac", "1",
        "-t", str(target_dur),
        output_path,
    ], check=True, capture_output=True, text=True, timeout=30)


# ---------------------------------------------------------------------------
# Timed audio assembly — places clips at subtitle-timed positions
# ---------------------------------------------------------------------------

def _assemble_timed_audio(
    clip_paths: List[str],
    subtitles: List[Dict],
    output_path: str,
    total_duration: float,
) -> str:
    """
    Assemble per-subtitle TTS clips into a single WAV that preserves the
    original subtitle timing.

    Strategy:
      1. Trim each clip to its subtitle duration (``atrim``), then delay
         it to its start position (``adelay``).
      2. Mix all delayed clips with ``amix`` — no separate silence track,
         so volume is not attenuated by a constant silent input.
      3. Pad the mixed output with ``apad`` to match the full video duration.

    Each clip file is an FFmpeg input (-i).  The filter graph references them
    by their input index (0, 1, 2, …).
    """
    if not clip_paths:
        raise RuntimeError("No speech clips to assemble")
    if not subtitles:
        raise RuntimeError("No subtitles provided for timed assembly")
    if total_duration <= 0:
        total_duration = max(s.get("end", 0) for s in subtitles)
        if total_duration <= 0:
            raise RuntimeError("Cannot determine total duration for audio assembly")

    logger.info(
        "Assembling %d clips into %.2f-second timeline...",
        len(clip_paths), total_duration,
    )

    abs_clips = [os.path.abspath(p) for p in clip_paths]

    # ---- Pre-pad each clip to exactly match its subtitle duration ----
    # TTS clips are often shorter than the subtitle slot (EdgeTTS speaks
    # faster than natural speech).  Without padding, the gap between clips
    # becomes audible silence even though the subtitle timing expects audio.
    padded_clips = []
    for clip, sub in zip(abs_clips, subtitles):
        target_dur = sub["end"] - sub["start"]
        actual_dur = _get_audio_duration(clip)
        if actual_dur < target_dur:
            padded = clip.replace(".wav", "_padded.wav")
            # Use FFmpeg to pad the clip to exactly target_dur
            _pad_wav_to_duration(clip, padded, target_dur)
            padded_clips.append(padded)
        else:
            padded_clips.append(clip)

    # Helper: build a single amix filter command for a set of clips.
    def _build_mix_cmd(
        clip_inputs: List[tuple],
        out_path: str,
    ) -> List[str]:
        """Return ``ffmpeg`` argument list for one amix-based overlay."""
        filter_parts = []
        mix_refs = []

        for idx, (cp, sub) in enumerate(clip_inputs):
            start_ms = int(sub["start"] * 1000)
            label = f"c{idx}"
            # Each clip was pre-padded to exactly match the subtitle duration.
            # Just delay to position — no individual trim/pad needed.
            filter_parts.append(
                f"[{idx}:a]adelay={start_ms}|{start_ms}[{label}]"
            )
            mix_refs.append(f"[{label}]")

        n_inputs = len(clip_inputs)
        filter_parts.append(
            f"{''.join(mix_refs)}amix=inputs={n_inputs}:"
            f"dropout_transition=0,atrim=0:{total_duration}[out]"
        )

        cmd = ["ffmpeg", "-y"]
        for cp, _ in clip_inputs:
            cmd.extend(["-i", cp])
        cmd.extend([
            "-filter_complex", "; ".join(filter_parts),
            "-map", "[out]",
            "-c:a", "pcm_s16le",
            "-ar", "22050",
            "-ac", "1",
            out_path,
        ])
        return cmd

    if len(clip_paths) <= MAX_AMIX_INPUTS:
        # Single batch — all clips in one amix graph
        cmd = _build_mix_cmd(list(zip(padded_clips, subtitles)), output_path)
        logger.debug("Timed assembly command: %s", " ".join(cmd))
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=120)
        except subprocess.CalledProcessError as exc:
            logger.error("Timed assembly failed: %s", exc.stderr[:1000])
            raise RuntimeError(
                f"Timed audio assembly failed. FFmpeg stderr:\n{exc.stderr[:500]}"
            ) from exc
    else:
        # Multi-batch: split into groups of MAX_AMIX_INPUTS, mix each group,
        # then mix all group outputs together.
        logger.info(
            "Large clip set (%d), splitting into batches of %d",
            len(clip_paths), MAX_AMIX_INPUTS,
        )
        batch_outputs = []
        for batch_start in range(0, len(clip_paths), MAX_AMIX_INPUTS):
            batch_end = min(batch_start + MAX_AMIX_INPUTS, len(clip_paths))
            batch_clips = padded_clips[batch_start:batch_end]
            batch_subs = subtitles[batch_start:batch_end]
            batch_out = output_path.replace(
                ".wav", f"_batch{batch_start // MAX_AMIX_INPUTS}.wav"
            )

            cmd = _build_mix_cmd(
                list(zip(batch_clips, batch_subs)), batch_out
            )
            try:
                subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=120)
            except subprocess.CalledProcessError as exc:
                logger.error("Batch assembly failed: %s", exc.stderr[:500])
                raise RuntimeError(
                    f"Batch audio assembly failed:\n{exc.stderr[:200]}"
                ) from exc
            batch_outputs.append(batch_out)

        # Mix all batch outputs together (they all cover the same timeline)
        cmd = _build_mix_cmd(
            [(bp, subtitles[0]) for bp in batch_outputs],
            output_path,
        )
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=120)
        except subprocess.CalledProcessError as exc:
            logger.error("Batch re-mix failed: %s", exc.stderr[:500])
            raise RuntimeError(
                f"Batch re-mix failed:\n{exc.stderr[:200]}"
            ) from exc
        finally:
            for bp in batch_outputs:
                if os.path.exists(bp):
                    os.remove(bp)

    # Clean up padded clip files
    for p in padded_clips:
        if p.endswith("_padded.wav") and os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass

    if not os.path.exists(output_path):
        raise RuntimeError(
            f"Timed audio assembly did not produce output at {output_path}"
        )

    actual_dur = _get_audio_duration(output_path)
    logger.info(
        "Assembled timed audio: %s (%.2f sec, target %.2f sec)",
        output_path, actual_dur, total_duration,
    )
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

        # Get total video duration for timed audio assembly
        total_duration = _get_media_duration(local_path)
        if total_duration <= 0:
            logger.warning("Could not probe video duration; will compute from subtitles")
        logger.info("Original video duration: %.2f sec", total_duration)

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
                # Create a silent WAV as fallback matching subtitle duration
                sub_dur = max(sub.get("end", 0) - sub.get("start", 0), 1.0)
                _create_silent_wav(clip_path, duration=sub_dur)

            clip_paths.append(clip_path)
            dubbing_tasks[task_id]["current_clip"] = idx + 1
            dubbing_tasks[task_id]["step_progress"] = int(
                ((idx + 1) / len(translated_subs)) * 100
            )

        dubbing_tasks[task_id]["step_progress"] = 100

        # ---- Step 3: Assemble timed audio track ----
        dubbing_tasks[task_id]["step"] = 3
        dubbing_tasks[task_id]["step_progress"] = 0

        dubbed_audio_path = os.path.join(task_dir, "dubbed_audio.wav")

        # Use timed assembly instead of naive concat
        if total_duration > 0:
            _assemble_timed_audio(clip_paths, translated_subs, dubbed_audio_path, total_duration)
        else:
            # Fallback: compute duration from subtitles
            fallback_dur = max(s.get("end", 0) for s in translated_subs)
            if fallback_dur > 0:
                _assemble_timed_audio(clip_paths, translated_subs, dubbed_audio_path, fallback_dur)
            else:
                # Last resort: old sequential concat
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

        # Persist the completed dub to the project
        if project_id > 0 and output_movie:
            try:
                from app.db.database import SessionLocal as _Session
                _db2 = _Session()
                try:
                    _project = project_repository.get_by_id(_db2, project_id)
                    if _project:
                        dubs = _project.dubbed_movies or {}
                        dubs[target_language] = {
                            "movie_url": _abs_to_web_url(output_movie),
                            "audio_url": _abs_to_web_url(dubbed_audio_path),
                            "task_id": task_id,
                        }
                        project_repository.update(_db2, project_id, dubbed_movies=dubs)
                finally:
                    _db2.close()
            except Exception as exc2:
                logger.warning("Failed to persist dub to project %d: %s", project_id, exc2)

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

        # Get total video duration for timed audio assembly
        total_duration = _get_media_duration(local_path)
        logger.info("Original video duration: %.2f sec", total_duration)

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
                tts_provider.generate_speech(
                    sub["text"], target_language, clip_path,
                    voice=voice_name,
                )
            except Exception as exc:
                logger.warning(
                    "Speech generation failed for clip %d (%s), inserting silence: %s",
                    idx, sub["text"][:40], exc,
                )
                sub_dur = max(sub.get("end", 0) - sub.get("start", 0), 1.0)
                _create_silent_wav(clip_path, duration=sub_dur)

            clip_paths.append(clip_path)
            dubbing_tasks[task_id]["current_clip"] = idx + 1
            dubbing_tasks[task_id]["step_progress"] = int(
                ((idx + 1) / len(translated_subs)) * 100
            )

        dubbing_tasks[task_id]["step_progress"] = 100

        # ---- Step 3: Assemble timed audio track ----
        dubbing_tasks[task_id]["step"] = 3
        dubbing_tasks[task_id]["step_progress"] = 0

        dubbed_audio_path = os.path.join(task_dir, "dubbed_audio.wav")

        if total_duration > 0:
            _assemble_timed_audio(clip_paths, translated_subs, dubbed_audio_path, total_duration)
        else:
            fallback_dur = max(s.get("end", 0) for s in translated_subs)
            if fallback_dur > 0:
                _assemble_timed_audio(clip_paths, translated_subs, dubbed_audio_path, fallback_dur)
            else:
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

        # Persist the completed dub to the project
        if project_id > 0:
            try:
                from app.db.database import SessionLocal as _S
                _db2 = _S()
                try:
                    _p = project_repository.get_by_id(_db2, project_id)
                    if _p:
                        dubs = _p.dubbed_movies or {}
                        dubs[target_language] = {
                            "movie_url": _abs_to_web_url(output_movie),
                            "audio_url": _abs_to_web_url(dubbed_audio_path),
                            "task_id": task_id,
                        }
                        project_repository.update(_db2, project_id, dubbed_movies=dubs)
                finally:
                    _db2.close()
            except Exception as exc2:
                logger.warning("Failed to persist dub to project %d: %s", project_id, exc2)

    except Exception as exc:
        logger.error("Smart dubbing task %s failed: %s", task_id, exc, exc_info=True)
        dubbing_tasks[task_id]["status"] = "failed"
        dubbing_tasks[task_id]["error"] = str(exc)
    finally:
        if db is not None:
            db.close()


# ---------------------------------------------------------------------------
# Legacy concat (fallback when video duration is unavailable)
# ---------------------------------------------------------------------------

def _concatenate_audio_clips(
    clip_paths: List[str],
    output_path: str,
    subtitle_timing: List[Dict],
) -> str:
    """
    Legacy sequential concatenation — kept as fallback when video duration
    cannot be determined.  Note: this does NOT preserve subtitle timing and
    may produce audio shorter than the source video.
    """
    if not clip_paths:
        raise RuntimeError("No speech clips to assemble")

    concat_file = output_path.replace(".wav", "_concat.txt")
    abs_clips = [os.path.abspath(p) for p in clip_paths]

    with open(concat_file, "w") as f:
        for path in abs_clips:
            f.write(f"file '{path}'\n")

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
    logger.info("Legacy concat: %d clips", len(clip_paths))
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        logger.error("FFmpeg concat failed: %s", exc.stderr)
        raise RuntimeError(f"Audio concatenation failed: {exc.stderr}") from exc
    finally:
        if os.path.exists(concat_file):
            os.remove(concat_file)

    logger.info("Assembled (legacy concat): %s", output_path)
    return output_path


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
