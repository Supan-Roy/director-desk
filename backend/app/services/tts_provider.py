"""
TTS Provider Interface — abstract base + MeloTTS implementation.

Defines a generic SpeechProvider that the dubbing pipeline uses.
Swap implementations (XTTS-v2, Fish Speech, etc.) without touching
the orchestrator — just register a new provider class.
"""

from __future__ import annotations

import os
import logging
import subprocess
import threading
from abc import ABC, abstractmethod
from typing import ClassVar, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Language code maps (UI name → provider-specific codes)
# ---------------------------------------------------------------------------

# NLLB-200 FLORES-200 language codes
NLLB_LANG_MAP: Dict[str, str] = {
    "English": "eng_Latn",
    "Spanish": "spa_Latn",
    "French": "fra_Latn",
    "Japanese": "jpn_Jpan",
    "Korean": "kor_Hang",
    "Chinese": "zho_Hans",
    "Hindi": "hin_Deva",
    "Bengali": "ben_Beng",
    "Arabic": "ara_Arab",
    "Portuguese": "por_Latn",
    "Russian": "rus_Cyrl",
    "German": "deu_Latn",
    "Italian": "ita_Latn",
    "Dutch": "nld_Latn",
    "Turkish": "tur_Latn",
    "Thai": "tha_Thai",
    "Vietnamese": "vie_Latn",
    "Indonesian": "ind_Latn",
    "Malay": "msa_Latn",
    "Tamil": "tam_Taml",
}

SUPPORTED_LANGUAGES: List[str] = list(NLLB_LANG_MAP.keys())


# ---------------------------------------------------------------------------
# Speech Provider Interface
# ---------------------------------------------------------------------------

class SpeechProvider(ABC):
    """Abstract interface for text-to-speech synthesis."""

    @abstractmethod
    def generate_speech(self, text: str, language: str, output_path: str, voice: Optional[str] = None) -> str:
        """
        Synthesize speech for *text* in *language*, write a WAV file to
        *output_path*, and return the path.

        If *voice* is provided, use that specific voice instead of the default.

        Raises ``RuntimeError`` on failure.
        """
        ...

    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name, e.g. ``"MeloTTS"``."""
        ...

    @abstractmethod
    def supports_language(self, language: str) -> bool:
        ...


# ---------------------------------------------------------------------------
# Fallback: EdgeTTS Provider (pure-python, neural voices, zero-dep)
# ---------------------------------------------------------------------------

class EdgeTTSProvider(SpeechProvider):
    """
    Online neural voice generator using Microsoft Edge TTS.
    Does not require local machine learning libraries or weights.
    Installs successfully on any Python version (including 3.14).
    """

    # Default per-language voice (backwards-compatible)
    _voice_map: Dict[str, str] = {
        "English": "en-US-AnaNeural",
        "Spanish": "es-ES-AlvaroNeural",
        "French": "fr-FR-DeniseNeural",
        "Japanese": "ja-JP-NanamiNeural",
        "Korean": "ko-KR-SunHiNeural",
        "Chinese": "zh-CN-XiaoxiaoNeural",
        "Hindi": "hi-IN-MadhurNeural",
        "Bengali": "bn-IN-TanishaaNeural",
        "Arabic": "ar-SA-ZariyahNeural",
        "Portuguese": "pt-BR-FranciscaNeural",
        "Russian": "ru-RU-SvetlanaNeural",
        "German": "de-DE-KatjaNeural",
        "Italian": "it-IT-ElsaNeural",
        "Dutch": "nl-NL-FennaNeural",
        "Turkish": "tr-TR-EmelNeural",
        "Thai": "th-TH-PremwadeeNeural",
        "Vietnamese": "vi-VN-HoaiMyNeural",
        "Indonesian": "id-ID-GadisNeural",
        "Malay": "ms-MY-YasminNeural",
        "Tamil": "ta-IN-PallaviNeural",
    }

    # Gender-diverse voice catalog for speaker-aware casting
    VOICE_CATALOG: ClassVar[Dict[str, Dict[str, List[Dict[str, str]]]]] = {
        "English": {
            "male": [{"name": "en-US-GuyNeural", "label": "Guy (Male)"}, {"name": "en-US-EricNeural", "label": "Eric (Male)"}],
            "female": [{"name": "en-US-AnaNeural", "label": "Ana (Female)"}, {"name": "en-US-JennyNeural", "label": "Jenny (Female)"}],
        },
        "Spanish": {
            "male": [{"name": "es-ES-AlvaroNeural", "label": "Álvaro (Male)"}],
            "female": [{"name": "es-ES-ElviraNeural", "label": "Elvira (Female)"}],
        },
        "French": {
            "male": [{"name": "fr-FR-HenriNeural", "label": "Henri (Male)"}],
            "female": [{"name": "fr-FR-DeniseNeural", "label": "Denise (Female)"}],
        },
        "Japanese": {
            "male": [{"name": "ja-JP-KeitaNeural", "label": "Keita (Male)"}],
            "female": [{"name": "ja-JP-NanamiNeural", "label": "Nanami (Female)"}],
        },
        "Korean": {
            "male": [{"name": "ko-KR-InJoonNeural", "label": "InJoon (Male)"}],
            "female": [{"name": "ko-KR-SunHiNeural", "label": "SunHi (Female)"}],
        },
        "Chinese": {
            "male": [{"name": "zh-CN-YunxiNeural", "label": "Yunxi (Male)"}, {"name": "zh-CN-YunyangNeural", "label": "Yunyang (Male)"}],
            "female": [{"name": "zh-CN-XiaoxiaoNeural", "label": "Xiaoxiao (Female)"}],
        },
        "Hindi": {
            "male": [{"name": "hi-IN-MadhurNeural", "label": "Madhur (Male)"}],
            "female": [{"name": "hi-IN-SwaraNeural", "label": "Swara (Female)"}],
        },
        "Bengali": {
            "male": [{"name": "bn-IN-BashkarNeural", "label": "Bashkar (Male)"}],
            "female": [{"name": "bn-IN-TanishaaNeural", "label": "Tanishaa (Female)"}],
        },
        "Arabic": {
            "male": [{"name": "ar-SA-HamedNeural", "label": "Hamed (Male)"}],
            "female": [{"name": "ar-SA-ZariyahNeural", "label": "Zariyah (Female)"}],
        },
        "Portuguese": {
            "male": [{"name": "pt-BR-AntonioNeural", "label": "Antônio (Male)"}],
            "female": [{"name": "pt-BR-FranciscaNeural", "label": "Francisca (Female)"}],
        },
        "Russian": {
            "male": [{"name": "ru-RU-DmitryNeural", "label": "Dmitry (Male)"}],
            "female": [{"name": "ru-RU-SvetlanaNeural", "label": "Svetlana (Female)"}],
        },
        "German": {
            "male": [{"name": "de-DE-ConradNeural", "label": "Conrad (Male)"}],
            "female": [{"name": "de-DE-KatjaNeural", "label": "Katja (Female)"}],
        },
        "Italian": {
            "male": [{"name": "it-IT-DiegoNeural", "label": "Diego (Male)"}, {"name": "it-IT-GiuseppeNeural", "label": "Giuseppe (Male)"}],
            "female": [{"name": "it-IT-ElsaNeural", "label": "Elsa (Female)"}],
        },
        "Dutch": {
            "male": [{"name": "nl-NL-MaartenNeural", "label": "Maarten (Male)"}],
            "female": [{"name": "nl-NL-FennaNeural", "label": "Fenna (Female)"}],
        },
        "Turkish": {
            "male": [{"name": "tr-TR-AhmetNeural", "label": "Ahmet (Male)"}],
            "female": [{"name": "tr-TR-EmelNeural", "label": "Emel (Female)"}],
        },
        "Thai": {
            "male": [{"name": "th-TH-NiwatNeural", "label": "Niwat (Male)"}],
            "female": [{"name": "th-TH-PremwadeeNeural", "label": "Premwadee (Female)"}],
        },
        "Vietnamese": {
            "male": [{"name": "vi-VN-NamMinhNeural", "label": "NamMinh (Male)"}],
            "female": [{"name": "vi-VN-HoaiMyNeural", "label": "HoaiMy (Female)"}],
        },
        "Indonesian": {
            "male": [{"name": "id-ID-ArdiNeural", "label": "Ardi (Male)"}],
            "female": [{"name": "id-ID-GadisNeural", "label": "Gadis (Female)"}],
        },
        "Malay": {
            "male": [{"name": "ms-MY-OsmanNeural", "label": "Osman (Male)"}],
            "female": [{"name": "ms-MY-YasminNeural", "label": "Yasmin (Female)"}],
        },
        "Tamil": {
            "male": [{"name": "ta-IN-ValluvanNeural", "label": "Valluvan (Male)"}],
            "female": [{"name": "ta-IN-PallaviNeural", "label": "Pallavi (Female)"}],
        },
    }

    def generate_speech(self, text: str, language: str, output_path: str, voice: Optional[str] = None) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        voice = voice or self._voice_map.get(language, "en-US-AnaNeural")

        try:
            import asyncio
            import edge_tts

            async def _save():
                communicate = edge_tts.Communicate(text, voice)
                await communicate.save(output_path)

            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                from concurrent.futures import ThreadPoolExecutor
                with ThreadPoolExecutor() as executor:
                    executor.submit(asyncio.run, _save()).result()
            else:
                asyncio.run(_save())

        except Exception as exc:
            raise RuntimeError(f"EdgeTTS synthesis failed: {exc}") from exc

        if not os.path.exists(output_path):
            raise RuntimeError(f"EdgeTTS did not produce output at {output_path}")

        # Normalize to consistent PCM WAV so FFmpeg concat works reliably
        normalized = output_path.replace(".wav", "_norm.wav")
        try:
            subprocess.run([
                "ffmpeg", "-y",
                "-i", output_path,
                "-ar", "22050",
                "-ac", "1",
                "-c:a", "pcm_s16le",
                normalized,
            ], check=True, capture_output=True, text=True)
            os.replace(normalized, output_path)
        except subprocess.CalledProcessError as exc:
            if os.path.exists(normalized):
                os.remove(normalized)
            raise RuntimeError(f"Failed to normalize TTS output: {exc.stderr}") from exc

        return output_path

    def provider_name(self) -> str:
        return "EdgeTTS"

    def supports_language(self, language: str) -> bool:
        return language in self._voice_map


# ---------------------------------------------------------------------------
# Fallback: espeak-ng-based provider (ultra-lightweight, no ML deps)
# ---------------------------------------------------------------------------

class EspeakProvider(SpeechProvider):
    """
    Lightweight fallback using ``espeak-ng`` (system binary).

    Useful for testing the dubbing pipeline without installing MeloTTS.
    Audio quality is robotic but the pipeline stays functional.
    """

    _espeak_lang_map: ClassVar[Dict[str, str]] = {
        "English": "en-us",
        "Spanish": "es",
        "French": "fr",
        "Japanese": "ja",
        "Korean": "ko",
        "Chinese": "cmn",
        "Hindi": "hi",
        "Bengali": "bn",
        "Arabic": "ar",
        "Portuguese": "pt",
        "Russian": "ru",
        "German": "de",
        "Italian": "it",
        "Dutch": "nl",
        "Turkish": "tr",
        "Thai": "th",
        "Vietnamese": "vi",
        "Indonesian": "id",
        "Malay": "ms",
        "Tamil": "ta",
    }

    def generate_speech(self, text: str, language: str, output_path: str, voice: Optional[str] = None) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        lang_code = self._espeak_lang_map.get(language, "en-us")
        cmd = [
            "espeak-ng", "-v", lang_code, "-w", output_path, text,
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
        except FileNotFoundError:
            raise RuntimeError(
                "espeak-ng not found. Install it with: sudo apt install espeak-ng  "
                "or switch to a different TTS provider."
            ) from None
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(f"espeak-ng failed: {exc.stderr}") from exc

        if not os.path.exists(output_path):
            raise RuntimeError(f"espeak-ng did not produce output at {output_path}")
        return output_path

    def provider_name(self) -> str:
        return "espeak-ng (fallback)"

    def supports_language(self, language: str) -> bool:
        return language in self._espeak_lang_map


# ---------------------------------------------------------------------------
# Provider registry / factory
# ---------------------------------------------------------------------------

def get_default_provider() -> SpeechProvider:
    """
    Return the best available TTS provider.

    Precedence:
    1. EdgeTTS  (if ``edge_tts`` package is installed)
    2. espeak-ng  (if binary available)
    3. Raise ``RuntimeError``
    """
    try:
        import edge_tts  # noqa: F401
        return EdgeTTSProvider()
    except ImportError:
        pass

    # Check for espeak-ng
    try:
        subprocess.run(["espeak-ng", "--version"], capture_output=True, check=False)
        return EspeakProvider()
    except FileNotFoundError:
        pass

    raise RuntimeError(
        "No speech provider available. Install EdgeTTS (pip install edge-tts) or espeak-ng (apt install espeak-ng)."
    )
