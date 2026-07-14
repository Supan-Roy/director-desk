"""
Translation Service — local, offline subtitle translation using Meta NLLB-200.

Uses HuggingFace ``transformers`` to load the distilled 600M variant.
The model is cached on disk after first download (~600 MB) and reused across
all translation requests.
"""

from __future__ import annotations

import logging
import threading
from typing import ClassVar, Dict, List, Optional, Tuple

from .tts_provider import NLLB_LANG_MAP

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# NLLB-200 Wrapper
# ---------------------------------------------------------------------------

class NLLBTranslator:
    """
    Translates text using Meta's No Language Left Behind (NLLB-200) model.

    Uses the distilled 600M variant (``nllb-200-distilled-600M``) for a good
    balance of quality and resource usage.  The model is loaded lazily on the
    first call (thread-safe singleton pattern).
    """

    _lock: ClassVar[threading.Lock] = threading.Lock()
    _model = None
    _tokenizer = None

    # ------------------------------------------------------------------
    # Model loading (lazy, thread-safe)
    # ------------------------------------------------------------------

    @classmethod
    def _ensure_model(cls):
        """Load NLLB-200 model + tokenizer once (singleton)."""
        if cls._model is not None:
            return

        with cls._lock:
            if cls._model is not None:
                return

            try:
                import torch
                from transformers import (
                    AutoTokenizer,
                    AutoModelForSeq2SeqLM,
                )
            except ImportError:
                raise RuntimeError(
                    "transformers / torch are required for NLLB translation. "
                    "Run: pip install transformers torch"
                ) from None

            model_name = "facebook/nllb-200-distilled-600M"
            logger.info("Loading NLLB-200 distilled 600M model (first load downloads ~600 MB) ...")

            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info("NLLB using device: %s", device)

            cls._tokenizer = AutoTokenizer.from_pretrained(model_name)
            cls._model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(device)
            cls._device = device
            logger.info("NLLB-200 model loaded on %s.", device)

    # ------------------------------------------------------------------
    # Translation
    # ------------------------------------------------------------------

    @classmethod
    def translate(
        cls,
        texts: List[str],
        source_lang: str = "English",
        target_lang: str = "Spanish",
        batch_size: int = 8,
    ) -> List[str]:
        """
        Translate a list of subtitle text strings from *source_lang* to
        *target_lang*.

        Batches texts to improve throughput on GPU; falls back to single-item
        processing on CPU.
        """
        cls._ensure_model()

        src_code = NLLB_LANG_MAP.get(source_lang, "eng_Latn")
        tgt_code = NLLB_LANG_MAP.get(target_lang, "spa_Latn")

        if not src_code or not tgt_code:
            raise ValueError(
                f"Unsupported language pair: {source_lang} → {target_lang}. "
                f"Supported: {list(NLLB_LANG_MAP.keys())}"
            )

        cls._tokenizer.src_lang = src_code

        results: List[str] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            try:
                inputs = cls._tokenizer(
                    batch, return_tensors="pt", padding=True, truncation=True
                ).to(cls._device)

                translated = cls._model.generate(
                    **inputs,
                    forced_bos_token_id=cls._tokenizer.lang_code_to_id[tgt_code],
                    max_length=256,
                )

                decoded = cls._tokenizer.batch_decode(translated, skip_special_tokens=True)
                results.extend(decoded)
            except Exception as exc:
                logger.error("Translation batch failed at index %d: %s", i, exc)
                # Fall back: return original text for failed batch
                results.extend(batch)

        logger.info(
            "Translated %d segments from %s → %s", len(texts), source_lang, target_lang
        )
        return results


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
    translated = NLLBTranslator.translate(texts, source_language, target_language)

    translated_subs: List[Dict] = []
    for sub, new_text in zip(subtitles, translated):
        translated_subs.append({
            "id": sub["id"],
            "start": sub["start"],
            "end": sub["end"],
            "text": new_text,
        })

    return translated_subs
