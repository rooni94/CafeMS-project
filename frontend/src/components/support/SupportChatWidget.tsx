import React, { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

type SupportMessage = {
  id: number;
  conversation: number;
  sender_type: "customer" | "staff" | "supervisor" | "manager" | "bot" | "guest";
  sender_name?: string;
  content: string;
  created_at: string;
  bot_audio_base64?: string | null;
  bot_audio_mime?: string | null;
  tts_audio_base64?: string | null;
  audio_base64?: string | null;
};

type GuestProfile = {
  name: string;
  email: string;
  conversation_id?: number;
  guest_token?: string;
};

const GUEST_STORAGE_KEY = "cafe_support_guest";

const getWsBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "/api/";
  try {
    if (typeof apiUrl === "string" && (apiUrl.startsWith("http://") || apiUrl.startsWith("https://"))) {
      const url = new URL(apiUrl);
      const wsScheme = url.protocol === "https:" ? "wss" : "ws";
      return `${wsScheme}://${url.host}`;
    }
  } catch {
    /* ignore */
  }
  const loc = window.location;
  const wsScheme = loc.protocol === "https:" ? "wss" : "ws";
  return `${wsScheme}://${loc.host}`;
};

const b64ToUrl = (b64: string, mime = "audio/mpeg") => {
  try {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
};

const SupportChatWidget: React.FC = () => {
  const { user, accessToken } = useAuth();
  const isGuest = !user;

  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [input, setInput] = useState("");

  // guest flow
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestStep, setGuestStep] = useState<"form" | "code" | "chat">("form");
  const [guestRequestId, setGuestRequestId] = useState<number | null>(null);
  const [guestCode, setGuestCode] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSubmitting, setGuestSubmitting] = useState(false);

  // voice
  const [voiceOverlay, setVoiceOverlay] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);

  // refs
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const botAudioRef = useRef<HTMLAudioElement | null>(null);

  // audio graph for VAD
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<boolean>(false);
  const sendingAudioRef = useRef<boolean>(false);

  const addMessagesUnique = (incoming: SupportMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  };

  const stopBotAudio = () => {
    if (botAudioRef.current) {
      botAudioRef.current.pause();
      botAudioRef.current.currentTime = 0;
      botAudioRef.current = null;
    }
  };

  const playBotAudio = (payload: any) => {
    const base64 = payload?.bot_audio_base64 || payload?.tts_audio_base64 || payload?.audio_base64;
    if (!base64) {
      // No audio returned (e.g., TTS failure) – re-arm recording quickly if we're in voice mode.
      if (voiceOverlay && open && !recordingRef.current && !sendingAudioRef.current) {
        setTimeout(() => {
          startRecording().catch(() => undefined);
        }, 500);
      }
      return;
    }
    const mime = payload?.bot_audio_mime || payload?.audio_mime || "audio/mpeg";
    const url = b64ToUrl(base64, mime);
    if (!url) return;
    stopBotAudio();
    const audio = new Audio(url);
    botAudioRef.current = audio;

    let hasStarted = false;
    audio.onplay = () => {
      hasStarted = true;
    };

    const maybeAutoRecord = () => {
      botAudioRef.current = null;
      if (!voiceOverlay || !open || recordingRef.current || sendingAudioRef.current) return;
      if (!hasStarted && audio.currentTime <= 0.05) {
        hasStarted = true;
      }
      startRecording().catch(() => undefined);
    };

    audio.onended = () => maybeAutoRecord();
    audio.onerror = () => maybeAutoRecord();
    audio.onpause = () => {
      if (hasStarted && audio.currentTime > 0.1) maybeAutoRecord();
    };

    audio
      .play()
      .then(() => {
        hasStarted = true;
      })
      .catch(() => {
        // If autoplay fails, still re-arm recording.
        hasStarted = true;
        maybeAutoRecord();
      });
  };

  // guest storage
  useEffect(() => {
    if (!isGuest) return;
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as GuestProfile;
        if (data.name) setGuestName(data.name);
        if (data.email) setGuestEmail(data.email);
        if (data.conversation_id && data.guest_token) {
          setConversationId(data.conversation_id);
          setGuestToken(data.guest_token);
          setGuestStep("chat");
        } else if (data.conversation_id && !data.guest_token) {
          localStorage.removeItem(GUEST_STORAGE_KEY);
        }
      }
    } catch {
      /* ignore */
    }
  }, [isGuest]);

  // init logged user
  const initForLoggedUser = async () => {
    if (!user || !accessToken) return;
    setLoading(true);
    try {
      const convRes = await api.get("support/my-conversation/");
      const convId = convRes.data.conversation.id as number;
      setConversationId(convId);
      const msgRes = await api.get<SupportMessage[]>("support/my-messages/");
      addMessagesUnique(msgRes.data || []);
      setGuestStep("chat");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // init guest with existing conversation
  const initForGuestIfHasConversation = async (convId: number, token: string) => {
    setLoading(true);
    try {
      const msgRes = await api.get<SupportMessage[]>(
        `support/guest-conversations/${convId}/messages/`,
        { headers: { "X-Guest-Token": token } },
      );
      addMessagesUnique(msgRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // guest request code
  const handleGuestRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError(null);
    if (!guestName.trim() || !guestEmail.trim()) {
      setGuestError("يرجى إدخال الاسم والبريد الإلكتروني.");
      return;
    }
    setGuestSubmitting(true);
    try {
      const res = await api.post("support/guest-request-code/", {
        name: guestName.trim(),
        email: guestEmail.trim(),
      });
      setGuestRequestId(res.data.request_id);
      setGuestStep("code");
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ name: guestName.trim(), email: guestEmail.trim() }));
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "تعذر إرسال الكود. حاول لاحقاً.";
      setGuestError(msg);
    } finally {
      setGuestSubmitting(false);
    }
  };

  // guest verify code
  const handleGuestVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError(null);
    if (!guestRequestId) {
      setGuestError("انتهت صلاحية الطلب، أعد إدخال بياناتك.");
      setGuestStep("form");
      return;
    }
    if (!guestCode.trim()) {
      setGuestError("أدخل كود التحقق.");
      return;
    }
    setGuestSubmitting(true);
    try {
      const res = await api.post("support/guest-verify-code/", {
        request_id: guestRequestId,
        code: guestCode.trim(),
      });
      const convId = res.data.conversation.id as number;
      const token = (res.data.guest_token as string | undefined) || null;
      if (!token) {
        setGuestError("تم التحقق لكن لم يصل guest_token. حدّث الباكند ثم حاول مجدداً.");
        return;
      }
      setConversationId(convId);
      setGuestToken(token);
      setGuestStep("chat");
      localStorage.setItem(
        GUEST_STORAGE_KEY,
        JSON.stringify({ name: guestName.trim(), email: guestEmail.trim(), conversation_id: convId, guest_token: token }),
      );
      await initForGuestIfHasConversation(convId, token);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "كود غير صحيح أو منتهي.";
      setGuestError(msg);
    } finally {
      setGuestSubmitting(false);
    }
  };

  // websocket
  const connectWebSocket = (convId: number) => {
    const base = getWsBaseUrl();
    const qs = accessToken
      ? `?token=${encodeURIComponent(accessToken)}`
      : guestToken
      ? `?guest=1&guest_token=${encodeURIComponent(guestToken)}`
      : "?guest=1";
    const wsUrl = `${base}/ws/support/${convId}/${qs}`;
    if (wsRef.current) wsRef.current.close();
    setConnecting(true);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => setConnecting(false);
    ws.onclose = () => setConnecting(false);
    ws.onerror = () => setConnecting(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SupportMessage;
        addMessagesUnique([data]);
        if (data.sender_type === "bot") playBotAudio(data);
      } catch (err) {
        console.error("WS parse error", err);
      }
    };
  };

  // open widget
  const handleOpen = async () => {
    setOpen(true);
    setMessages([]);
    setConversationId(null);
    if (user && accessToken) {
      setGuestStep("chat");
      await initForLoggedUser();
    } else {
      try {
        const raw = localStorage.getItem(GUEST_STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as GuestProfile;
          if (stored.conversation_id && stored.guest_token) {
            setConversationId(stored.conversation_id);
            setGuestToken(stored.guest_token);
            setGuestStep("chat");
            await initForGuestIfHasConversation(stored.conversation_id, stored.guest_token);
            return;
          }
        }
      } catch {
        /* ignore */
      }
      setGuestStep("form");
    }
  };

  const handleClose = () => {
    setOpen(false);
    stopBotAudio();
    setVoiceOverlay(false);
    stopRecording();
    wsRef.current?.close();
  };

  useEffect(() => {
    if (!open || !conversationId) return;
    connectWebSocket(conversationId);
    return () => wsRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationId, accessToken, guestToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // send text
  const sendText = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    try {
      if (!conversationId) {
        alert("ابدأ المحادثة أولاً قبل الإرسال.");
        return;
      }

      // إن كان الـ WS مفتوحاً نرسل فقط عبره ونعتمد على البث العكسي
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "message", content: text }));
        return;
      }

      if (user && accessToken) {
        const res = await api.post("support/my-messages/", { content: text });
        addMessagesUnique([res.data.customer_message, res.data.bot_reply].filter(Boolean) as SupportMessage[]);
        playBotAudio(res.data);
      } else if (isGuest && guestToken) {
        const res = await api.post(
          `support/guest-conversations/${conversationId}/messages/`,
          { content: text },
          { headers: { "X-Guest-Token": guestToken } },
        );
        addMessagesUnique([res.data.guest_message, res.data.bot_reply].filter(Boolean) as SupportMessage[]);
        playBotAudio(res.data);
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء إرسال الرسالة.");
    }
  };

  // audio graph helpers
  const clearAudioGraph = () => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTimerRef.current) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    analyserRef.current?.disconnect();
    audioCtxRef.current?.close().catch(() => undefined);
    analyserRef.current = null;
    audioCtxRef.current = null;
    dataArrayRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    recordingRef.current = false;
    clearAudioGraph();
  };

  const setupSilenceDetection = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    const check = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
      let sumSquares = 0;
      for (let i = 0; i < dataArrayRef.current.length; i += 1) {
        const v = (dataArrayRef.current[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / dataArrayRef.current.length);
      const SILENCE_RMS = 0.02;
      const SILENCE_MS = 1200;
      if (rms < SILENCE_RMS && !silenceTimerRef.current) {
        silenceTimerRef.current = window.setTimeout(() => stopRecording(), SILENCE_MS);
      } else if (rms >= SILENCE_RMS && silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  };

  // start recording (auto-stop on silence)
  const startRecording = async (force = false) => {
    setVoiceOverlay(true);
    if (!force && (sendingAudioRef.current || recordingRef.current)) return;
    if (!conversationId) {
      alert("ابدأ المحادثة قبل التسجيل الصوتي.");
      return;
    }
    stopBotAudio();
    try {
      // إذا كان هناك تسجيل سابق لم يُغلق، أغلقه وأفرغ الموارد
      stopRecording();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      streamRef.current = stream;

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        clearAudioGraph();
        setRecording(false);
        recordingRef.current = false;
        if (blob.size > 0) {
          await sendVoiceBlob(blob);
        }
        mediaRecorderRef.current = null;
      };

      recorder.start();
      setRecording(true);
      recordingRef.current = true;
      setupSilenceDetection();

      if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = window.setTimeout(() => stopRecording(), 15000);
    } catch (err) {
      console.error(err);
      setRecording(false);
      alert("تعذر بدء التسجيل. تأكد من أذونات الميكروفون.");
    }
  };

  const sendVoiceBlob = async (blob: Blob) => {
    if (!conversationId) return;
    setSendingAudio(true);
    sendingAudioRef.current = true;
    try {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      const url = isGuest ? `support/guest-conversations/${conversationId}/voice/` : "support/my-voice/";
      const headers = isGuest && guestToken ? { "X-Guest-Token": guestToken } : undefined;
      const res = await api.post(url, form, {
        headers: { ...(headers || {}), "Content-Type": "multipart/form-data" },
        timeout: 15000,
      });
      const collected: SupportMessage[] = [];
      if (res.data.customer_message) collected.push(res.data.customer_message);
      if (res.data.guest_message) collected.push(res.data.guest_message);
      if (res.data.bot_reply) collected.push(res.data.bot_reply);
      addMessagesUnique(collected);
      const audioPayload = res.data.bot_reply
        ? {
            ...res.data.bot_reply,
            bot_audio_base64: res.data.bot_audio_base64,
            bot_audio_mime: res.data.bot_audio_mime,
            tts_audio_base64: res.data.tts_audio_base64,
            audio_base64: res.data.bot_audio_base64 || res.data.tts_audio_base64,
            audio_mime: res.data.bot_audio_mime,
          }
        : res.data;
      // حاول تشغيل الصوت سواء كان مضمناً مع الرسالة أو مع الرد
      playBotAudio(audioPayload);
    } catch (err) {
      console.error(err);
      alert("تعذر إرسال التسجيل الصوتي.");
    } finally {
      setSendingAudio(false);
      sendingAudioRef.current = false;
      // Auto-rearm only if no bot audio is playing; playback handler will restart recording after it ends.
      if (voiceOverlay && open && !recordingRef.current && !sendingAudioRef.current && !botAudioRef.current) {
        setTimeout(() => {
          startRecording().catch(() => undefined);
        }, 600);
      }
    }
  };

  // overlays
  const renderVoiceOverlay = () => {
    if (!voiceOverlay) return null;
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center px-4 bg-black/50">
        <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-amber-200 bg-gradient-to-b from-white via-amber-50 to-amber-100">
          <div className="px-4 pt-4 pb-2 text-center">
            <div className="text-xs text-amber-600 font-semibold">الاستماع قيد التشغيل...</div>
            <div className="text-sm font-bold text-gray-800 mt-1">
              سجّل سؤالك وتوقف عن الكلام، سنرسل الرد صوتياً فوراً. يمكنك البدء مرة أخرى بدون إغلاق اللوحة.
            </div>
          </div>
          <div className="px-4 pb-4">
            <div className="h-16 rounded-xl bg-white/80 border border-amber-100 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-60 bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 animate-pulse" />
              <div className="relative flex items-end gap-1">
                {[6, 10, 16, 12, 18, 12, 16, 10, 6].map((h, idx) => (
                  <span
                    key={idx}
                    className="w-1 rounded-full bg-amber-500 animate-[pulse_1.2s_ease-in-out_infinite]"
                    style={{ height: `${h + (recording ? 10 : 0)}px`, animationDelay: `${idx * 0.08}s` }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 text-[12px] text-gray-700 text-center">
              {recording
                ? "التسجيل يعمل الآن وسيُرسل تلقائياً عند الصمت أو بعد 15 ثانية."
                : "جاري تهيئة الميكروفون..."}
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <button
                onClick={stopRecording}
                disabled={!recording || sendingAudio}
                className="px-3 py-2 rounded-full bg-amber-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                إيقاف وإرسال
              </button>
              <button
                onClick={() => {
                  setVoiceOverlay(false);
                  stopRecording();
                }}
                className="px-3 py-2 rounded-full border text-gray-600 text-xs font-semibold bg-white"
              >
                إغلاق
              </button>
            </div>
            {sendingAudio && <div className="text-[11px] text-gray-500 text-center mt-1">يتم إرسال الرسالة الصوتية...</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderGuestGate = () => {
    if (!isGuest || guestStep === "chat") return null;
    return (
      <div className="absolute inset-0 bg-white/95 flex items-center justify-center px-4 z-20">
        {guestStep === "form" && (
          <form onSubmit={handleGuestRequestCode} className="w-full max-w-xs space-y-3 text-right text-sm">
            <div className="font-semibold text-gray-800">تواصل معنا كضيف</div>
            <div className="text-[12px] text-gray-600">
              أدخل الاسم والبريد الإلكتروني لإرسال كود تحقق إلى بريدك. لن تتمكن من بدء المحادثة بدونه.
            </div>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="الاسم"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="example@mail.com"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
            {guestError && <div className="text-[12px] text-red-500">{guestError}</div>}
            <button
              type="submit"
              disabled={guestSubmitting}
              className="w-full py-2 rounded-full bg-amber-500 text-white text-sm disabled:opacity-60"
            >
              {guestSubmitting ? "يتم الإرسال..." : "إرسال كود التحقق"}
            </button>
          </form>
        )}
        {guestStep === "code" && (
          <form onSubmit={handleGuestVerifyCode} className="w-full max-w-xs space-y-3 text-right text-sm">
            <div className="font-semibold text-gray-800">أدخل كود التحقق</div>
            <div className="text-[12px] text-gray-600">تم إرسال كود من 6 أرقام إلى بريدك الإلكتروني.</div>
            <input
              className="w-full border rounded-lg px-3 py-2 text-center tracking-[0.3em] text-sm"
              placeholder="123456"
              maxLength={6}
              value={guestCode}
              onChange={(e) => setGuestCode(e.target.value)}
            />
            {guestError && <div className="text-[12px] text-red-500">{guestError}</div>}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setGuestStep("form");
                  setGuestCode("");
                }}
                className="px-3 py-2 rounded-full border text-xs"
              >
                رجوع
              </button>
              <button
                type="submit"
                disabled={guestSubmitting}
                className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm disabled:opacity-60"
              >
                {guestSubmitting ? "يتم التحقق..." : "تأكيد الكود"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  const widgetWidth = "min(420px, 92vw)";
  const widgetHeight = "min(70vh, 520px)";

  return (
    <div
      className="fixed bottom-3 left-3 z-40"
      style={{ fontFamily: "inherit", bottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
    >
      {!open && (
        <button
          onClick={handleOpen}
          className="w-12 h-12 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center text-xl hover:bg-amber-600"
        >
          💬
        </button>
      )}

      {open && (
        <div
          className="bg-white rounded-2xl shadow-xl border border-amber-100 flex flex-col overflow-hidden relative"
          style={{ width: widgetWidth, height: widgetHeight }}
        >
          <div className="px-3 py-2 bg-amber-500 text-white flex items-center justify-between sticky top-0 z-10">
            <span className="text-sm font-semibold">دعم CafeMS Demo</span>
            <div className="flex items-center gap-2">
              {(user || (isGuest && guestStep === "chat")) && (
                <button
                  onClick={() => {
                    wsRef.current?.close();
                    setConversationId(null);
                    setMessages([]);
                    setInput("");
                    if (isGuest) {
                      localStorage.removeItem(GUEST_STORAGE_KEY);
                      setGuestToken(null);
                      setGuestStep("form");
                    }
                  }}
                  className="text-[10px] border border-white/60 rounded-full px-2 py-0.5 hover:bg-white/10"
                >
                  إنهاء
                </button>
              )}
              <button onClick={handleClose} className="text-xs hover:text-red-100">
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 relative bg-amber-50/40 flex flex-col min-h-0">
            {(loading || connecting) && (
              <div className="text-center text-gray-500 text-xs py-3">
                {loading ? "جاري تحميل المحادثة..." : "جاري الاتصال..."}
              </div>
            )}

            {!loading && !connecting && messages.length === 0 && guestStep === "chat" && (
              <div className="text-center text-gray-500 text-xs py-3">
                اكتب رسالتك أو سجّل صوتياً للبدء.
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2 text-xs">
              {messages.map((m) => {
                const isMe = (!isGuest && m.sender_type === "customer") || (isGuest && m.sender_type === "guest");
                const isBot = m.sender_type === "bot";
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[82%] px-3 py-2 rounded-2xl shadow-sm ${
                        isMe
                          ? "bg-amber-500 text-white rounded-br-none"
                          : isBot
                          ? "bg-white border border-dashed border-amber-300 text-gray-800 rounded-bl-none"
                          : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                      }`}
                    >
                      {!isMe && (
                        <div className="text-[10px] text-gray-500 mb-0.5">{isBot ? "رد تلقائي" : m.sender_name || "الدعم"}</div>
                      )}
                      <div>{m.content}</div>
                      <div className="text-[9px] text-gray-400 mt-1 text-left">{new Date(m.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {renderVoiceOverlay()}
            {renderGuestGate()}
          </div>

          <div
            className="border-t px-2 py-2 flex items-center gap-2 sticky bottom-0 bg-white"
            style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <input
              className="flex-1 border rounded-full px-3 py-1.5 text-xs"
              placeholder="اكتب رسالتك..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
              disabled={loading || connecting || (isGuest && guestStep !== "chat")}
            />
            <button
              onClick={sendText}
              disabled={!input.trim() || loading || connecting || (isGuest && guestStep !== "chat")}
              className="px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
            >
              إرسال
            </button>
            <button
              onClick={() => startRecording()}
              disabled={recording || sendingAudio || loading || connecting || (isGuest && guestStep !== "chat")}
              className="px-3 py-1.5 rounded-full border border-amber-400 text-amber-600 text-xs disabled:opacity-60 bg-white"
            >
              🎤
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportChatWidget;
