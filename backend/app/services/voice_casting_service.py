"""
Voice Casting Engine — assign localized Edge TTS voices to detected speakers.

Maps speaker attributes (gender, age) to the best-fit TTS voice for a given
target language. Supports user overrides and stores the full assignment plan
that the dubbing pipeline consumes.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional

from .tts_provider import EdgeTTSProvider

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# In-memory store for casting plans
# ---------------------------------------------------------------------------

casting_plans: Dict[str, Dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Voice helpers
# ---------------------------------------------------------------------------

def get_voice_options(language: str) -> List[Dict[str, str]]:
    """
    Return all available Edge TTS voice options for a language.
    Each item: ``{"name": "en-US-GuyNeural", "label": "Guy (Male)", "gender": "male"}``
    """
    catalog = EdgeTTSProvider.VOICE_CATALOG
    lang_voices = catalog.get(language, {})
    options: List[Dict[str, str]] = []
    for gender, voices in lang_voices.items():
        for v in voices:
            options.append({
                "name": v["name"],
                "label": v["label"],
                "gender": gender,
            })
    return options


def _pick_best_voice(language: str, gender: str, age_group: str) -> Optional[str]:
    """
    Pick the best voice for a speaker profile.
    Prefers matching gender, falls back to any available voice.
    """
    catalog = EdgeTTSProvider.VOICE_CATALOG
    lang_voices = catalog.get(language, {})

    # Try matching gender
    gender_voices = lang_voices.get(gender, [])
    if gender_voices:
        # For child, prefer first voice (generally higher-pitched)
        if age_group == "child" and len(gender_voices) > 1:
            return gender_voices[0]["name"]
        return gender_voices[0]["name"]

    # Fallback to any gender
    for g, voices in lang_voices.items():
        if voices:
            return voices[0]["name"]

    # Fallback to default voice map
    provider = EdgeTTSProvider()
    return provider._voice_map.get(language)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_casting_plan(
    speakers: List[Dict[str, Any]],
    target_language: str,
) -> str:
    """
    Create a voice casting plan for detected speakers.

    Args:
        speakers: List from ``speaker_service.analyze_speakers()``.
        target_language: Target dubbing language (e.g. "Hindi").

    Returns:
        ``plan_id`` (UUID string) that can be used to reference the plan.
    """
    plan_id = str(uuid.uuid4())

    assignments = []
    for sp in speakers:
        best_voice = _pick_best_voice(target_language, sp.get("gender", "unknown"), sp.get("age_group", "adult"))
        assignments.append({
            "speaker_id": sp["speaker_id"],
            "gender": sp.get("gender", "unknown"),
            "age_group": sp.get("age_group", "adult"),
            "subtitle_count": sp.get("subtitle_count", 0),
            "voice": best_voice,
            "overridden": False,
        })

    casting_plans[plan_id] = {
        "plan_id": plan_id,
        "target_language": target_language,
        "speakers": assignments,
        "voice_options": {sp["speaker_id"]: get_voice_options(target_language) for sp in speakers},
    }

    logger.info("Created casting plan %s for %s (%d speakers)", plan_id, target_language, len(assignments))
    return plan_id


def get_casting_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a casting plan by ID."""
    return casting_plans.get(plan_id)


def update_voice_assignment(plan_id: str, speaker_id: int, voice_name: str) -> bool:
    """
    Override the voice for a specific speaker in a casting plan.
    Returns True if successful.
    """
    plan = casting_plans.get(plan_id)
    if not plan:
        return False

    for sp in plan["speakers"]:
        if sp["speaker_id"] == speaker_id:
            sp["voice"] = voice_name
            sp["overridden"] = True
            logger.info("Overrode speaker %d voice to %s in plan %s", speaker_id, voice_name, plan_id)
            return True

    return False


def build_voice_map(plan_id: str, subtitles: List[Dict]) -> Dict[int, str]:
    """
    Build a ``{subtitle_index: voice_name}`` map from a casting plan.
    Used by the dubbing pipeline to pick the right voice per clip.
    """
    from .speaker_service import assign_subtitle_speakers

    plan = casting_plans.get(plan_id)
    if not plan:
        return {}

    tagged = assign_subtitle_speakers(subtitles, plan["speakers"])
    speaker_voices = {s["speaker_id"]: s["voice"] for s in plan["speakers"]}

    voice_map: Dict[int, str] = {}
    for idx, sub in enumerate(tagged):
        sid = sub.get("speaker_id", 0)
        voice = speaker_voices.get(sid)
        if voice:
            voice_map[idx] = voice

    return voice_map
