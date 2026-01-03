import base64
import gc
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


# ===================== ضبط وتحميل الموديل =====================

_whisper_model: WhisperModel | None = None
_loaded_model_name: str | None = None


def _read_available_mem_mb() -> int:
    """
    قراءة الذاكرة المتاحة من /proc/meminfo (MemAvailable) بالميغابايت.
    """
    try:
        with open("/proc/meminfo", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("MemAvailable:"):
                    kb = int(line.split()[1])
                    return kb // 1024
    except Exception:
        pass
    return 10_000  # fallback كبير إذا لم نستطع القراءة


def _pick_model_name() -> str:
    primary = (getattr(settings, "WHISPER_MODEL_NAME", None) or "medium").strip()
    fallback = (getattr(settings, "WHISPER_FALLBACK_MODEL", None) or "small").strip()

    min_mb = getattr(settings, "WHISPER_MIN_AVAILABLE_MB", None)
    try:
        min_mb = int(min_mb) if min_mb is not None else 650
    except Exception:
        min_mb = 650

    avail = _read_available_mem_mb()
    if avail < min_mb:
        logger.warning(
            "Low memory detected (MemAvailable=%sMB < %sMB). Using fallback model: %s",
            avail,
            min_mb,
            fallback,
        )
        return fallback
    return primary


def _load_model(model_name: str) -> WhisperModel:
    compute_type = (getattr(settings, "WHISPER_COMPUTE_TYPE", None) or "int8").strip()
    download_root = (getattr(settings, "WHISPER_MODEL_DIR", "") or "").strip() or None
    cpu_threads = getattr(settings, "WHISPER_CPU_THREADS", None)
    num_workers = getattr(settings, "WHISPER_NUM_WORKERS", None)

    kwargs = {
        "device": "cpu",
        "compute_type": compute_type,
        "download_root": download_root,
    }
    if cpu_threads:
        kwargs["cpu_threads"] = int(cpu_threads)
    if num_workers:
        kwargs["num_workers"] = int(num_workers)

    try:
        return WhisperModel(model_name, **kwargs)
    except ValueError as exc:
        # fallback للـ compute_type إذا غير مدعوم
        logger.warning("compute_type '%s' unsupported, fallback to 'int8'. Error: %s", compute_type, exc)
        kwargs["compute_type"] = "int8"
        return WhisperModel(model_name, **kwargs)


def _get_whisper_model() -> WhisperModel:
    global _whisper_model, _loaded_model_name

    chosen = _pick_model_name()

    # لو نفس الموديل محمّل مسبقًا
    if _whisper_model is not None and _loaded_model_name == chosen:
        return _whisper_model

    # لو موديل مختلف محمّل ونحتاج تغييره
    if _whisper_model is not None and _loaded_model_name != chosen:
        logger.info("Switching Whisper model from %s -> %s", _loaded_model_name, chosen)
        _whisper_model = None
        _loaded_model_name = None
        gc.collect()

    try:
        _whisper_model = _load_model(chosen)
        _loaded_model_name = chosen
        logger.info("Whisper model loaded: %s", chosen)
        return _whisper_model
    except Exception as exc:
        logger.exception("Failed to load primary model: %s", chosen)

        fallback = (getattr(settings, "WHISPER_FALLBACK_MODEL", None) or "small").strip()
        if fallback and fallback != chosen:
            try:
                _whisper_model = _load_model(fallback)
                _loaded_model_name = fallback
                logger.warning("Loaded fallback model after failure: %s", fallback)
                return _whisper_model
            except Exception:
                logger.exception("Failed to load fallback model: %s", fallback)

        raise VoiceProcessingError("Failed to load Whisper model.") from exc


# ===================== أدوات الصوت =====================

def _validate_audio(upload) -> None:
    max_mb = getattr(settings, "VOICE_MAX_FILE_MB", None)
    if max_mb:
        max_bytes = max_mb * 1024 * 1024
        size = getattr(upload, "size", None)
        if size and size > max_bytes:
            raise VoiceProcessingError(f"Audio file exceeds {max_mb} MB limit.")


def _decode_to_pcm(raw_audio: bytes, sampling_rate: int = 16000) -> np.ndarray:
    """تحويل الصوت الخام إلى PCM mono float32 باستخدام ffmpeg."""
    try:
        proc = subprocess.run(
            ["ffmpeg", "-i", "pipe:0", "-ar", str(sampling_rate), "-ac", "1", "-f", "s16le", "-"],
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
    cleaned = re.sub(r"[؟?!.]+$", "", text.strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _transcribe_with_whisper(raw_audio: bytes) -> str:
    pcm = _decode_to_pcm(raw_audio, sampling_rate=16000)
    model = _get_whisper_model()

    # إعدادات سريعة: beam_size=1, best_of=1, temperature=0, مع VAD
    segments, _ = model.transcribe(
        pcm,
        language="ar",
        beam_size=1,
        best_of=1,
        temperature=0.0,
        without_timestamps=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 250},
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
    """تحويل النص إلى كلام عبر ElevenLabs."""
    api_key = getattr(settings, "ELEVENLABS_API_KEY", "") or ""
    voice_id = getattr(settings, "ELEVENLABS_VOICE_ID", "") or ""
    if not api_key or not voice_id:
        raise VoiceProcessingError("ElevenLabs TTS is not configured.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

    def normalize_arabic_tts(raw: str) -> str:
        # إزالة تنسيقات ماركداون والأرقام بالشكل غير الضروري
        txt = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", raw)
        txt = txt.replace("SAR", "ريال").replace("ر.س", "ريال")
        txt = re.sub(r"(\d+)\.00", r"\1", txt)
        txt = txt.replace("،", "، ").replace(".", ". ").replace("؟", "؟ ")

        # بعض التعريب للأسماء الشائعة
        translit_map = {
            "برجر": "burger",
            "بورجر": "burger",
            "ساندويتش برجر": "burger sandwich",
            "شيبس": "fries",
            "بطاطس": "fries",
        }
        for ar, en in translit_map.items():
            txt = re.sub(fr"\b{re.escape(ar)}\b", en, txt, flags=re.IGNORECASE)

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
