import base64
import gc
import logging
import re
import subprocess
import unicodedata
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


def _decode_to_pcm(
    raw_audio: bytes,
    sampling_rate: int = 16000,
    content_type: str | None = None,
    filename: str | None = None,
) -> np.ndarray:
    """تحويل الصوت الخام إلى PCM mono float32 باستخدام ffmpeg."""

    def _run_ffmpeg(input_format: str | None = None) -> subprocess.CompletedProcess:
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error"]
        if input_format:
            cmd += ["-f", input_format]
        cmd += ["-i", "pipe:0", "-ar", str(sampling_rate), "-ac", "1", "-f", "s16le", "-"]
        return subprocess.run(
            cmd,
            input=raw_audio,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )

    if not raw_audio:
        raise VoiceProcessingError("Audio payload is empty.")

    try:
        proc = _run_ffmpeg()
    except FileNotFoundError:
        raise VoiceProcessingError("ffmpeg is not installed or not in PATH.") from None
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode("utf-8", errors="ignore")[:300]
        logger.error("ffmpeg failed: %s", stderr)

        # جرّب تنسيقات بديلة بناءً على نوع الملف/الامتداد (مفيد لموبايل)
        guessed: list[str] = []
        ct = (content_type or "").lower().strip()
        name = (filename or "").lower().strip()

        if ct in ("audio/mp4", "video/mp4", "audio/m4a", "audio/x-m4a"):
            guessed.append("mp4")
        if ct in ("audio/webm", "video/webm"):
            guessed.append("webm")
        if ct in ("audio/ogg", "audio/opus"):
            guessed.append("ogg")
        if ct in ("audio/wav", "audio/x-wav"):
            guessed.append("wav")
        if ct in ("audio/mpeg", "audio/mp3"):
            guessed.append("mp3")
        if ct in ("audio/aac",):
            guessed.append("aac")

        if name.endswith(".m4a") or name.endswith(".mp4"):
            guessed.append("mp4")
        if name.endswith(".webm"):
            guessed.append("webm")
        if name.endswith(".ogg") or name.endswith(".opus"):
            guessed.append("ogg")
        if name.endswith(".wav"):
            guessed.append("wav")
        if name.endswith(".mp3"):
            guessed.append("mp3")
        if name.endswith(".aac"):
            guessed.append("aac")

        # إزالة التكرار مع الحفاظ على الترتيب
        seen = set()
        guessed = [g for g in guessed if not (g in seen or seen.add(g))]

        for fmt in guessed:
            try:
                logger.info("Retry ffmpeg decode with format=%s (ct=%s, name=%s)", fmt, content_type, filename)
                proc = _run_ffmpeg(fmt)
                break
            except subprocess.CalledProcessError as exc2:
                logger.error("ffmpeg failed (format=%s): %s", fmt, exc2.stderr.decode("utf-8", errors="ignore")[:200])
        else:
            raise VoiceProcessingError("ffmpeg failed to decode audio.") from exc

    pcm = np.frombuffer(proc.stdout, dtype=np.int16).astype(np.float32) / 32768.0
    if pcm.size == 0:
        raise VoiceProcessingError("Audio could not be decoded.")
    return pcm


def _collapse_repeated_phrases(text: str, max_span: int = 8, min_repeats: int = 2) -> str:
    """
    Collapse pathological repetitions such as "السلام عليكم السلام عليكم ..." that Whisper can emit
    when the input is short/echoey. Looks for repeated sequences up to `max_span` tokens that repeat
    at least `min_repeats` times consecutively and keeps a single occurrence.
    """
    tokens = text.split()
    result: list[str] = []
    i = 0
    n = len(tokens)

    while i < n:
        max_window = min(max_span, n - i)
        best_span = None
        best_reps = 1
        best_phrase: list[str] | None = None

        # نجرب من الأقصر للأطول لاختيار أصغر عبارة تتكرر أكثر عدد ممكن
        for span in range(1, max_window + 1):
            if span == 1 and n < 6:
                # نترك التكرارات القصيرة جداً (مثل "لا لا") في الجمل الصغيرة
                continue

            phrase = tokens[i : i + span]
            reps = 1
            j = i + span
            while j + span <= n and tokens[j : j + span] == phrase:
                reps += 1
                j += span

            if reps >= min_repeats and (reps > best_reps or (reps == best_reps and (best_span is None or span < best_span))):
                best_span = span
                best_reps = reps
                best_phrase = phrase

        if best_span and best_phrase:
            result.extend(best_phrase)
            i += best_span * best_reps
            continue

        # لا توجد تكرارات معتبرة؛ احتفظ بالكلمة الحالية
        result.append(tokens[i])
        i += 1
    return " ".join(result)


def _normalize_transcript(text: str) -> str:
    # إزالة محارف التحكم والمسافات الصفرية التي قد يضيفها الـ STT أو المايك
    stripped = re.sub(r"[\u200b-\u200f\u2028-\u202f\u2060-\u206f]+", "", text or "")
    stripped = unicodedata.normalize("NFKC", stripped)

    # تنظيف علامات الترقيم المكررة في النهاية وتوحيد المسافات
    cleaned = re.sub(r"[?.؟!…]+$", "", stripped.strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.strip()

    collapsed = _collapse_repeated_phrases(cleaned)
    words = collapsed.split()

    # لو كان النص كله عبارة عن تكرار لنفس الشريحة (n-gram) كرر نفسه بشكل كامل، نُبقي نسخة واحدة
    if len(words) >= 4:
        for span in range(1, (len(words) // 2) + 1):
            if len(words) % span != 0:
                continue
            window = words[:span]
            if window * (len(words) // span) == words:
                collapsed = " ".join(window)
                words = window
                break

        # نفس الفكرة لكن بعد إزالة علامات الترقيم من آخر كل كلمة (يعالج التكرارات مع/بدون فاصلة)
        tokens_cmp = [re.sub(r"[،,.؟?!]+$", "", w) for w in words]
        for span in range(1, (len(tokens_cmp) // 2) + 1):
            if len(tokens_cmp) % span != 0:
                continue
            window_cmp = tokens_cmp[:span]
            if window_cmp * (len(tokens_cmp) // span) == tokens_cmp:
                cleaned_window = [re.sub(r"[،,.؟?!]+$", "", w) for w in words[:span]]
                collapsed = " ".join(cleaned_window)
                words = cleaned_window
                break

    # Hard cap to avoid runaway repetitions from STT.
    MAX_WORDS = 120
    if len(words) > MAX_WORDS:
        logger.warning("Transcript trimmed to %s words (from %s)", MAX_WORDS, len(words))
        collapsed = " ".join(words[:MAX_WORDS])

    # لو بقيت نسبة التكرار عالية (مثلاً 80% من الكلمات مكررة)، نحاول أخذ أول جملة فقط
    if len(words) > 8:
        uniq = set(words)
        if len(uniq) <= max(2, len(words) // 4):
            # احتفظ بالجزء الأول فقط (حتى 20 كلمة) لتجنب التكرار اللانهائي
            keep = min(20, max(4, len(words) // 2))
            collapsed = " ".join(words[:keep])

    return collapsed.strip()


def _transcribe_with_whisper(raw_audio: bytes, content_type: str | None = None, filename: str | None = None) -> str:
    pcm = _decode_to_pcm(raw_audio, sampling_rate=16000, content_type=content_type, filename=filename)
    model = _get_whisper_model()

    def _run_transcribe(vad_enabled: bool):
        segments, _ = model.transcribe(
            pcm,
            language="ar",
            beam_size=1,
            best_of=1,
            temperature=0.0,
            without_timestamps=True,
            vad_filter=vad_enabled,
            vad_parameters={"min_silence_duration_ms": 250},
            condition_on_previous_text=False,
        )
        texts = [seg.text.strip() for seg in segments if seg.text]
        return _normalize_transcript(" ".join(texts))

    # تجربة أولى مع VAD، ولو أعطت نصاً فارغاً نجرب بدون VAD كحل أخير
    text = _run_transcribe(True)
    if not text:
        logger.info("Whisper VAD produced empty transcript, retrying without VAD.")
        text = _run_transcribe(False)

    if not text:
        raise VoiceProcessingError("Empty transcript.")
    return text


def transcribe_audio(upload) -> str:
    """Offline STT using faster-whisper (Whisper)."""
    _validate_audio(upload)
    raw = upload.read()
    content_type = getattr(upload, "content_type", None)
    filename = getattr(upload, "name", None)
    return _transcribe_with_whisper(raw, content_type=content_type, filename=filename)


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
            "بطاطس": "بطاطس",
            "بطمس": "بطاطس",
            "بطامس": "بطاطس",
            "كوكاكولا": "Coca-Cola", 
            "بيبسي": "Pepsi",
            "صندوش وعفل": "ساندوتش فلافل",   
            "صاندويش ": "ساندويتش ",
            "صندويتش ": "ساندويتش ",
            "عفل": "فلافل",
            "سندوق شلافل": "ساندويتش فلافل",
            "شلافل": "فلافل",
            "صاندوش": "ساندويتش",
            "صندوتش": "ساندويتش",
            "دبل": "double",
            "زبادة": "زيادة",

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



