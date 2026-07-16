"""
Speaker Service — detect and profile speakers from audio + subtitles.

Uses a hybrid approach: timing-based speaker grouping (gap heuristics)
plus acoustic feature similarity analysis (pitch, RMS energy, ZCR)
to split/merge speaker clusters. Gender is determined by majority vote
across ALL subtitle segments per speaker cluster, not just one sample.

No external audio ML libraries required — all features computed from
raw PCM via autocorrelation and FFT.
"""

from __future__ import annotations

import json
import logging
import math
import os
import struct
import subprocess
import tempfile
import wave
from typing import Any, Dict, List, Optional, Tuple

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
# The gap between MALE_MAX and FEMALE_MIN is the "androgynous / uncertain"
# zone.  Keep it narrow so female voices in the 170-180 Hz range are still
# classified correctly.
MALE_PITCH_MAX = 160
FEMALE_PITCH_MIN = 175

# Age heuristic based on pitch range spread
CHILD_PITCH_MIN = 230

# If two adjacent segments differ by fewer Hz, they likely share a speaker
PITCH_SIMILARITY_THRESHOLD = 25.0

# Feature similarity thresholds (0-1 scale)
RMS_SIMILARITY_MIN = 0.3       # min(r1,r2)/max(r1,r2) above this → similar
ZCR_SIMILARITY_MAX_DIFF = 0.03  # max diff in zero-crossing rate

# How many segments must agree on a feature for a valid feature
MIN_PITCHABLE_SAMPLES = 200

# Segment cache to avoid re-extracting audio multiple times
_segment_cache: Dict[Tuple[str, float, float], Dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Audio utilities (pure Python, no deps)
# ---------------------------------------------------------------------------

def _read_wav_pcm(wav_path: str, max_samples: int = 96000) -> List[float]:
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

    # Safety: if the WAV is empty or corrupt, bail early
    if not raw or len(raw) < sampwidth:
        return []

    try:
        if sampwidth == 1:
            fmt = f"{len(raw)}B"
            samples = [((val / 255.0) - 128.0) / 128.0 for val in struct.unpack(fmt, raw)]
        elif sampwidth == 2:
            expected_bytes = (len(raw) // 2) * 2
            fmt = f"{expected_bytes // 2}h"
            samples = [val / 32768.0 for val in struct.unpack(fmt, raw[:expected_bytes])]
        else:
            logger.warning("Unsupported sample width %d", sampwidth)
            return []
    except Exception as exc:
        logger.warning("Failed to unpack WAV samples from %s: %s", wav_path, exc)
        return []

    # Downmix to mono if stereo
    if n_channels == 2 and len(samples) >= 2:
        samples = [(samples[i] + samples[i + 1]) / 2 for i in range(0, len(samples) - 1, 2)]

    return samples


def _estimate_pitch(samples: List[float], sample_rate: int = 22050) -> Optional[float]:
    """
    Estimate fundamental frequency using normalized autocorrelation
    with octave-error correction.

    Returns pitch in Hz, or None if unreliable.
    """
    if len(samples) < MIN_PITCHABLE_SAMPLES:
        return None

    # Remove DC offset
    mean_val = sum(samples) / len(samples)
    samples = [s - mean_val for s in samples]

    # Autocorrelation over plausible pitch range (50-500 Hz)
    min_lag = int(sample_rate / 500)  # ~44 at 22050
    max_lag = int(sample_rate / 50)   # ~441 at 22050

    if max_lag >= len(samples):
        max_lag = len(samples) // 2

    # Pre-compute energy for all lags (use running sum for efficiency)
    # First compute cumulative energy
    n_total = len(samples)

    best_lag = min_lag
    best_corr = 0.0

    for lag in range(min_lag, max_lag):
        corr = 0.0
        energy = 0.0
        n = n_total - lag
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

    # ---- Octave-error correction ----
    # Autocorrelation on pure tones often peaks at sub-harmonics (2×, 3× the
    # true period).  A high correlation at half (or one-third) the best-lag
    # means the true fundamental is at that shorter lag = higher frequency.
    # This is essential for correctly detecting female voices (~180-300 Hz)
    # which otherwise get misclassified as male (~90-150 Hz sub-harmonic).
    for candidate_lag in (best_lag // 2, max(best_lag // 3, min_lag)):
        if candidate_lag < min_lag:
            continue
        corr = 0.0
        energy = 0.0
        n = n_total - candidate_lag
        for i in range(n):
            corr += samples[i] * samples[i + candidate_lag]
            energy += samples[i] * samples[i] + samples[i + candidate_lag] * samples[i + candidate_lag]
        if energy > 0:
            corr_norm = corr / math.sqrt(energy) * 2
            # If the sub-harmonic has >90% of the best correlation, prefer it
            if corr_norm > best_corr * 0.9:
                best_corr = corr_norm
                best_lag = candidate_lag

    # Parabolic interpolation for sub-sample accuracy
    if best_lag > min_lag and best_lag < max_lag - 1:
        prev_corr = 0.0
        next_corr = 0.0
        n = n_total - best_lag
        # n-1 because prev/next access samples[i + best_lag ± 1]
        for i in range(n - 1):
            prev_corr += samples[i] * samples[i + best_lag - 1]
            next_corr += samples[i] * samples[i + best_lag + 1]

        denom = 2 * prev_corr - 4 * best_corr + 2 * next_corr
        if abs(denom) > 1e-10:
            correction = (prev_corr - next_corr) / denom
            best_lag += correction

    if best_lag <= 0:
        return None

    return sample_rate / best_lag


def _compute_zcr(samples: List[float]) -> float:
    """Zero-crossing rate (fraction of samples that cross zero)."""
    if len(samples) < 2:
        return 0.0
    crossings = sum(
        1 for i in range(1, len(samples))
        if (samples[i] >= 0) != (samples[i - 1] >= 0)
    )
    return crossings / len(samples)


def _compute_rms(samples: List[float]) -> float:
    """Root-mean-square energy."""
    if not samples:
        return 0.0
    return math.sqrt(sum(s * s for s in samples) / len(samples))


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
# Acoustic feature extraction
# ---------------------------------------------------------------------------

def _trim_silence(samples: List[float], threshold: float = 0.02) -> List[float]:
    """Trim leading and trailing silence from a PCM sample array."""
    if not samples:
        return samples
    # Find first sample above threshold
    start = 0
    for i, s in enumerate(samples):
        if abs(s) > threshold:
            start = i
            break
    else:
        return []  # All silence
    # Find last sample above threshold
    end = len(samples)
    for i in range(len(samples) - 1, -1, -1):
        if abs(samples[i]) > threshold:
            end = i + 1
            break
    return samples[start:end]


def _extract_acoustic_features(samples: List[float]) -> Dict[str, Any]:
    """
    Compute acoustic features from PCM samples.
    Returns dict with pitch_hz, rms, zcr, and has_valid_pitch flag.
    """
    features = {
        "pitch_hz": None,
        "rms": 0.0,
        "zcr": 0.0,
        "has_valid_pitch": False,
    }

    if not samples:
        return features

    try:
        # Trim silence — improves pitch accuracy by removing edge noise
        trimmed = _trim_silence(samples)

        # Only use trimmed if it still has enough samples
        if len(trimmed) >= MIN_PITCHABLE_SAMPLES:
            pitch = _estimate_pitch(trimmed)
        else:
            pitch = _estimate_pitch(samples)

        # If trimmed failed but original might work
        if pitch is None:
            pitch = _estimate_pitch(samples)

        features["pitch_hz"] = pitch
        features["has_valid_pitch"] = pitch is not None
        features["rms"] = _compute_rms(samples)
        features["zcr"] = _compute_zcr(samples)
    except Exception as exc:
        import traceback
        logger.warning("_extract_acoustic_features crashed: %s\n%s", exc, traceback.format_exc())

    return features


def _extract_segment_from_subtitle(source_path: str, subtitle: Dict) -> Dict[str, Any]:
    """
    Extract audio for one subtitle and compute acoustic features.
    Uses an in-memory cache keyed by (source_path, start, end).
    """
    start = subtitle.get("start", 0)
    end = subtitle.get("end", start + 1.0)

    cache_key = (source_path, start, end)
    cached = _segment_cache.get(cache_key)
    if cached is not None:
        return cached

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        seg_path = tmp.name

    try:
        if not _extract_audio_segment(source_path, start, end, seg_path):
            return {"pitch_hz": None, "rms": 0.0, "zcr": 0.0, "has_valid_pitch": False}

        samples = _read_wav_pcm(seg_path)
        if not samples:
            return {"pitch_hz": None, "rms": 0.0, "zcr": 0.0, "has_valid_pitch": False}

        features = _extract_acoustic_features(samples)
        _segment_cache[cache_key] = features
        return features
    except Exception as exc:
        import traceback
        logger.warning(
            "Feature extraction failed for [%.2f-%.2f]: %s\n%s",
            start, end, exc, traceback.format_exc(),
        )
        return {"pitch_hz": None, "rms": 0.0, "zcr": 0.0, "has_valid_pitch": False}
    finally:
        if os.path.exists(seg_path):
            os.remove(seg_path)


def _features_are_similar(f1: Dict, f2: Dict) -> bool:
    """
    Compare two acoustic feature vectors.
    Returns True if they likely come from the same speaker.
    Uses agreement among available features (pitch, RMS, ZCR).
    """
    agreements = 0
    comparisons = 0

    # Pitch comparison (most reliable for same-vs-different speaker)
    if f1.get("has_valid_pitch") and f2.get("has_valid_pitch"):
        comparisons += 1
        pitch_diff = abs(f1["pitch_hz"] - f2["pitch_hz"])
        if pitch_diff <= PITCH_SIMILARITY_THRESHOLD:
            agreements += 1

    # RMS energy comparison
    r1 = f1.get("rms", 0)
    r2 = f2.get("rms", 0)
    if r1 > 0.01 and r2 > 0.01:
        comparisons += 1
        rms_ratio = min(r1, r2) / max(r1, r2)
        if rms_ratio >= RMS_SIMILARITY_MIN:
            agreements += 1

    # ZCR comparison
    z1 = f1.get("zcr", 0)
    z2 = f2.get("zcr", 0)
    if z1 > 0.01 and z2 > 0.01:
        comparisons += 1
        if abs(z1 - z2) <= ZCR_SIMILARITY_MAX_DIFF:
            agreements += 1

    # If no reliable comparisons, fall back to similar (timing decides)
    if comparisons == 0:
        return True

    # Majority agreement
    return agreements >= comparisons / 2


def _get_feature_at(subtitles: List[Dict], idx: int, source_path: str) -> Dict:
    """Get acoustic features for subtitle at index *idx*."""
    return _extract_segment_from_subtitle(source_path, subtitles[idx])


# ---------------------------------------------------------------------------
# Speaker detection — hybrid timing + acoustic clustering
# ---------------------------------------------------------------------------

def _detect_speaker_clusters(
    subtitles: List[Dict],
    source_path: Optional[str] = None,
) -> Dict[int, int]:
    """
    Assign a stable speaker ID to each subtitle index.

    Uses timing heuristics (gap/overlap) **plus** acoustic feature similarity
    when timing is ambiguous.  This catches cases where:
      - Two speakers trade lines quickly (< gap threshold) → acoustic diff
        flags them as different speakers
      - One speaker pauses for a long breath → acoustic similarity keeps
        them as the same speaker

    Args:
        subtitles: List of subtitle dicts with ``start``, ``end``.
        source_path: Path to video file for acoustic analysis (optional).

    Returns:
        Dict mapping ``{subtitle_index: speaker_id}``.
    """
    if not subtitles:
        return {}

    # ---- Stage 1: Timing-based initial pass ----
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
        # Small gap → tentative: same speaker (may be refined by stage 2)
        # (keep current speaker)

        assignments[i] = current_speaker

    # ---- Stage 2: Acoustic refinement (if source_path available) ----
    if source_path and os.path.exists(source_path):
        # Pre-compute features for each segment that has speech
        segment_features: Dict[int, Optional[Dict]] = {}
        for i, sub in enumerate(subtitles):
            dur = sub.get("end", 0) - sub.get("start", 0)
            if dur >= 0.3:  # Only analyze segments that are long enough
                segment_features[i] = _get_feature_at(subtitles, i, source_path)
            else:
                segment_features[i] = None

        # Refine: split clusters where acoustic features disagree
        refined: Dict[int, int] = {0: 0}
        for i in range(1, len(subtitles)):
            prev_speaker = refined[i - 1]

            f_prev = segment_features.get(i - 1)
            f_curr = segment_features.get(i)

            if f_prev is not None and f_curr is not None:
                are_similar = _features_are_similar(f_prev, f_curr)
                timing_says_new = assignments[i] != assignments[i - 1]

                if timing_says_new and are_similar:
                    # Timing says new speaker, but audio says same → keep same
                    refined[i] = prev_speaker
                    logger.debug(
                        "Overrode timing-based split at idx %d (gap=%.2fs) — "
                        "acoustic features match (pitch %.1f→%.1f Hz)",
                        i,
                        subtitles[i]["start"] - subtitles[i - 1]["end"],
                        f_prev.get("pitch_hz", 0) or 0,
                        f_curr.get("pitch_hz", 0) or 0,
                    )
                elif not timing_says_new and not are_similar:
                    # Timing says same speaker, but audio differs → split
                    refined[i] = prev_speaker + 1
                    logger.debug(
                        "Split cluster at idx %d — acoustic features differ",
                        i,
                    )
                else:
                    refined[i] = prev_speaker if timing_says_new else prev_speaker

                    # But also handle the case where timing says same but
                    # features differ significantly → still split
                    # (already handled above)

                # Handle edge case where timing says same but features differ
            else:
                # No acoustic info — fall back to timing
                refined[i] = assignments[i]

        # Re-number speaker IDs sequentially
        unique_speakers = sorted(set(refined.values()))
        speaker_map = {old: new for new, old in enumerate(unique_speakers)}
        assignments = {k: speaker_map[v] for k, v in refined.items()}
    else:
        # No source_path — just use timing-based assignments as-is
        # (but still re-number for consistency)
        pass

    return assignments


# ---------------------------------------------------------------------------
# Gender profiling — multi-segment majority voting
# ---------------------------------------------------------------------------

def _classify_gender_from_pitch(pitch_hz: float) -> Dict[str, Any]:
    """
    Classify gender and age from a single pitch measurement.
    Returns dict with gender, age_group, confidence.
    """
    result = {
        "gender": "unknown",
        "age_group": "adult",
        "confidence": 0.0,
    }

    if pitch_hz <= MALE_PITCH_MAX:
        result["gender"] = "male"
        result["confidence"] = min(0.5 + (MALE_PITCH_MAX - pitch_hz) / 100, 0.95)
        result["age_group"] = "child" if pitch_hz >= CHILD_PITCH_MIN else "adult"
    elif pitch_hz >= FEMALE_PITCH_MIN:
        result["gender"] = "female"
        result["confidence"] = min(0.5 + (pitch_hz - FEMALE_PITCH_MIN) / 100, 0.95)
        result["age_group"] = "child" if pitch_hz >= CHILD_PITCH_MIN else "adult"
    else:
        result["gender"] = "unknown"
        result["confidence"] = 0.3
        result["age_group"] = "adult"

    return result


def _profile_speaker_gender(
    source_path: str,
    subtitle: Dict,
) -> Dict[str, Any]:
    """
    Profile a single subtitle segment for gender/age via pitch analysis.
    Deprecated — prefer the multi-segment approach in
    ``_profile_speaker_from_analysis``.
    """
    result = {
        "gender": "unknown",
        "age_group": "adult",
        "pitch_hz": None,
        "confidence": 0.0,
    }

    features = _extract_segment_from_subtitle(source_path, subtitle)
    pitch = features.get("pitch_hz")

    if pitch is None:
        return result

    result["pitch_hz"] = round(pitch, 1)
    gender_info = _classify_gender_from_pitch(pitch)
    result["gender"] = gender_info["gender"]
    result["age_group"] = gender_info["age_group"]
    result["confidence"] = round(gender_info["confidence"], 2)

    return result


def _profile_speaker_from_all_segments(
    source_path: str,
    subtitle_list: List[Dict],
) -> Dict[str, Any]:
    """
    Profile a speaker by analyzing ALL their subtitle segments and voting.

    This is far more reliable than single-segment analysis because:
      - Short/noisy segments are outvoted by clean ones
      - The median pitch across segments is robust to outliers
      - We can compute an empirical confidence from vote consistency

    Returns:
        Dict with ``gender``, ``age_group``, ``pitch_hz`` (median),
        ``confidence`` (0-1), ``num_analyzed``, ``num_valid``.
    """
    result = {
        "gender": "unknown",
        "age_group": "adult",
        "pitch_hz": None,
        "confidence": 0.0,
        "num_analyzed": 0,
        "num_valid": 0,
    }

    if not subtitle_list:
        return result

    # Collect pitch from all segments
    pitches: List[float] = []
    gender_votes = {"male": 0, "female": 0, "unknown": 0}

    for sub in subtitle_list:
        features = _extract_segment_from_subtitle(source_path, sub)
        pitch = features.get("pitch_hz")
        if pitch is not None:
            pitches.append(pitch)
            g = _classify_gender_from_pitch(pitch)
            gender_votes[g["gender"]] = gender_votes.get(g["gender"], 0) + 1

    result["num_analyzed"] = len(subtitle_list)
    result["num_valid"] = len(pitches)

    if not pitches:
        logger.warning("No valid pitch detected across %d segments", len(subtitle_list))
        return result

    # Median pitch (more robust than mean)
    sorted_pitches = sorted(pitches)
    median_pitch = sorted_pitches[len(sorted_pitches) // 2]
    result["pitch_hz"] = round(median_pitch, 1)

    # Majority vote for gender
    total_votes = sum(gender_votes.values())
    winning_gender = max(gender_votes, key=gender_votes.get)
    winning_count = gender_votes[winning_gender]

    result["gender"] = winning_gender
    result["confidence"] = round(winning_count / total_votes, 2) if total_votes > 0 else 0.0

    # Age group from median pitch
    if median_pitch >= CHILD_PITCH_MIN:
        result["age_group"] = "child"
    elif median_pitch > MALE_PITCH_MAX and median_pitch < FEMALE_PITCH_MIN:
        result["age_group"] = "adult"
    elif result["gender"] == "child":
        result["age_group"] = "child"
    else:
        result["age_group"] = "adult"

    logger.info(
        "Speaker profile: gender=%s (votes: %s), pitch=%.1f Hz (median of %d segments, %d valid), confidence=%.2f",
        result["gender"],
        dict(gender_votes),
        median_pitch,
        len(subtitle_list),
        len(pitches),
        result["confidence"],
    )

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
            "confidence": 0.85, "pitch_hz": 120.0,
            "voice": None, "subtitle_count": 12, ...}, ...]``
    """
    global _segment_cache
    _segment_cache = {}  # Fresh cache per analysis

    if not subtitles:
        return []

    # Step 1: Group subtitles by speaker using hybrid timing + acoustic clustering
    speaker_assignments = _detect_speaker_clusters(subtitles, source_path=movie_path)

    # Step 2: Group subtitles per speaker
    speaker_subtitles: Dict[int, List[Dict]] = {}
    for idx, sub in enumerate(subtitles):
        sid = speaker_assignments.get(idx, 0)
        speaker_subtitles.setdefault(sid, []).append(sub)

    # Step 3: Profile each speaker using ALL their segments (multi-segment voting)
    speakers: List[Dict[str, Any]] = []
    for sid in sorted(speaker_subtitles.keys()):
        segments = speaker_subtitles[sid]
        profile = _profile_speaker_from_all_segments(movie_path, segments)

        speaker_info = {
            "speaker_id": sid,
            "gender": profile["gender"],
            "age_group": profile["age_group"],
            "confidence": profile["confidence"],
            "pitch_hz": profile["pitch_hz"],
            "voice": None,  # To be filled by voice casting engine
            "subtitle_count": len(segments),
            "num_segments_analyzed": profile["num_analyzed"],
            "num_segments_valid": profile["num_valid"],
            "sample_subtitle": segments[0],
        }
        speakers.append(speaker_info)

    # Clear cache
    _segment_cache = {}

    logger.info(
        "Detected %d speakers from %d subtitles (acoustic refinement: %s)",
        len(speakers),
        len(subtitles),
        os.path.exists(movie_path) if movie_path else False,
    )
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


def clear_cache():
    """Clear the internal segment feature cache."""
    global _segment_cache
    _segment_cache = {}
