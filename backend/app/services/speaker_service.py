"""
Speaker Service — detect and profile speakers from audio + subtitles.

Uses timing-based speaker grouping (gap heuristics) and lightweight
pitch analysis (autocorrelation on raw PCM) to estimate gender and age.
No external audio ML libraries required.
"""

from __future__ import annotations

import logging
import math
import os
import struct
import subprocess
import tempfile
import wave
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Gap threshold in seconds — larger gaps suggest speaker change
SPEAKER_GAP_THRESHOLD = 0.5

# Overlap threshold — if subtitles overlap by more than this, they're
# definitely different speakers
OVERLAP_THRESHOLD = 0.1

# Pitch ranges (Hz) for gender classification
MALE_PITCH_MAX = 165
FEMALE_PITCH_MIN = 180

# Age heuristic based on pitch range spread
CHILD_PITCH_MIN = 230


# ---------------------------------------------------------------------------
# Pitch analysis (pure Python, no deps)
# ---------------------------------------------------------------------------

def _read_wav_pcm(wav_path: str, max_samples: int = 48000) -> List[float]:
    """
    Read raw PCM samples from a mono WAV file.
    Returns normalized floats in [-1.0, 1.0].
    """
    try:
        with wave.open(wav_path, "rb") as wf:
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            n_frames = min(wf.getnframes(), max_samples)
            raw = wf.readframes(n_frames)
    except Exception as exc:
        logger.warning("Failed to read WAV %s: %s", wav_path, exc)
        return []

    if sampwidth == 1:
        fmt = f"{len(raw)}B"
        samples = [((val / 255.0) - 128.0) / 128.0 for val in struct.unpack(fmt, raw)]
    elif sampwidth == 2:
        fmt = f"{len(raw) // 2}h"
        samples = [val / 32768.0 for val in struct.unpack(fmt, raw)]
    else:
        logger.warning("Unsupported sample width %d", sampwidth)
        return []

    # Downmix to mono if stereo
    if n_channels == 2:
        samples = [(samples[i] + samples[i + 1]) / 2 for i in range(0, len(samples) - 1, 2)]

    return samples


def _estimate_pitch(samples: List[float], sample_rate: int = 22050) -> Optional[float]:
    """
    Estimate fundamental frequency using normalized autocorrelation.
    Returns pitch in Hz, or None if unreliable.
    """
    if len(samples) < 100:
        return None

    # Remove DC offset
    mean = sum(samples) / len(samples)
    samples = [s - mean for s in samples]

    # Autocorrelation over plausible pitch range (50-500 Hz)
    min_lag = int(sample_rate / 500)  # ~44 at 22050
    max_lag = int(sample_rate / 50)   # ~441 at 22050

    if max_lag >= len(samples):
        max_lag = len(samples) // 2

    best_lag = min_lag
    best_corr = 0.0

    for lag in range(min_lag, max_lag):
        corr = 0.0
        energy = 0.0
        n = len(samples) - lag
        for i in range(n):
            corr += samples[i] * samples[i + lag]
            energy += samples[i] * samples[i] + samples[i + lag] * samples[i + lag]
        if energy > 0:
            corr_norm = corr / math.sqrt(energy) * 2
            if corr_norm > best_corr:
                best_corr = corr_norm
                best_lag = lag

    if best_corr < 0.1:
        return None

    # Parabolic interpolation for sub-sample accuracy
    if best_lag > min_lag and best_lag < max_lag - 1:
        prev_corr = 0.0
        next_corr = 0.0
        n = len(samples) - best_lag
        for i in range(n):
            prev_corr += samples[i] * samples[i + best_lag - 1]
            next_corr += samples[i] * samples[i + best_lag + 1]

        denom = 2 * prev_corr - 4 * best_corr + 2 * next_corr
        if abs(denom) > 1e-10:
            correction = (prev_corr - next_corr) / denom
            best_lag += correction

    if best_lag <= 0:
        return None

    return sample_rate / best_lag


def _extract_audio_segment(source_path: str, start: float, end: float, output_path: str) -> bool:
    """
    Extract a short audio segment from source video/audio using FFmpeg.
    Returns True on success.
    """
    duration = max(end - start, 0.5)
    cmd = [
        "ffmpeg", "-y",
        "-i", source_path,
        "-ss", str(start),
        "-t", str(duration),
        "-ar", "22050",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        output_path,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=30)
        return os.path.exists(output_path)
    except Exception as exc:
        logger.warning("Failed to extract audio segment [%.2f-%.2f]: %s", start, end, exc)
        return False


# ---------------------------------------------------------------------------
# Speaker detection
# ---------------------------------------------------------------------------

def _detect_speaker_clusters(subtitles: List[Dict]) -> Dict[int, int]:
    """
    Assign a stable speaker ID to each subtitle index using timing heuristics.

    Returns a dict: {subtitle_index: speaker_id}
    """
    if not subtitles:
        return {}

    assignments: Dict[int, int] = {}
    current_speaker = 0
    assignments[0] = current_speaker

    for i in range(1, len(subtitles)):
        prev_end = subtitles[i - 1].get("end", 0)
        curr_start = subtitles[i].get("start", 0)
        gap = curr_start - prev_end

        # Overlapping → definitely different speaker
        if gap < -OVERLAP_THRESHOLD:
            current_speaker += 1
        # Large gap → likely speaker change
        elif gap > SPEAKER_GAP_THRESHOLD:
            current_speaker += 1
        # Small gap → same speaker continues
        # (keep current speaker)

        assignments[i] = current_speaker

    return assignments


def _profile_speaker_gender(
    source_path: str,
    subtitle: Dict,
) -> Dict[str, Any]:
    """
    Extract a short audio segment for one subtitle and run pitch analysis.
    Returns dict with gender, age_group, pitch, confidence.
    """
    result = {
        "gender": "unknown",
        "age_group": "adult",
        "pitch_hz": None,
        "confidence": 0.0,
    }

    start = subtitle.get("start", 0)
    end = subtitle.get("end", start + 1.0)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        seg_path = tmp.name

    try:
        if not _extract_audio_segment(source_path, start, end, seg_path):
            return result

        samples = _read_wav_pcm(seg_path)
        pitch = _estimate_pitch(samples)

        if pitch is None:
            return result

        result["pitch_hz"] = round(pitch, 1)

        # Gender classification
        if pitch <= MALE_PITCH_MAX:
            result["gender"] = "male"
            result["confidence"] = min(0.5 + (MALE_PITCH_MAX - pitch) / 100, 0.95)
        elif pitch >= FEMALE_PITCH_MIN:
            result["gender"] = "female"
            result["confidence"] = min(0.5 + (pitch - FEMALE_PITCH_MIN) / 100, 0.95)
        else:
            result["gender"] = "unknown"
            result["confidence"] = 0.3

        # Age group estimation
        if pitch >= CHILD_PITCH_MIN:
            result["age_group"] = "child"
        elif pitch > MALE_PITCH_MAX and pitch < FEMALE_PITCH_MIN:
            result["age_group"] = "adult"
        elif result["gender"] == "child":
            result["age_group"] = "child"
        else:
            result["age_group"] = "adult"

    except Exception as exc:
        logger.warning("Pitch analysis failed for segment [%.2f-%.2f]: %s", start, end, exc)
    finally:
        if os.path.exists(seg_path):
            os.remove(seg_path)

    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_speakers(
    movie_path: str,
    subtitles: List[Dict],
) -> List[Dict[str, Any]]:
    """
    Main entry point: detect and profile all speakers in a movie.

    Args:
        movie_path: Path to the video/audio file.
        subtitles: List of subtitle dicts with ``id``, ``start``, ``end``.

    Returns:
        List of speaker profiles:
        ``[{"speaker_id": 0, "gender": "male", "age_group": "adult",
            "confidence": 0.85, "voice": None, "sample_subtitle": {...}}, ...]``
    """
    if not subtitles:
        return []

    # Step 1: Group subtitles by speaker using timing heuristics
    speaker_assignments = _detect_speaker_clusters(subtitles)

    # Step 2: Group subtitles per speaker
    speaker_subtitles: Dict[int, List[Dict]] = {}
    for idx, sub in enumerate(subtitles):
        sid = speaker_assignments.get(idx, 0)
        speaker_subtitles.setdefault(sid, []).append(sub)

    # Step 3: Profile each speaker using pitch analysis on their first segment
    speakers: List[Dict[str, Any]] = []
    for sid in sorted(speaker_subtitles.keys()):
        first_sub = speaker_subtitles[sid][0]
        profile = _profile_speaker_gender(movie_path, first_sub)

        speaker_info = {
            "speaker_id": sid,
            "gender": profile["gender"],
            "age_group": profile["age_group"],
            "confidence": round(profile["confidence"], 2),
            "pitch_hz": profile["pitch_hz"],
            "voice": None,  # To be filled by voice casting engine
            "subtitle_count": len(speaker_subtitles[sid]),
            "sample_subtitle": first_sub,
        }
        speakers.append(speaker_info)

    logger.info("Detected %d speakers from %d subtitles", len(speakers), len(subtitles))
    return speakers


def assign_subtitle_speakers(
    subtitles: List[Dict],
    speakers: List[Dict],
) -> List[Dict]:
    """
    Tag each subtitle with its speaker_id based on the detected speaker groups.
    Returns a new list of subtitle dicts with ``speaker_id`` added.
    """
    if not subtitles or not speakers:
        return [dict(s, speaker_id=0) for s in subtitles]

    speaker_assignments = _detect_speaker_clusters(subtitles)
    result = []
    for idx, sub in enumerate(subtitles):
        sub_copy = dict(sub)
        sub_copy["speaker_id"] = speaker_assignments.get(idx, 0)
        result.append(sub_copy)

    return result
