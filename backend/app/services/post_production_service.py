import os
import subprocess
import logging
import re
import threading
from typing import List, Dict, Any, Optional

from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global task-state store (mirrors the editor's rendering_tasks pattern)
# ---------------------------------------------------------------------------
generation_tasks: Dict[str, Dict[str, Any]] = {}

_whisper_model: Optional[WhisperModel] = None
_model_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def resolve_filepath(url: str) -> str:
    """Strip leading slash to make path relative to the project root."""
    if not url:
        return ""
    if url.startswith("/"):
        url = url[1:]
    return url


# ---------------------------------------------------------------------------
# Model cache (singleton, lazy-loaded across threads)
# ---------------------------------------------------------------------------

def get_or_create_model() -> WhisperModel:
    """Return a cached WhisperModel, loading it once on first call."""
    global _whisper_model
    if _whisper_model is None:
        with _model_lock:
            if _whisper_model is None:
                logger.info("Loading faster-whisper tiny model (CPU, int8) ...")
                _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
                logger.info("Whisper model loaded.")
    return _whisper_model


# ---------------------------------------------------------------------------
# Audio utilities
# ---------------------------------------------------------------------------

def get_audio_duration_ffprobe(filepath: str) -> Optional[float]:
    """Return audio duration (seconds) via ffprobe."""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            filepath,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(result.stdout.strip())
    except Exception as e:
        logger.warning(f"Could not determine audio duration via ffprobe: {e}")
        return None


def extract_audio_ffmpeg(movie_path: str, output_audio_path: str) -> bool:
    """
    Extract 16 kHz mono WAV audio with FFmpeg – the only pre-processing
    step needed by the local Whisper model.
    """
    try:
        if not os.path.exists(movie_path):
            logger.error(f"Input video does not exist: {movie_path}")
            return False

        os.makedirs(os.path.dirname(output_audio_path), exist_ok=True)

        cmd = [
            "ffmpeg", "-y",
            "-i", movie_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            output_audio_path,
        ]
        logger.info(f"Extracting audio: {' '.join(cmd)}")
        subprocess.run(cmd, check=True, capture_output=True)
        return os.path.exists(output_audio_path)
    except Exception as e:
        logger.error(f"FFmpeg audio extraction failed: {e}", exc_info=True)
        return False


# ---------------------------------------------------------------------------
# Background subtitle generation (entirely API-cost-free)
# ---------------------------------------------------------------------------

def generate_subtitles_background(task_id: str, project_id: int, movie_url: str) -> None:
    """
    Run inside a background thread:
      0. Extract audio (FFmpeg)
      1. Load Whisper model (cached singleton)
      2. Transcribe (local faster-whisper)
      3. Finalise & persist (only if project_id > 0)
    Progress is written to the global `generation_tasks` dict so the HTTP
    polling endpoint can read it.
    """
    from app.db.database import SessionLocal
    from app.db.repository import project_repository

    db = None
    try:
        generation_tasks[task_id] = {
            "status": "processing",
            "step": 0,
            "step_progress": 0,
            "error": None,
            "subtitles": None,
            "statistics": None,
        }

        local_path = resolve_filepath(movie_url)
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Movie file not found at {local_path}")

        # ---- Step 0: FFmpeg audio extraction ----
        generation_tasks[task_id]["step"] = 0
        generation_tasks[task_id]["step_progress"] = 0

        base, _ = os.path.splitext(local_path)
        audio_path = f"{base}_audio.wav"

        generation_tasks[task_id]["step_progress"] = 20
        if not extract_audio_ffmpeg(local_path, audio_path):
            raise RuntimeError("FFmpeg audio extraction failed — corrupt or unsupported video file?")
        generation_tasks[task_id]["step_progress"] = 100

        # Determine audio duration so we can report transcription progress
        audio_duration = get_audio_duration_ffprobe(audio_path)

        # ---- Step 1: Load Whisper model ----
        generation_tasks[task_id]["step"] = 1
        generation_tasks[task_id]["step_progress"] = 0

        model = get_or_create_model()
        generation_tasks[task_id]["step_progress"] = 100

        # ---- Step 2: Transcribe ----
        generation_tasks[task_id]["step"] = 2
        generation_tasks[task_id]["step_progress"] = 0

        segments, _info = model.transcribe(audio_path, beam_size=5)

        subtitles: List[Dict[str, Any]] = []
        last_end = 0.0
        for idx, segment in enumerate(segments):
            subtitles.append({
                "id": idx + 1,
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": segment.text.strip(),
            })
            last_end = segment.end
            # Report progress as fraction of total audio duration
            if audio_duration and audio_duration > 0:
                progress = min(int((last_end / audio_duration) * 100), 99)
                generation_tasks[task_id]["step_progress"] = progress

        generation_tasks[task_id]["step_progress"] = 100

        # Clean up the temporary audio file
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass

        # ---- Step 3: Finalise & persist ----
        generation_tasks[task_id]["step"] = 3
        generation_tasks[task_id]["step_progress"] = 0

        stats = calculate_statistics(subtitles)
        generation_tasks[task_id]["step_progress"] = 30

        # Persist to database if this is a registered project
        if project_id > 0:
            db = SessionLocal()
            project = project_repository.get_by_id(db, project_id)
            if project is not None:
                project_repository.update(db, project_id,
                                          subtitles=subtitles,
                                          mastered_movie_url=movie_url)
        generation_tasks[task_id]["step_progress"] = 100

        generation_tasks[task_id]["status"] = "completed"
        generation_tasks[task_id]["subtitles"] = subtitles
        generation_tasks[task_id]["statistics"] = stats

    except Exception as e:
        logger.error(f"Subtitle generation task {task_id} failed: {e}", exc_info=True)
        generation_tasks[task_id]["status"] = "failed"
        generation_tasks[task_id]["error"] = str(e)
    finally:
        if db is not None:
            db.close()


# ---------------------------------------------------------------------------
# Timestamp formatting
# ---------------------------------------------------------------------------

def format_timestamp_srt(seconds: float) -> str:
    """HH:MM:SS,ms"""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    if ms >= 1000:
        ms = 999
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def format_timestamp_vtt(seconds: float) -> str:
    """HH:MM:SS.ms"""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    if ms >= 1000:
        ms = 999
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{ms:03d}"


# ---------------------------------------------------------------------------
# Export helpers
# ---------------------------------------------------------------------------

def export_srt(subtitles: List[Dict[str, Any]]) -> str:
    lines: List[str] = []
    for sub in subtitles:
        lines.append(str(sub["id"]))
        lines.append(f"{format_timestamp_srt(sub['start'])} --> {format_timestamp_srt(sub['end'])}")
        lines.append(sub["text"])
        lines.append("")
    return "\n".join(lines)


def export_vtt(subtitles: List[Dict[str, Any]]) -> str:
    lines = ["WEBVTT", ""]
    for sub in subtitles:
        lines.append(str(sub["id"]))
        lines.append(f"{format_timestamp_vtt(sub['start'])} --> {format_timestamp_vtt(sub['end'])}")
        lines.append(sub["text"])
        lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------

def calculate_statistics(subtitles: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not subtitles:
        return {
            "total_subtitles": 0,
            "average_duration": 0.0,
            "total_words": 0,
            "characters_per_second": 0.0,
        }

    total_subs = len(subtitles)
    total_duration = sum(sub["end"] - sub["start"] for sub in subtitles)
    avg_dur = round(total_duration / total_subs, 2) if total_subs > 0 else 0.0

    total_words = 0
    total_chars = 0
    for sub in subtitles:
        text = sub.get("text", "")
        total_words += len(text.split())
        total_chars += len(text)

    cps = round(total_chars / total_duration, 2) if total_duration > 0 else 0.0

    return {
        "total_subtitles": total_subs,
        "average_duration": avg_dur,
        "total_words": total_words,
        "characters_per_second": cps,
    }
