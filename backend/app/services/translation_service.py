"""
Translation Service — cloud-based subtitle translation using Alibaba Cloud Qwen LLM.

Translates subtitle tracks dynamically via the Qwen API. Uses 0 MB of local RAM
and 0% local CPU capacity, making it fully compatible with low-resource environments.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Dict, List

from app.services.qwen_service import qwen_service

logger = logging.getLogger(__name__)

# Supported UI languages list
SUPPORTED_LANGUAGES = [
    "English",
    "Spanish",
    "French",
    "Japanese",
    "Korean",
    "Chinese",
    "Hindi",
]


class QwenTranslator:
    """
    Translates text using Alibaba Cloud's Qwen LLM API.
    Bypasses local deep learning downloads and runs efficiently in the cloud.
    """

    @classmethod
    def translate(
        cls,
        texts: List[str],
        source_lang: str = "English",
        target_lang: str = "Spanish",
    ) -> List[str]:
        if not texts:
            return []

        if source_lang == target_lang:
            return texts

        # Construct the translation prompt requesting a clean JSON list
        prompt = (
            f"You are a professional video translator.\n"
            f"Translate the following JSON list of subtitle strings from {source_lang} to {target_lang}.\n"
            f"Preserve the exact same number of items, order, and timing context of the strings.\n\n"
            f"Requirements:\n"
            f"- Return ONLY a valid JSON list of translated strings.\n"
            f"- Do NOT add any conversational introduction, explanations, or extra text.\n"
            f"- Do NOT wrap the JSON inside markdown code blocks (e.g. do not use ```json ... ```).\n\n"
            f"Input JSON:\n"
            f"{json.dumps(texts, ensure_ascii=False)}"
        )

        try:
            response = qwen_service.generate_text(prompt)
            # Clean response text from possible markdown wraps
            clean_res = response.strip()
            if clean_res.startswith("```"):
                clean_res = re.sub(r"^```(?:json)?\n", "", clean_res)
                clean_res = re.sub(r"\n```$", "", clean_res)
                clean_res = clean_res.strip()

            translated_list = json.loads(clean_res)
            if isinstance(translated_list, list) and len(translated_list) == len(texts):
                return [str(item) for item in translated_list]
            else:
                logger.warning("Qwen returned mismatched list length. Falling back to original.")
        except Exception as exc:
            logger.error(f"Qwen translation failed: {exc}. Falling back to original.")

        return texts


# ---------------------------------------------------------------------------
# Subtitle-specific convenience
# ---------------------------------------------------------------------------

def translate_subtitles(
    subtitles: List[Dict],
    target_language: str,
    source_language: str = "English",
) -> List[Dict]:
    """
    Accept a list of subtitle dicts with ``{"id": …, "start": …, "end": …, "text": …}``
    and return a new list with the ``text`` field translated to *target_language*.

    The ID / timing fields are preserved verbatim.
    """
    texts = [sub["text"] for sub in subtitles]
    translated = QwenTranslator.translate(texts, source_language, target_language)

    translated_subs: List[Dict] = []
    for sub, new_text in zip(subtitles, translated):
        translated_subs.append({
            "id": sub["id"],
            "start": sub["start"],
            "end": sub["end"],
            "text": new_text,
        })

    return translated_subs
