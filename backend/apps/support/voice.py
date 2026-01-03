import base64
import logging
import re
import subprocess
from typing import Tuple

import numpy as np
import requests
from django.conf import settings
from faster_whisper import WhisperModel

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


_whisper_model: WhisperModel | None = None


def _get_whisper_model() -> WhisperModel:
    global _whisper_model
    if _whisper_model is None:
        # استخدم نموذج أخف افتراضيًا للسرعة (يمكن تغييره عبر البيئة)
        model_name = getattr(settings, "WHISPER_MODEL_NAME", "medium") or "medium"
        compute_type = getattr(settings, "WHISPER_COMPUTE_TYPE", "int8") or "int8"
        download_root = getattr(settings, "WHISPER_MODEL_DIR", "").strip() or None
        cpu_threads = getattr(settings, "WHISPER_CPU_THREADS", None)
        try:
            kwargs = {
                "device": "cpu",
                "compute_type": compute_type,
                "download_root": download_root,
            }
            if cpu_threads:
                kwargs["cpu_threads"] = cpu_threads
            _whisper_model = WhisperModel(model_name, **kwargs)
        except ValueError as exc:
            # Fallback إذا لم يدعم الجهاز compute_type الحالي (مثلاً int8_float16 على CPU)
            logger.warning("Whisper compute_type '%s' unsupported, falling back to 'int8': %s", compute_type, exc)
            kwargs = {
                "device": "cpu",
                "compute_type": "int8",
                "download_root": download_root,
            }
            if cpu_threads:
                kwargs["cpu_threads"] = cpu_threads
            try:
                _whisper_model = WhisperModel(model_name, **kwargs)
            except Exception as exc2:
                logger.exception("Failed to load faster-whisper model after fallback")
                raise VoiceProcessingError("Failed to load Whisper model.") from exc2
        except Exception as exc:
            logger.exception("Failed to load faster-whisper model")
            raise VoiceProcessingError("Failed to load Whisper model.") from exc
    return _whisper_model


def _decode_to_pcm(raw_audio: bytes, sampling_rate: int = 16000) -> np.ndarray:
    """Convert arbitrary input audio bytes to mono float32 PCM using ffmpeg."""
    try:
        proc = subprocess.run(
            [
                "ffmpeg",
                "-i",
                "pipe:0",
                "-ar",
                str(sampling_rate),
                "-ac",
                "1",
                "-f",
                "s16le",
                "-",
            ],
            input=raw_audio,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )
    except FileNotFoundError:
        raise VoiceProcessingError("ffmpeg is not installed or not in PATH.") from None
    except subprocess.CalledProcessError as exc:
        logger.error("ffmpeg failed: %s", exc.stderr.decode("utf-8", errors="ignore")[:300])
        raise VoiceProcessingError("ffmpeg failed to decode audio.") from exc

    pcm = np.frombuffer(proc.stdout, dtype=np.int16).astype(np.float32) / 32768.0
    if pcm.size == 0:
        raise VoiceProcessingError("Audio could not be decoded.")
    return pcm


def _normalize_transcript(text: str) -> str:
    """Remove trailing punctuation and compress spaces."""
    cleaned = re.sub(r"[؟?!.]+$", "", text.strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _transcribe_with_whisper(raw_audio: bytes) -> str:
    pcm = _decode_to_pcm(raw_audio, sampling_rate=16000)
    model = _get_whisper_model()
    segments, _ = model.transcribe(
        pcm,
        language="ar",
        beam_size=1,
        without_timestamps=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300},
    ) 
    texts = [seg.text.strip() for seg in segments if seg.text]
    text = _normalize_transcript(" ".join(texts))
    if not text:
        raise VoiceProcessingError("Empty transcript.")
    return text


def transcribe_audio(upload) -> str:
    """Offline STT using faster-whisper (Whisper)."""
    _validate_audio(upload)
    raw = upload.read()
    return _transcribe_with_whisper(raw)


def text_to_speech(text: str) -> Tuple[bytes, str]:
    """Send text to ElevenLabs TTS and return (audio_bytes, mime_type)."""
    api_key = getattr(settings, "ELEVENLABS_API_KEY", "") or ""
    voice_id = getattr(settings, "ELEVENLABS_VOICE_ID", "") or ""
    if not api_key or not voice_id:
        raise VoiceProcessingError("ElevenLabs TTS is not configured.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

    def normalize_arabic_tts(raw: str) -> str:
        """
        Clean and normalize text before TTS to improve pronunciation.
        """
        txt = raw
        txt = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", txt)  # remove markdown
        txt = txt.replace("ر.س", "ريال").replace("SAR", "ريال")
        txt = txt.replace("✅", "").replace("❌", "")
        txt = txt.replace("حالة المنتج الآن", "المنتج")
        txt = re.sub(r"(\d+)\.00", r"\1", txt)
        txt = txt.replace("،", "، ").replace(".", ". ").replace("؟", "؟ ")
        translit_map = {
            "برجر": "burger",
            "برغر": "burger",
            "بيرجر": "burger",
            "بيرغر": "burger",
            "برجر دجاج": "chicken burger",
            "برجر لحم": "beef burger",
            "برغر دجاج": "chicken burger",
            "برغر لحم": "beef burger",
        }
        for ar, en in translit_map.items():
            txt = re.sub(fr"\b{re.escape(ar)}\b", en, txt)
        return txt.strip()

    payload = {
        "text": normalize_arabic_tts(text),
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.75,
            "similarity_boost": 0.85,
            "style": 0.3,
            "use_speaker_boost": False,
        },
    }
    headers = {
        "xi-api-key": api_key,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=90)
    except Exception as exc:
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
