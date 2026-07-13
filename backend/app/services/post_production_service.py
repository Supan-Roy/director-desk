import os
import subprocess
import logging
import re
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Attempt to load faster-whisper dynamically
try:
    from faster_whisper import WhisperModel
    HAS_FASTER_WHISPER = True
except ImportError:
    HAS_FASTER_WHISPER = False


def resolve_filepath(url: str) -> str:
    """Strip leading slash to make path relative to root directory."""
    if not url:
        return ""
    if url.startswith("/"):
        url = url[1:]
    return url


def extract_audio_ffmpeg(movie_path: str, output_audio_path: str) -> bool:
    """
    Extract audio track from video file using FFmpeg.
    Saves as 16kHz mono WAV file optimized for Whisper transcription.
    """
    try:
        # Resolve files to check existence
        if not os.path.exists(movie_path):
            logger.error(f"Input video file does not exist: {movie_path}")
            return False

        # Create base directory if missing
        os.makedirs(os.path.dirname(output_audio_path), exist_ok=True)

        cmd = [
            "ffmpeg", "-y",
            "-i", movie_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            output_audio_path
        ]
        logger.info(f"Extracting audio using FFmpeg: {' '.join(cmd)}")
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return os.path.exists(output_audio_path)
    except Exception as e:
        logger.error(f"FFmpeg audio extraction failed: {e}", exc_info=True)
        return False


def transcribe_audio(project_id: int, movie_url: str, db) -> List[Dict[str, Any]]:
    """
    Main transcription pipeline:
    1. Extract audio.
    2. Transcribe via faster-whisper (local CPU tiny).
    3. Fallback to OpenAI Whisper API if standard OPENAI_API_KEY is found.
    4. Fallback to screenplay-independent storyboard text alignment.
    """
    local_path = resolve_filepath(movie_url)
    if not os.path.exists(local_path):
        logger.warning(f"Master movie {local_path} not found. Running storyboard alignment fallback directly.")
        return transcribe_fallback(project_id, db)

    # Temporary audio output file
    base, _ = os.path.splitext(local_path)
    audio_path = f"{base}_audio.wav"

    success = extract_audio_ffmpeg(local_path, audio_path)
    if not success:
        logger.warning("FFmpeg audio extraction failed. Falling back to storyboard alignment.")
        return transcribe_fallback(project_id, db)

    # Step 1: Try faster-whisper
    if HAS_FASTER_WHISPER:
        try:
            logger.info("Transcribing using local faster-whisper model (tiny)...")
            model = WhisperModel("tiny", device="cpu", compute_type="int8")
            segments, info = model.transcribe(audio_path, beam_size=5)
            
            subtitles = []
            for idx, segment in enumerate(segments):
                subtitles.append({
                    "id": idx + 1,
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": segment.text.strip()
                })
            
            # Clean up audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
            return subtitles
        except Exception as e:
            logger.error(f"faster-whisper transcription failed: {e}. Trying OpenAI API fallback.", exc_info=True)

    # Step 2: Try OpenAI Whisper API
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and not openai_key.startswith("mock-"):
        try:
            logger.info("Transcribing using OpenAI Whisper API...")
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            with open(audio_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json"
                )
            
            subtitles = []
            segments = getattr(transcript, 'segments', [])
            if segments:
                for idx, segment in enumerate(segments):
                    subtitles.append({
                        "id": idx + 1,
                        "start": round(segment.get('start', 0.0), 2),
                        "end": round(segment.get('end', 0.0), 2),
                        "text": segment.get('text', '').strip()
                    })
            else:
                text = getattr(transcript, 'text', '')
                if text:
                    subtitles.append({
                        "id": 1,
                        "start": 0.0,
                        "end": 5.0,
                        "text": text.strip()
                    })
            
            # Clean up audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
            return subtitles
        except Exception as e:
            logger.error(f"OpenAI transcription failed: {e}. Falling back to storyboard alignment.", exc_info=True)

    # Clean up audio file if unused
    if os.path.exists(audio_path):
        try:
            os.remove(audio_path)
        except Exception:
            pass

    # Step 3: Heuristic-based alignment fallback
    logger.info("Running storyboard scene-based transcription fallback...")
    return transcribe_fallback(project_id, db)


def transcribe_fallback(project_id: int, db) -> List[Dict[str, Any]]:
    """
    Fallback subtitle generator that aligns subtitle timestamps with the actual
    scenes in the project's storyboard, split into small readable sentences.
    """
    from app.db.repository import project_repository
    project = project_repository.get_by_id(db, project_id)
    if not project or not project.storyboard:
        return [
            {"id": 1, "start": 0.0, "end": 3.0, "text": "Welcome to Director Desk Post Production."},
            {"id": 2, "start": 3.5, "end": 7.0, "text": "This is a completed AI movie presentation."}
        ]

    subtitles = []
    current_time = 0.0
    idx = 1

    for scene in project.storyboard:
        duration = float(scene.get("duration", 5.0))
        # Narrative description or script voiceover
        text = scene.get("script") or scene.get("prompt") or ""
        
        # Strip aspect ratio formatting brackets [Aspect: ...]
        text = re.sub(r'\[Aspect:[^\]]+\]', '', text).strip()
        if not text:
            text = f"Scene {scene.get('scene_number', idx)}"

        words = text.split()
        if not words:
            continue

        words_per_segment = 7
        segment_count = max(1, len(words) // words_per_segment)
        time_per_segment = duration / segment_count

        for s_idx in range(segment_count):
            segment_words = words[s_idx * words_per_segment : (s_idx + 1) * words_per_segment]
            if s_idx == segment_count - 1:
                segment_words = words[s_idx * words_per_segment :]
                
            segment_text = " ".join(segment_words)
            if not segment_text:
                continue

            start = round(current_time + (s_idx * time_per_segment), 2)
            end = round(start + time_per_segment, 2)

            subtitles.append({
                "id": idx,
                "start": start,
                "end": end,
                "text": segment_text
            })
            idx += 1

        current_time += duration

    return subtitles


def format_timestamp_srt(seconds: float) -> str:
    """Format seconds into HH:MM:SS,ms format for SRT."""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    if ms >= 1000:
        ms = 999
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def format_timestamp_vtt(seconds: float) -> str:
    """Format seconds into HH:MM:SS.ms format for VTT."""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    if ms >= 1000:
        ms = 999
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{ms:03d}"


def export_srt(subtitles: List[Dict[str, Any]]) -> str:
    """Converts subtitles dictionary list to SRT format string."""
    lines = []
    for sub in subtitles:
        lines.append(str(sub["id"]))
        start_t = format_timestamp_srt(sub["start"])
        end_t = format_timestamp_srt(sub["end"])
        lines.append(f"{start_t} --> {end_t}")
        lines.append(sub["text"])
        lines.append("")
    return "\n".join(lines)


def export_vtt(subtitles: List[Dict[str, Any]]) -> str:
    """Converts subtitles dictionary list to WebVTT format string."""
    lines = ["WEBVTT", ""]
    for sub in subtitles:
        lines.append(str(sub["id"]))
        start_t = format_timestamp_vtt(sub["start"])
        end_t = format_timestamp_vtt(sub["end"])
        lines.append(f"{start_t} --> {end_t}")
        lines.append(sub["text"])
        lines.append("")
    return "\n".join(lines)


def calculate_statistics(subtitles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate timeline-based subtitle metrics."""
    if not subtitles:
        return {
            "total_subtitles": 0,
            "average_duration": 0.0,
            "total_words": 0,
            "characters_per_second": 0.0
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
        "characters_per_second": cps
    }
