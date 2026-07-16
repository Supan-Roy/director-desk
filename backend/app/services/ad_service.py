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

    Returns list of ``{"start": float, "end": float, "duration": float}``.
    """
    windows = []

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
    if subtitles and total_duration > 0:
        last_end = subtitles[-1]["end"]
        remaining = total_duration - last_end
        if remaining >= MIN_AD_GAP:
            windows.append({
                "start": last_end,
                "end": total_duration,
                "duration": remaining,
            })

    return windows


# ---------------------------------------------------------------------------
# AD text generation via Qwen
# ---------------------------------------------------------------------------

def _generate_ad_texts(
    scenes: List[Dict],
    script: str,
    windows: List[Dict],
) -> List[str]:
    """
    Generate audio description texts for each available time window.

    Uses Qwen LLM to convert visual scene data into concise, natural
    narration that fits within each window's duration.
    """
    from app.services.qwen_service import qwen_service

    if not windows:
        return []

    # Build a compact scene summary for the prompt
    scene_summaries = []
    for s in scenes:
        scene_summaries.append(
            f"Scene {s.get('scene_number', '?')}: {s.get('summary', '')} | "
            f"Environment: {s.get('environment', '')} | "
            f"Characters: {s.get('character_descriptions', '')} | "
            f"Mood: {s.get('mood', '')} | "
            f"Camera: {s.get('camera_movement', '')} {s.get('shot_type', '')} | "
            f"Lighting: {s.get('lighting_design', '')} | "
            f"Time: {s.get('time_of_day', '')} | "
            f"Weather: {s.get('weather', '')} | "
            f"Effects: {s.get('special_effects', '')} | "
            f"Props: {', '.join(s.get('props', []))} | "
            f"Wardrobe: {s.get('wardrobe', '')}"
        )

    windows_desc = []
    for i, w in enumerate(windows):
        windows_desc.append(
            f"Window {i+1}: {w['start']:.1f}s to {w['end']:.1f}s ({w['duration']:.1f}s available)"
        )

    prompt = (
        "You are an audio description writer for visually impaired audiences.\n\n"
        f"Full script:\n{script}\n\n"
        f"Scene-by-scene visual data:\n" + "\n".join(scene_summaries) + "\n\n"
        f"Available narration windows (seconds into the film):\n" + "\n".join(windows_desc) + "\n\n"
        "Write concise, vivid audio descriptions for each window. Each description MUST fit "
        "within its available duration (1 word ≈ 0.3s spoken). Describe only what is VISUALLY "
        "happening — character expressions, actions, settings, on-screen text. Do NOT describe "
        "sounds or dialogue (those are already audible).\n\n"
        "Return ONLY a valid JSON array of strings, one per window in order. "
        "If no description is needed for a window, use an empty string \"\"."
    )

    try:
        response = qwen_service.generate_text(prompt)
        # Clean markdown wraps
        clean = response.strip()
        if clean.startswith("```"):
            clean = re.sub(r"^```(?:json)?\n?", "", clean)
            clean = re.sub(r"\n?```$", "", clean)
            clean = clean.strip()

        texts = json.loads(clean)
        if isinstance(texts, list):
            # Pad or trim to match window count
            while len(texts) < len(windows):
                texts.append("")
            return texts[:len(windows)]
    except Exception as exc:
        logger.warning("AD text generation failed: %s", exc)

    # Fallback: generate basic descriptions from scene data
    fallback = []
    for w in windows:
        desc = _fallback_ad_text(scenes, w)
        fallback.append(desc)
    return fallback


def _fallback_ad_text(scenes: List[Dict], window: Dict) -> str:
    """Simple fallback AD text when Qwen is unavailable."""
    # Find which scene overlaps this window
    for s in scenes:
        # Simple heuristic: just use the first scene's summary
        summary = s.get("summary", "")
        if summary:
            return f"Now: {summary[:150]}"
    return ""


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
            logger.warning("No gaps large enough for AD found in dialogue")
            # If no gaps, still try to create a single opening description
            if total_duration > 5:
                windows = [{"start": 0, "end": min(5.0, total_duration), "duration": min(5.0, total_duration)}]

        logger.info("Found %d AD windows: %s", len(windows), windows)
        ad_tasks[task_id]["step_progress"] = 100

        # ---- Step 2: Generate AD text ----
        ad_tasks[task_id]["step"] = 2
        ad_tasks[task_id]["step_progress"] = 0

        ad_texts = _generate_ad_texts(scenes, script, windows)
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
            # Mix all AD clips together — they're already timed to specific windows
            # Use the same amix approach as dubbing
            mix_refs = []
            filter_parts = []
            for idx, (seg, pp) in enumerate(zip(ad_segments, padded_paths)):
                start_ms = int(seg["start"] * 1000)
                dur = seg["end"] - seg["start"]
                label = f"a{idx}"
                filter_parts.append(
                    f"[{idx}:a]atrim=0:{dur},adelay={start_ms}|{start_ms}[{label}]"
                )
                mix_refs.append(f"[{label}]")

            n = len(padded_paths)
            filter_parts.append(
                f"{''.join(mix_refs)}amix=inputs={n}:"
                f"dropout_transition=0,atrim=0:{total_duration}[out]"
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
            # No AD segments — create silence
            subprocess.run([
                "ffmpeg", "-y",
                "-f", "lavfi", "-i", f"anullsrc=r=22050:cl=mono",
                "-t", str(total_duration),
                ad_audio_path,
            ], check=True, capture_output=True)

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

        if padded_paths:
            # Professional AD ducking:
            # - AD narration boosted +4 dB
            # - Original audio side-chain compressed by AD track (ducks -10 dB when AD speaks)
            # - Slow attack (5ms) and release (200ms) for natural transitions
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
                "-shortest",
                output_movie,
            ]
        else:
            # No AD — just copy original
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
