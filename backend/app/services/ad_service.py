"""
Audio Description (AD) Service — generates narrated visual descriptions for
visually impaired viewers, mixed with the original audio using professional
ducking (side-chain compression).

Pipeline
--------
1. Load project script, scene_breakdown, subtitle timeline
2. Analyse dialogue gaps to find AD insertion windows
3. Generate AD narration text per scene via Qwen LLM
4. Align AD segments to available gaps
5. Synthesize AD speech via EdgeTTS
6. Mix AD audio over original with side-chain ducking
"""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import threading
import uuid
from typing import Any, Dict, List, Optional

from .tts_provider import (
    SUPPORTED_LANGUAGES,
    NLLB_LANG_MAP,
    SpeechProvider,
    EdgeTTSProvider,
    get_default_provider,
)
from .post_production_service import resolve_filepath

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

AD_DIR = "static/ad"
AD_DIR_ABS = os.path.join(os.getcwd(), AD_DIR)

# Global task store
ad_tasks: Dict[str, Dict[str, Any]] = {}

# Minimum gap (seconds) between subtitle blocks that can host AD
MIN_AD_GAP = 3.0

# AD narration voice per language (clear, neutral, authoritative)
AD_VOICES: Dict[str, str] = {
    "English": "en-US-GuyNeural",
    "Spanish": "es-ES-AlvaroNeural",
    "French": "fr-FR-HenriNeural",
    "Hindi": "hi-IN-MadhurNeural",
    "Bengali": "bn-IN-BashkarNeural",
    "Arabic": "ar-SA-HamedNeural",
    "Portuguese": "pt-BR-AntonioNeural",
    "Russian": "ru-RU-DmitryNeural",
    "German": "de-DE-ConradNeural",
    "Italian": "it-IT-DiegoNeural",
    "Japanese": "ja-JP-KeitaNeural",
    "Korean": "ko-KR-InJoonNeural",
    "Chinese": "zh-CN-YunxiNeural",
    "Dutch": "nl-NL-MaartenNeural",
    "Turkish": "tr-TR-AhmetNeural",
    "Thai": "th-TH-NiwatNeural",
    "Vietnamese": "vi-VN-NamMinhNeural",
    "Indonesian": "id-ID-ArdiNeural",
    "Malay": "ms-MY-OsmanNeural",
    "Tamil": "ta-IN-ValluvanNeural",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _task_dir(task_id: str) -> str:
    return os.path.join(AD_DIR_ABS, task_id)


def _abs_to_web_url(abspath: str) -> str:
    return "/" + os.path.relpath(abspath, os.getcwd()).replace(os.sep, "/")


def _ensure_dirs(task_id: str):
    os.makedirs(_task_dir(task_id), exist_ok=True)


def _get_media_duration(path: str) -> float:
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path,
    ]
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=15)
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError):
        return 0.0


# ---------------------------------------------------------------------------
# Gap detection — find slots between dialogue for AD
# ---------------------------------------------------------------------------

def _find_ad_windows(subtitles: List[Dict], total_duration: float) -> List[Dict]:
    """
    Find silent gaps between subtitle blocks that are long enough for AD.

    When subtitles are sparse or empty, creates evenly-spaced windows across
    the full video duration so every scene gets described.

    Returns list of ``{"start": float, "end": float, "duration": float}``.
    """
    windows: List[Dict] = []

    if not subtitles:
        # No dialogue at all — describe the entire film in chunks
        chunk_dur = max(min(total_duration / 5, 25), 10)
        pos = 0.0
        while pos < total_duration - MIN_AD_GAP:
            end = min(pos + chunk_dur, total_duration)
            windows.append({"start": pos, "end": end, "duration": end - pos})
            pos = end
        return windows

    # Gap before first subtitle
    if subtitles and subtitles[0].get("start", 0) >= MIN_AD_GAP:
        windows.append({
            "start": 0,
            "end": subtitles[0]["start"],
            "duration": subtitles[0]["start"],
        })

    # Gaps between subtitles
    for i in range(1, len(subtitles)):
        gap = subtitles[i]["start"] - subtitles[i - 1]["end"]
        if gap >= MIN_AD_GAP:
            windows.append({
                "start": subtitles[i - 1]["end"],
                "end": subtitles[i]["start"],
                "duration": gap,
            })

    # Gap after last subtitle
    if total_duration > 0:
        last_end = subtitles[-1]["end"]
        remaining = total_duration - last_end
        if remaining >= MIN_AD_GAP:
            windows.append({
                "start": last_end,
                "end": total_duration,
                "duration": remaining,
            })

    # If even the above found nothing meaningful, divide the full film
    if not windows and total_duration > 5:
        chunk_dur = max(min(total_duration / 5, 25), 10)
        pos = 0.0
        while pos < total_duration - MIN_AD_GAP:
            end = min(pos + chunk_dur, total_duration)
            windows.append({"start": pos, "end": end, "duration": end - pos})
            pos = end

    return windows


# ---------------------------------------------------------------------------
# Scene-to-time mapping (estimate when scenes play in the film)
# ---------------------------------------------------------------------------

def _estimate_scene_timing(
    scenes: List[Dict],
    total_duration: float,
) -> List[Dict]:
    """
    Estimate start/end times for each scene by dividing total duration evenly.
    Returns list of ``{"scene": scene_dict, "start": float, "end": float}``.
    """
    if not scenes or total_duration <= 0:
        return []

    n = len(scenes)
    scene_dur = total_duration / n
    result = []
    for i, s in enumerate(scenes):
        result.append({
            "scene": s,
            "start": i * scene_dur,
            "end": (i + 1) * scene_dur if i < n - 1 else total_duration,
        })
    return result


def _get_window_scenes(
    window_start: float,
    window_end: float,
    scene_timing: List[Dict],
) -> List[Dict]:
    """Return the scene(s) that overlap with this time window."""
    overlapping = []
    for st in scene_timing:
        if st["start"] < window_end and st["end"] > window_start:
            overlapping.append(st)
    return overlapping


def _scene_to_description(s: Dict) -> str:
    """Format a single scene into a compact description string."""
    parts = []

    def _str(val):
        if isinstance(val, list):
            return ", ".join(str(x) for x in val)
        return str(val or "")

    summary = _str(s.get("summary", "")).strip()
    env = _str(s.get("environment", "")).strip()
    chars = _str(s.get("character_descriptions", "")).strip()
    mood = _str(s.get("mood", "")).strip()
    camera = (_str(s.get("camera_movement", "")) + " " + _str(s.get("shot_type", ""))).strip()
    lighting = _str(s.get("lighting_design", "")).strip()
    time_of_day = _str(s.get("time_of_day", "")).strip()
    weather = _str(s.get("weather", "")).strip()
    effects = _str(s.get("special_effects", [])).strip()
    props = s.get("props", [])
    if isinstance(props, list):
        props = [str(x) for x in props]
    wardrobe = _str(s.get("wardrobe", "")).strip()

    if summary:
        parts.append(summary)
    if env:
        parts.append(f"Setting: {env}")
    if chars:
        parts.append(f"Characters: {chars}")
    if mood:
        parts.append(f"Mood: {mood}")
    if camera:
        parts.append(f"Camera: {camera}")
    if lighting:
        parts.append(f"Lighting: {lighting}")
    if time_of_day:
        parts.append(f"Time: {time_of_day}")
    if weather:
        parts.append(f"Weather: {weather}")
    if effects:
        parts.append(f"Effects: {effects}")
    if props:
        parts.append(f"Props: {', '.join(props[:5])}")
    if wardrobe:
        parts.append(f"Wardrobe: {wardrobe}")

    return " | ".join(parts) if parts else "No visual data available."


# ---------------------------------------------------------------------------
# AD text generation via Qwen (with window-to-scene mapping)
# ---------------------------------------------------------------------------

def _generate_ad_texts(
    scenes: List[Dict],
    script: str,
    windows: List[Dict],
    total_duration: float,
) -> List[str]:
    """
    Generate audio description texts for each available time window.

    Maps each window to the specific scene(s) playing during that time
    so the LLM can describe what's actually on screen per window.
    Falls back to per-scene descriptions if Qwen is unavailable.
    """
    from app.services.qwen_service import qwen_service

    if not windows:
        return []

    # Estimate which scenes play when
    scene_timing = _estimate_scene_timing(scenes, total_duration)

    # Build per-window info with scene context
    window_details = []
    for i, w in enumerate(windows):
        overlapping = _get_window_scenes(w["start"], w["end"], scene_timing)
        if overlapping:
            scene_context = "; ".join(
                f"Scene {ov['scene'].get('scene_number', '?')}: "
                f"{_scene_to_description(ov['scene'])}"
                for ov in overlapping
            )
        else:
            scene_context = "General scene — no specific scene data available."
        window_details.append(
            f"Window {i+1} ({w['start']:.1f}s–{w['end']:.1f}s, "
            f"{w['duration']:.1f}s available):\n"
            f"What's happening visually:\n{scene_context}"
        )

    prompt = (
        "You are an audio description writer for visually impaired audiences.\n\n"
        "Write ONE vivid, concise audio description sentence for each narration "
        "window below. Each description must describe ONLY what is visible on "
        "screen — actions, expressions, settings, on-screen text. Do NOT describe "
        "dialogue or sounds (those are already audible to the viewer).\n\n"
        f"Film script context:\n{script[:2000]}\n\n"
        "Windows:\n" + "\n\n".join(window_details) + "\n\n"
        "Return ONLY a JSON array of strings, one per window in order. "
        "Keep each description to at most 1 sentence. "
        "If a window has no useful visual info, use \"\"."
    )

    try:
        response = qwen_service.generate_text(prompt)
        clean = response.strip()
        if clean.startswith("```"):
            clean = re.sub(r"^```(?:json)?\n?", "", clean)
            clean = re.sub(r"\n?```$", "", clean)
            clean = clean.strip()

        texts = json.loads(clean)
        if isinstance(texts, list):
            while len(texts) < len(windows):
                texts.append("")
            return texts[:len(windows)]
    except Exception as exc:
        logger.warning("AD text generation via Qwen failed: %s. Using fallback.", exc)

    # Fallback: describe each window using its specific scene data
    fallback = []
    for w in windows:
        overlapping = _get_window_scenes(w["start"], w["end"], scene_timing)
        if overlapping:
            parts = []
            for ov in overlapping:
                desc = _scene_to_description(ov["scene"])
                if desc:
                    parts.append(desc)
            fallback.append(" | ".join(parts)[:300] if parts else "")
        else:
            fallback.append("")
    return fallback


# ---------------------------------------------------------------------------
# Background AD generation task
# ---------------------------------------------------------------------------

def generate_ad_background(
    task_id: str,
    project_id: int,
    movie_url: str,
    dest_language: str = "English",
) -> None:
    """
    Full AD pipeline running in a background thread.

    Progress is written to the global ``ad_tasks`` dict.
    """
    from app.db.database import SessionLocal
    from app.db.repository import project_repository

    db = None
    try:
        ad_tasks[task_id] = {
            "status": "processing",
            "step": 0,
            "step_progress": 0,
            "error": None,
            "preview_url": None,
            "audio_url": None,
            "movie_url": None,
            "ad_segments": None,
        }

        local_path = resolve_filepath(movie_url)
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Movie file not found at {local_path}")

        total_duration = _get_media_duration(local_path)
        logger.info("Video duration: %.2f sec", total_duration)

        _ensure_dirs(task_id)
        task_dir = _task_dir(task_id)

        # ---- Step 0: Load project data ----
        ad_tasks[task_id]["step"] = 0
        ad_tasks[task_id]["step_progress"] = 0

        db = SessionLocal()
        project = project_repository.get_by_id(db, project_id)
        if project is None:
            raise RuntimeError(f"Project {project_id} not found")

        script = project.script or ""
        scenes = (project.scene_breakdown or {}).get("scenes", [])
        subtitles = project.subtitles or []

        if not scenes and not script:
            raise RuntimeError("No script or scene data found. AD requires a completed project.")

        ad_tasks[task_id]["step_progress"] = 100

        # ---- Step 1: Find AD windows ----
        ad_tasks[task_id]["step"] = 1
        ad_tasks[task_id]["step_progress"] = 0

        windows = _find_ad_windows(subtitles, total_duration)

        if not windows:
            logger.warning("No AD windows could be created — film may be too short")
            windows = [{"start": 0, "end": min(8.0, total_duration), "duration": min(8.0, total_duration)}]

        logger.info("Found %d AD windows: %s", len(windows), windows)
        ad_tasks[task_id]["step_progress"] = 100

        # ---- Step 2: Generate AD text ----
        ad_tasks[task_id]["step"] = 2
        ad_tasks[task_id]["step_progress"] = 0

        ad_texts = _generate_ad_texts(scenes, script, windows, total_duration)
        ad_segments = []
        for w, t in zip(windows, ad_texts):
            if t.strip():
                ad_segments.append({"start": w["start"], "end": w["end"], "text": t})
        ad_tasks[task_id]["ad_segments"] = ad_segments
        logger.info("Generated %d AD segments", len(ad_segments))
        ad_tasks[task_id]["step_progress"] = 100

        # ---- Step 3: Generate TTS for each AD segment ----
        ad_tasks[task_id]["step"] = 3
        ad_tasks[task_id]["step_progress"] = 0
        ad_tasks[task_id]["total_clips"] = len(ad_segments)
        ad_tasks[task_id]["current_clip"] = 0

        clips_dir = os.path.join(task_dir, "clips")
        os.makedirs(clips_dir, exist_ok=True)

        tts = EdgeTTSProvider()
        voice = AD_VOICES.get(dest_language, "en-US-GuyNeural")
        clip_paths: List[str] = []

        for idx, seg in enumerate(ad_segments):
            clip_path = os.path.join(clips_dir, f"ad_{idx:04d}.wav")
            try:
                tts.generate_speech(seg["text"], dest_language, clip_path, voice=voice)
            except Exception as exc:
                logger.warning("AD TTS failed for clip %d: %s", idx, exc)
                subprocess.run([
                    "ffmpeg", "-y",
                    "-f", "lavfi", "-i", f"anullsrc=r=22050:cl=mono",
                    "-t", str(max(seg["end"] - seg["start"], 1.0)),
                    clip_path,
                ], check=True, capture_output=True)
            clip_paths.append(clip_path)
            ad_tasks[task_id]["current_clip"] = idx + 1
            ad_tasks[task_id]["step_progress"] = int((idx + 1) / len(ad_segments) * 100)

        ad_tasks[task_id]["step_progress"] = 100

        # ---- Step 4: Pad clips to fill their time slots ----
        ad_tasks[task_id]["step"] = 4
        ad_tasks[task_id]["step_progress"] = 0

        padded_paths = []
        for idx, (seg, cp) in enumerate(zip(ad_segments, clip_paths)):
            target_dur = seg["end"] - seg["start"]
            actual_dur = _get_media_duration(cp)
            padded = cp.replace(".wav", "_padded.wav")
            if actual_dur < target_dur:
                subprocess.run([
                    "ffmpeg", "-y", "-i", cp,
                    "-af", f"atrim=0:{target_dur},apad=pad_dur={target_dur}",
                    "-c:a", "pcm_s16le", "-ar", "22050", "-ac", "1",
                    "-t", str(target_dur), padded,
                ], check=True, capture_output=True, timeout=30)
                padded_paths.append(padded)
            else:
                padded_paths.append(cp)

        ad_tasks[task_id]["step_progress"] = 50

        # ---- Step 5: Build full AD audio track ----
        ad_audio_path = os.path.join(task_dir, "ad_audio.wav")
        if padded_paths:
            # Mix all AD clips together — they're already timed to specific windows.
            # Each clip is trimmed to its segment's duration, delayed to the correct
            # start position, then all clips are mixed into one timeline.
            # After mixing, apad extends the output to exactly total_duration so the
            # final mix step never truncates the video.
            mix_refs: List[str] = []
            filter_parts: List[str] = []
            for idx, (seg, pp) in enumerate(zip(ad_segments, padded_paths)):
                start_ms = int(seg["start"] * 1000)
                dur = seg["end"] - seg["start"]
                label = f"a{idx}"
                filter_parts.append(
                    f"[{idx}:a]atrim=0:{dur},adelay={start_ms}|{start_ms}[{label}]"
                )
                mix_refs.append(f"[{label}]")

            n = len(padded_paths)
            # apad ensures the mixed audio fills the entire video duration
            filter_parts.append(
                f"{''.join(mix_refs)}amix=inputs={n}:"
                f"dropout_transition=0,apad=pad_dur={total_duration}[out]"
            )

            cmd = ["ffmpeg", "-y"]
            for pp in padded_paths:
                cmd.extend(["-i", pp])
            cmd.extend([
                "-filter_complex", "; ".join(filter_parts),
                "-map", "[out]",
                "-c:a", "pcm_s16le", "-ar", "22050", "-ac", "1",
                ad_audio_path,
            ])
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=120)
        else:
            # No AD segments — create silence for the full duration
            subprocess.run([
                "ffmpeg", "-y",
                "-f", "lavfi", "-i", f"anullsrc=r=22050:cl=mono",
                "-t", str(total_duration),
                ad_audio_path,
            ], check=True, capture_output=True)

        # Verify AD audio duration matches video duration
        ad_audio_dur = _get_media_duration(ad_audio_path)
        if ad_audio_dur < total_duration - 1:
            logger.warning("AD audio (%.1fs) shorter than video (%.1fs) — padding", ad_audio_dur, total_duration)
            padded_audio = ad_audio_path.replace(".wav", "_extended.wav")
            subprocess.run([
                "ffmpeg", "-y", "-i", ad_audio_path,
                "-af", f"apad=pad_dur={total_duration}",
                "-c:a", "pcm_s16le", "-ar", "22050", "-ac", "1",
                "-t", str(total_duration),
                padded_audio,
            ], check=True, capture_output=True, timeout=30)
            os.replace(padded_audio, ad_audio_path)

        ad_tasks[task_id]["step_progress"] = 100
        ad_tasks[task_id]["audio_url"] = _abs_to_web_url(ad_audio_path)

        # Clean up padded clips
        for pp in padded_paths:
            if pp.endswith("_padded.wav") and os.path.exists(pp):
                try:
                    os.remove(pp)
                except Exception:
                    pass

        # ---- Step 6: Mix AD with original audio using side-chain ducking ----
        ad_tasks[task_id]["step"] = 5
        ad_tasks[task_id]["step_progress"] = 0

        original_stem = os.path.splitext(os.path.basename(local_path))[0]
        safe_lang = re.sub(r"[^a-zA-Z0-9_-]", "_", dest_language.lower())
        output_movie = os.path.join(task_dir, f"{original_stem}_ad_{safe_lang}.mp4")

        if padded_paths or os.path.getsize(ad_audio_path) > 1000:
            # Professional AD ducking:
            # - AD narration boosted +4 dB
            # - Original audio side-chain compressed by AD track (ducks -10 dB when AD speaks)
            # - Slow attack (5ms) and release (200ms) for natural transitions
            # - NO -shortest: the AD audio has been padded to full duration above,
            #   so the output will match the video length.
            mix_cmd = [
                "ffmpeg", "-y",
                "-i", local_path,
                "-i", ad_audio_path,
                "-filter_complex",
                "[1:a]volume=4dB[ad];"
                "[0:a][ad]sidechaincompress=threshold=0.07:ratio=20:"
                "attack=5:release=200:level_sc=0.3,volume=1.5dB[mixed]",
                "-map", "0:v:0",
                "-map", "[mixed]",
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                output_movie,
            ]
        else:
            # No AD — just copy original video (no -shortest)
            mix_cmd = [
                "ffmpeg", "-y",
                "-i", local_path,
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                output_movie,
            ]

        logger.info("Rendering AD movie: %s", " ".join(mix_cmd))
        try:
            subprocess.run(mix_cmd, check=True, capture_output=True, text=True, timeout=300)
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(f"FFmpeg AD mix failed: {exc.stderr[:500]}") from exc

        ad_tasks[task_id]["movie_url"] = _abs_to_web_url(output_movie)
        ad_tasks[task_id]["step_progress"] = 100

        # ---- Persist AD to project ----
        if project_id > 0:
            try:
                from app.db.database import SessionLocal as _AdSession
                _adb = _AdSession()
                try:
                    _proj = project_repository.get_by_id(_adb, project_id)
                    if _proj:
                        ad_movies = dict(_proj.ad_movies or {})
                        lang_key = dest_language
                        ad_movies[lang_key] = {
                            "movie_url": ad_tasks[task_id]["movie_url"],
                            "audio_url": ad_tasks[task_id]["audio_url"],
                            "task_id": task_id,
                        }
                        project_repository.update(_adb, project_id, ad_movies=ad_movies)
                finally:
                    _adb.close()
            except Exception as exc2:
                logger.warning("Failed to persist AD to project %d: %s", project_id, exc2)

        # ---- Done ----
        ad_tasks[task_id]["status"] = "completed"
        logger.info("AD task %s completed for '%s'", task_id, dest_language)

    except Exception as exc:
        logger.error("AD task %s failed: %s", task_id, exc, exc_info=True)
        ad_tasks[task_id]["status"] = "failed"
        ad_tasks[task_id]["error"] = str(exc)
    finally:
        if db is not None:
            db.close()
