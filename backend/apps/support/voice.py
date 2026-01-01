import base64
import logging
import subprocess
from typing import Tuple

import requests
from django.conf import settings
from vosk import KaldiRecognizer, Model

logger = logging.getLogger(__name__)


class VoiceProcessingError(Exception):
    pass


def _validate_audio(upload) -> None:
    max_mb = getattr(settings, "VOICE_MAX_FILE_MB", None)
    if max_mb:
        max_bytes = max_mb * 1024 * 1024
        size = getattr(upload, "size", None)
        if size and size > max_bytes:
            raise VoiceProcessingError(f"Audio file exceeds {max_mb} MB limit.")


_vosk_model = None


def _get_vosk_model():
    global _vosk_model
    if _vosk_model is None:
        model_path = getattr(settings, "VOSK_MODEL_PATH", "").strip()
        if not model_path:
            raise VoiceProcessingError("VOSK_MODEL_PATH is not configured.")
        try:
            _vosk_model = Model(model_path)
        except Exception as exc:  # pragma: no cover - Vosk init
            logger.exception("Failed to load Vosk model")
            raise VoiceProcessingError("تعذر تحميل نموذج VOSK للتعرف على الصوت.") from exc
    return _vosk_model


def _transcribe_with_vosk(raw_audio: bytes) -> str:
    """
    Decode audio (any common format) to PCM 16k mono via ffmpeg, then run Vosk.
    """
    try:
        ffmpeg = subprocess.Popen(
            [
                "ffmpeg",
                "-i",
                "pipe:0",
                "-ar",
                "16000",
                "-ac",
                "1",
                "-f",
                "s16le",
                "pipe:1",
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        raise VoiceProcessingError("ffmpeg غير مثبت على الخادم، لا يمكن تحويل الصوت.") from None
    except Exception as exc:  # pragma: no cover - subprocess
        logger.exception("ffmpeg spawn failed")
        raise VoiceProcessingError("تعذر بدء ffmpeg لتحويل الصوت.") from exc

    pcm_data, _ = ffmpeg.communicate(raw_audio, timeout=120)
    if not pcm_data:
        raise VoiceProcessingError("تعذر تحويل الملف الصوتي (خرج فارغ من ffmpeg).")

    rec = KaldiRecognizer(_get_vosk_model(), 16000)
    rec.SetWords(True)
    rec.AcceptWaveform(pcm_data)
    result = rec.Result()

    import json

    try:
        parsed = json.loads(result)
        text = (parsed.get("text") or "").strip()
        if not text:
            raise VoiceProcessingError("لم يتم التعرف على أي نص من الصوت.")
        return text
    except VoiceProcessingError:
        raise
    except Exception as exc:
        logger.exception("Vosk parse failed")
        raise VoiceProcessingError("تعذر قراءة نتيجة التعرف الصوتي.") from exc


def transcribe_audio(upload) -> str:
    """
    Offline STT using Vosk model (Arabic).
    """
    _validate_audio(upload)
    raw = upload.read()
    return _transcribe_with_vosk(raw)


def text_to_speech(text: str) -> Tuple[bytes, str]:
    """
    Send text to ElevenLabs TTS and return (audio_bytes, mime_type).
    """
    api_key = getattr(settings, "ELEVENLABS_API_KEY", "") or ""
    voice_id = getattr(settings, "ELEVENLABS_VOICE_ID", "") or ""
    if not api_key or not voice_id:
        raise VoiceProcessingError("ElevenLabs TTS is not configured.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2",
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.7},
    }
    headers = {
        "xi-api-key": api_key,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=90)
    except Exception as exc:  # pragma: no cover - network call
        logger.exception("ElevenLabs request failed")
        raise VoiceProcessingError("Voice synthesis request failed.") from exc

    if resp.status_code >= 400:
        detail = resp.text[:200]
        logger.error("ElevenLabs error %s: %s", resp.status_code, detail)
        raise VoiceProcessingError("Voice synthesis failed.")

    mime = resp.headers.get("Content-Type", "audio/mpeg")
    return resp.content, mime


def encode_audio_base64(audio_bytes: bytes) -> str:
    return base64.b64encode(audio_bytes).decode("ascii")
