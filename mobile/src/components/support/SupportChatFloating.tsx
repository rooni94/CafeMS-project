import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Keyboard,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { ENV } from "../../config/env";
import { Button } from "../ui";

type SupportMessage = {
  id: number;
  conversation: number;
  sender_type: "customer" | "staff" | "supervisor" | "manager" | "bot" | "guest";
  sender_name?: string;
  content: string;
  created_at: string;
  bot_audio_base64?: string | null;
  tts_audio_base64?: string | null;
  audio_base64?: string | null;
  bot_audio_mime?: string | null;
  audio_mime?: string | null;
};

type GuestProfile = {
  name: string;
  email: string;
  conversation_id?: number;
  guest_token?: string;
};

const GUEST_STORAGE_KEY = "cafe_support_guest";

const getWsBaseUrl = () => {
  const apiUrl = ENV.apiUrl || "";
  const trimmed = apiUrl.replace(/\/api\/?$/, "");
  try {
    const url = new URL(trimmed);
    const scheme = url.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${url.host}`;
  } catch {
    return "";
  }
};

const b64ToUri = async (base64?: string | null, mime = "audio/mpeg") => {
  if (!base64 || typeof base64 !== "string") return null;

  // base64 لازم يكون حجمه معقول عشان ما نحاول نشغّل نص/بيانات ناقصة
  if (base64.length < 1000) return null;

  const ext = mime.includes("wav") ? "wav" : "mp3";
  const cacheDir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? "";
  const fileUri = `${cacheDir}bot-reply-${Date.now()}.${ext}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: "base64" });
  return fileUri;
};

const SupportChatFloating: React.FC = () => {
  const { user, accessToken } = useAuth();
  const isGuest = !user;

  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [input, setInput] = useState("");

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [voiceOverlay, setVoiceOverlay] = useState(false);

  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const voiceOverlayRef = useRef<boolean>(false);
  const openRef = useRef<boolean>(false);
  const recordingFlagRef = useRef<boolean>(false);
  const sendingAudioRef = useRef<boolean>(false);
  const silenceSinceRef = useRef<number | null>(null);
  const activeRecordingRef = useRef<Audio.Recording | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // وضع المحادثة الصوتية المستمرة (push-to-talk أول مرة فقط)
  const voiceSessionRef = useRef<boolean>(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestStep, setGuestStep] = useState<"form" | "code" | "chat">("form");
  const [guestRequestId, setGuestRequestId] = useState<number | null>(null);
  const [guestCode, setGuestCode] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const wsBase = useMemo(() => getWsBaseUrl(), []);
  const styles = useMemo(() => createStyles(), []);

  useEffect(() => {
    voiceOverlayRef.current = voiceOverlay;
  }, [voiceOverlay]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const addMessagesUnique = (incoming: SupportMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  };

  const clearVoiceTimer = () => {
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
  };

  const rearmRecordingIfIdle = (delay = 500) => {
    setTimeout(() => {
      if (!voiceSessionRef.current) return;
      if (!voiceOverlayRef.current || !openRef.current) return;
      if (recordingFlagRef.current || sendingAudioRef.current || isPlayingRef.current || activeRecordingRef.current) return;
      startVoiceRecording(true).catch(() => undefined);
    }, delay);
  };

  const stopBotAudio = async () => {
    isPlayingRef.current = false;
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        /* ignore */
      }
      soundRef.current = null;
    }
  };

  const playBotAudio = async (payload: any) => {
    const base64 = payload?.bot_audio_base64 || payload?.tts_audio_base64 || payload?.audio_base64;
    const mime = payload?.bot_audio_mime || payload?.audio_mime || "audio/mpeg";

    // لو ما فيه صوت: رجّع الاستماع لو كنا في وضع المحادثة الصوتية المستمرة
    if (!base64 || typeof base64 !== "string" || base64.length < 1000) {
      if (voiceSessionRef.current && voiceOverlayRef.current && openRef.current) {
        rearmRecordingIfIdle(450);
      }
      return;
    }

    const uri = await b64ToUri(base64, mime);
    if (!uri) {
      if (voiceSessionRef.current && voiceOverlayRef.current && openRef.current) {
        rearmRecordingIfIdle(450);
      }
      return;
    }

    try {
      await stopBotAudio();

      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      isPlayingRef.current = true;

      let autoTriggered = false;
      const maybeAutoRecord = () => {
        if (autoTriggered) return;
        autoTriggered = true;

        isPlayingRef.current = false;

        // لو وضع المحادثة الصوتية شغّال: بعد ما يخلص الرد، نرجع نسجّل تلقائياً
        if (!voiceSessionRef.current) return;
        if (!voiceOverlayRef.current || !openRef.current) return;
        if (recordingFlagRef.current || sendingAudioRef.current) return;

        rearmRecordingIfIdle(350);
      };

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if ((status as any).didJustFinish) {
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
          maybeAutoRecord();
        }
      });

      // احتياط: لو ما وصلنا didJustFinish لأي سبب
      setTimeout(() => {
        if (!voiceSessionRef.current) return;
        if (soundRef.current) return;
        if (!voiceOverlayRef.current || !openRef.current) return;
        if (recordingFlagRef.current || sendingAudioRef.current) return;
        rearmRecordingIfIdle(450);
      }, 1500);
    } catch (e) {
      isPlayingRef.current = false;
      soundRef.current = null;
      if (voiceSessionRef.current && voiceOverlayRef.current && openRef.current) {
        rearmRecordingIfIdle(450);
      }
    }
  };

  const loadGuestProfile = async () => {
    try {
      const raw = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as GuestProfile;
      if (data.name) setGuestName(data.name);
      if (data.email) setGuestEmail(data.email);
      if (data.conversation_id && data.guest_token) {
        setConversationId(data.conversation_id);
        setGuestToken(data.guest_token);
        setGuestStep("chat");
      }
    } catch {
      /* ignore */
    }
  };

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
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const initForGuestIfHasConversation = async (convId: number, token: string) => {
    setLoading(true);
    try {
      const msgRes = await api.get<SupportMessage[]>(`support/guest-conversations/${convId}/messages/`, {
        headers: { "X-Guest-Token": token },
      });
      addMessagesUnique(msgRes.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = (convId: number) => {
    if (!wsBase) return;
    const qs = accessToken
      ? `?token=${encodeURIComponent(accessToken)}`
      : guestToken
      ? `?guest=1&guest_token=${encodeURIComponent(guestToken)}`
      : "?guest=1";

    const wsUrl = `${wsBase}/ws/support/${convId}/${qs}`;
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
      } catch {
        /* ignore */
      }
    };
  };

  const handleGuestRequestCode = async () => {
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
      await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ name: guestName.trim(), email: guestEmail.trim() }));
    } catch (err: any) {
      setGuestError(err?.response?.data?.detail || "تعذر إرسال الكود. حاول لاحقاً.");
    } finally {
      setGuestSubmitting(false);
    }
  };

  const handleGuestVerifyCode = async () => {
    setGuestError(null);
    if (!guestRequestId) {
      setGuestError("انتهت صلاحية الطلب، أعد طلب كود جديد.");
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
      await AsyncStorage.setItem(
        GUEST_STORAGE_KEY,
        JSON.stringify({ name: guestName.trim(), email: guestEmail.trim(), conversation_id: convId, guest_token: token }),
      );
      await initForGuestIfHasConversation(convId, token);
    } catch (err: any) {
      setGuestError(err?.response?.data?.detail || "كود غير صحيح أو منتهي.");
    } finally {
      setGuestSubmitting(false);
    }
  };

  const startVoiceRecording = async (force = false) => {
    // تشغيل وضع المحادثة الصوتية المستمرة بمجرد الضغط على المايك لأول مرة
    voiceSessionRef.current = true;
    voiceOverlayRef.current = true;
    setVoiceOverlay(true);

    if (!force && (recordingFlagRef.current || sendingAudioRef.current || isPlayingRef.current)) return;
    if (recordingFlagRef.current || activeRecordingRef.current) return;

    if (!conversationId) {
      setGuestError("ابدأ المحادثة أولاً قبل التسجيل الصوتي.");
      return;
    }

    // لو مستخدم مسجّل ومافي توكن: لا تحاول ترسل وتاخذ 401
    if (!isGuest && !accessToken) {
      setGuestError("انتهت الجلسة. أعد تسجيل الدخول ثم حاول.");
      return;
    }

    await stopBotAudio();
    clearVoiceTimer();

    try {
      const perm = await Audio.getPermissionsAsync();
      if (!perm.granted) {
        const req = await Audio.requestPermissionsAsync();
        if (!req.granted) {
          setGuestError("يرجى السماح بصلاحية المايكروفون.");
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const recordingOptions = {
        ...(Audio as any).RECORDING_OPTIONS_PRESET_HIGH_QUALITY,
        android: {
          ...((Audio as any).RECORDING_OPTIONS_PRESET_HIGH_QUALITY?.android || {}),
          extension: ".m4a",
        },
        ios: {
          ...((Audio as any).RECORDING_OPTIONS_PRESET_HIGH_QUALITY?.ios || {}),
          extension: ".m4a",
        },
        isMeteringEnabled: true,
      } as Audio.RecordingOptions;

      const { recording: rec } = await Audio.Recording.createAsync(recordingOptions, (status) => {
        if (!status || !status.canRecord) return;
        const now = Date.now();
        const level = (status as any).metering;

        // الصمت: يوقف ويسلّم مباشرة بدون زر
        const SILENCE_DB = -40;
        const SILENCE_MS = 900;

        if (typeof level === "number" && level < SILENCE_DB) {
          if (silenceSinceRef.current === null) silenceSinceRef.current = now;
          if (silenceSinceRef.current && now - silenceSinceRef.current > SILENCE_MS) {
            stopVoiceRecording(true).catch(() => undefined);
          }
        } else {
          silenceSinceRef.current = null;
        }
      });

      recordingFlagRef.current = true;
      activeRecordingRef.current = rec;
      silenceSinceRef.current = null;
      setRecording(rec);

      // سقف أقصى 35 ثانية
      voiceTimeoutRef.current = setTimeout(() => stopVoiceRecording(true), 35000);
    } catch (err) {
      console.error("voice start failed", err);
      setRecording(null);
      recordingFlagRef.current = false;
      activeRecordingRef.current = null;
      silenceSinceRef.current = null;
      setGuestError("تعذر بدء التسجيل. حاول مرة أخرى.");
      setVoiceOverlay(false);
      voiceOverlayRef.current = false;
      voiceSessionRef.current = false;
    }
  };

  const stopVoiceRecording = async (_autoStop = false) => {
    clearVoiceTimer();

    const rec = recording || activeRecordingRef.current;
    if (!rec) {
      recordingFlagRef.current = false;
      activeRecordingRef.current = null;
      silenceSinceRef.current = null;
      return;
    }

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();

      setRecording(null);
      recordingFlagRef.current = false;
      activeRecordingRef.current = null;
      silenceSinceRef.current = null;

      // إذا كان التسجيل قصير جداً أو uri فاضي: رجّع الاستماع
      if (!uri) {
        if (voiceSessionRef.current && voiceOverlayRef.current && openRef.current) rearmRecordingIfIdle(450);
        return;
      }

      await sendVoice(uri);
    } catch (err) {
      console.error("voice stop failed", err);
      setRecording(null);
      recordingFlagRef.current = false;
      activeRecordingRef.current = null;
      silenceSinceRef.current = null;

      if (voiceSessionRef.current && voiceOverlayRef.current && openRef.current) rearmRecordingIfIdle(450);
    }
  };

  const stopVoiceSession = async () => {
    voiceSessionRef.current = false;
    voiceOverlayRef.current = false;
    setVoiceOverlay(false);
    await stopBotAudio();
    await stopVoiceRecording(true);
  };

  const sendVoice = async (uri: string) => {
    if (!conversationId) return;

    // لو مستخدم مسجّل ومافي توكن: لا تحاول
    if (!isGuest && !accessToken) {
      setGuestError("انتهت الجلسة. أعد تسجيل الدخول ثم حاول.");
      return;
    }

    setSendingAudio(true);
    sendingAudioRef.current = true;

    try {
      const form = new FormData();

      // ملاحظة: لا تضبط Content-Type يدوياً (Axios لازم يضيف boundary)
      form.append(
        "audio",
        {
          uri,
          name: `voice-${Date.now()}.m4a`,
          type: Platform.OS === "ios" ? "audio/m4a" : "audio/mp4",
        } as any,
      );

      const url = isGuest ? `support/guest-conversations/${conversationId}/voice/` : "support/my-voice/";
      const guestHeaders = isGuest && guestToken ? { "X-Guest-Token": guestToken } : undefined;

      const res = await api.post(url, form, {
        headers: { ...(guestHeaders || {}) }, // ✅ بدون Content-Type
        timeout: 65000, // Whisper + TTS قد تأخذ وقت على السيرفر الضعيف
      });

      addMessagesUnique(
        [res.data.customer_message, res.data.guest_message, res.data.bot_reply].filter(Boolean) as SupportMessage[],
      );

      const audioPayload = res.data.bot_reply
        ? {
            ...res.data.bot_reply,
            bot_audio_base64: res.data.bot_audio_base64,
            bot_audio_mime: res.data.bot_audio_mime,
            tts_audio_base64: res.data.tts_audio_base64,
            audio_base64: res.data.bot_audio_base64 || res.data.tts_audio_base64,
            audio_mime: res.data.bot_audio_mime || res.data.audio_mime || "audio/mpeg",
          }
        : res.data;

      // يشغل الصوت.. وبعد ما يخلص يرجع يسجل تلقائيًا (لأن voiceSessionRef.current = true)
      await playBotAudio(audioPayload);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setGuestError(detail || "لم يتم إرسال الرسالة الصوتية. حاول مرة أخرى.");
      // في حال فشل الإرسال: ارجع للاستماع
      if (voiceSessionRef.current && voiceOverlayRef.current && openRef.current) rearmRecordingIfIdle(600);
    } finally {
      setSendingAudio(false);
      sendingAudioRef.current = false;
    }
  };

  const handleOpen = async () => {
    openRef.current = true;
    setOpen(true);
    setMessages([]);
    if (user && accessToken) {
      setGuestStep("chat");
      await initForLoggedUser();
    } else {
      await loadGuestProfile();
      if (!guestToken || !conversationId) {
        setGuestStep("form");
      }
    }
  };

  const handleClose = async () => {
    openRef.current = false;
    setOpen(false);
    await stopVoiceSession();
    wsRef.current?.close();
  };

  const sendText = async () => {
    if (!input.trim() || sendingAudio) return;
    const text = input.trim();

    if (!conversationId) {
      setGuestError("ابدأ المحادثة أولاً قبل الإرسال.");
      return;
    }

    setInput("");
    try {
      // إن كان الـ WS مفتوحاً نرسل فقط عبره ونعتمد على البث العكسي
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "message", content: text }));
        return;
      }

      const url = isGuest ? `support/guest-conversations/${conversationId}/messages/` : "support/my-messages/";
      const headers = isGuest && guestToken ? { "X-Guest-Token": guestToken } : undefined;
      const res = await api.post(url, { content: text }, { headers });

      addMessagesUnique([res.data.customer_message, res.data.guest_message, res.data.bot_reply].filter(Boolean) as SupportMessage[]);

      await playBotAudio(res.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!isGuest) return;
    loadGuestProfile();
  }, [isGuest]);

  useEffect(() => {
    if (!open) return;

    setMessages([]);
    setConversationId(null);

    if (user && accessToken) {
      setGuestStep("chat");
      initForLoggedUser();
    } else {
      AsyncStorage.getItem(GUEST_STORAGE_KEY)
        .then((raw) => {
          if (raw) {
            const stored = JSON.parse(raw) as GuestProfile;
            if (stored.conversation_id && stored.guest_token) {
              setGuestStep("chat");
              setConversationId(stored.conversation_id);
              setGuestToken(stored.guest_token);
              initForGuestIfHasConversation(stored.conversation_id, stored.guest_token);
              return;
            }
          }
          setGuestStep("form");
        })
        .catch(() => setGuestStep("form"));
    }
  }, [open, user, accessToken]);

  useEffect(() => {
    if (!open || !conversationId) return;
    connectWebSocket(conversationId);
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [conversationId, open, accessToken, wsBase, guestToken]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [open]);

  useEffect(() => {
    return () => {
      clearVoiceTimer();
      stopBotAudio();
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => undefined);
      }
      recordingFlagRef.current = false;
      sendingAudioRef.current = false;
      voiceOverlayRef.current = false;
      voiceSessionRef.current = false;
      isPlayingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderVoiceOverlay = () => {
    if (!voiceOverlay) return null;
    return (
      <View style={styles.voiceOverlay}>
        <View style={styles.voiceCard}>
          <Text style={styles.voiceTitle}>وضع المحادثة الصوتية</Text>
          <Text style={styles.voiceHint}>
            يتوقف تلقائياً عند الصمت أو بعد 35 ثانية، يُرسل فوراً، ثم ينتظر رد البوت، وبعد ما يخلص الرد يرجع يسجّل تلقائياً.
          </Text>

          <View style={styles.waveRow}>
            {[6, 10, 16, 12, 18, 12, 16, 10, 6].map((h, idx) => (
              <View key={idx} style={[styles.waveBar, { height: h + (recording ? 10 : 0) }]} />
            ))}
          </View>

          <Text style={styles.voiceStatus}>
            {sendingAudio
              ? "يتم إرسال الصوت..."
              : isPlayingRef.current
              ? "يتم تشغيل رد البوت..."
              : recording
              ? "يتم التسجيل..."
              : "يتم الاستعداد..."}
          </Text>

          <View style={styles.voiceActions}>
            <Pressable onPress={() => stopVoiceSession()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>إيقاف الوضع الصوتي</Text>
            </Pressable>
          </View>

          {guestError ? <Text style={[styles.error, { marginTop: 8 }]}>{guestError}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <>
      <Pressable style={styles.fab} onPress={handleOpen}>
        <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.overlay} onPress={handleClose} />
          <View style={[styles.panelWrap, { bottom: keyboardHeight ? keyboardHeight + 16 : 80 }]}>
            <Pressable style={styles.panel} onPress={() => undefined}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>دعم CafeMS Demo</Text>
                <View style={styles.headerActions}>
                  {(user || (isGuest && guestStep === "chat")) && (
                    <Pressable
                      style={styles.headerButton}
                      onPress={async () => {
                        await stopVoiceSession();
                        wsRef.current?.close();
                        setConversationId(null);
                        setMessages([]);
                        setInput("");
                        if (isGuest) {
                          await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
                          setGuestToken(null);
                          setGuestStep("form");
                        }
                      }}
                    >
                      <Text style={styles.headerButtonText}>إنهاء</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={handleClose}>
                    <Ionicons name="close" size={18} color="#fff" />
                  </Pressable>
                </View>
              </View>

              {isGuest && guestStep === "form" && (
                <View style={styles.body}>
                  <Text style={styles.bodyTitle}>تواصل معنا كضيف</Text>
                  <Text style={styles.bodyHint}>أدخل الاسم والبريد الإلكتروني لإرسال كود تحقق إلى بريدك.</Text>
                  <Text style={styles.inputLabel}>الاسم</Text>
                  <TextInput value={guestName} onChangeText={setGuestName} style={styles.input} textAlign="right" placeholder="الاسم" />
                  <Text style={styles.inputLabel}>البريد الإلكتروني</Text>
                  <TextInput
                    value={guestEmail}
                    onChangeText={setGuestEmail}
                    style={styles.input}
                    textAlign="right"
                    placeholder="example@mail.com"
                    keyboardType="email-address"
                  />
                  {guestError ? <Text style={styles.error}>{guestError}</Text> : null}
                  <Button title={guestSubmitting ? "يتم الإرسال..." : "إرسال الكود"} onPress={handleGuestRequestCode} disabled={guestSubmitting} />
                </View>
              )}

              {isGuest && guestStep === "code" && (
                <View style={styles.body}>
                  <Text style={styles.bodyTitle}>أدخل كود التحقق</Text>
                  <Text style={styles.bodyHint}>الكود صالح لمدة قصيرة. راجع بريدك.</Text>
                  <Text style={styles.inputLabel}>الكود</Text>
                  <TextInput value={guestCode} onChangeText={setGuestCode} style={styles.input} textAlign="center" keyboardType="numeric" maxLength={6} />
                  {guestError ? <Text style={styles.error}>{guestError}</Text> : null}
                  <View style={styles.codeRow}>
                    <Pressable onPress={() => { setGuestStep("form"); setGuestCode(""); }} style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>رجوع</Text>
                    </Pressable>
                    <Button title={guestSubmitting ? "يتم التحقق..." : "تحقق"} onPress={handleGuestVerifyCode} disabled={guestSubmitting} />
                  </View>
                </View>
              )}

              {(!isGuest || guestStep === "chat") && (
                <>
                  <View style={styles.chatBody}>
                    {(loading || connecting) && (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color="#f59e0b" />
                        <Text style={styles.loadingText}>{loading ? "جاري تحميل المحادثة..." : "جاري الاتصال..."}</Text>
                      </View>
                    )}
                    {!loading && !connecting && messages.length === 0 && (
                      <Text style={styles.emptyText}>لا توجد رسائل بعد. ابدأ بالسؤال أو سجّل صوتياً.</Text>
                    )}
                    <ScrollView ref={scrollRef} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                      {messages.map((m) => {
                        const isMe = (!isGuest && m.sender_type === "customer") || (isGuest && m.sender_type === "guest");
                        const isBot = m.sender_type === "bot";
                        return (
                          <View key={m.id} style={[styles.messageRow, isMe ? styles.messageRowEnd : styles.messageRowStart]}>
                            <View style={[styles.messageBubble, isMe ? styles.messageMine : isBot ? styles.messageBot : styles.messageOther]}>
                              {!isMe && <Text style={styles.messageSender}>{isBot ? "دعم آلي" : m.sender_name || "الدعم"}</Text>}
                              <Text style={[styles.messageText, isMe && { color: "#fff" }]}>{m.content}</Text>
                              <Text style={styles.messageTime}>{new Date(m.created_at).toLocaleTimeString()}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.chatInputRow}>
                    <TextInput
                      style={styles.chatInput}
                      placeholder="اكتب رسالتك..."
                      value={input}
                      onChangeText={setInput}
                      editable={!loading && !connecting && !sendingAudio}
                      returnKeyType="send"
                      onSubmitEditing={sendText}
                      blurOnSubmit={false}
                    />

                    {/* زر المايك: أول ضغطة تبدأ "الوضع الصوتي المستمر" */}
                    <Pressable
                      style={[
                        styles.micButton,
                        recording ? styles.micButtonRecording : styles.micButtonIdle,
                        (sendingAudio || (isGuest && guestStep !== "chat")) && styles.micButtonDisabled,
                      ]}
                      onPress={() => startVoiceRecording()}
                      disabled={sendingAudio || (isGuest && guestStep !== "chat")}
                    >
                      {sendingAudio ? (
                        <ActivityIndicator size="small" color={recording ? "#fff" : "#f59e0b"} />
                      ) : (
                        <Ionicons name={recording ? "mic" : "mic"} size={16} color={recording ? "#fff" : "#f59e0b"} />
                      )}
                    </Pressable>

                    <Pressable
                      style={[
                        styles.sendButton,
                        (!input.trim() || sendingAudio || (isGuest && guestStep !== "chat")) && styles.sendButtonDisabled,
                      ]}
                      onPress={sendText}
                      disabled={!input.trim() || sendingAudio || (isGuest && guestStep !== "chat")}
                    >
                      <Text style={styles.sendButtonText}>إرسال</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {renderVoiceOverlay()}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
};

const createStyles = () =>
  StyleSheet.create({
    fab: {
      position: "absolute",
      bottom: 70,
      right: 16,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "#f59e0b",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 12,
      zIndex: 120,
    },
    modalRoot: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.18)",
    },
    panelWrap: {
      position: "absolute",
      right: 16,
    },
    panel: {
      width: 320,
      maxWidth: "100%",
      backgroundColor: "#fffaf2",
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#fde68a",
    },
    header: {
      backgroundColor: "#f59e0b",
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 14,
    },
    headerActions: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },
    headerButton: {
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.7)",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    headerButtonText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "700",
    },
    body: {
      padding: 12,
      gap: 8,
    },
    bodyTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#0f172a",
      textAlign: "right",
    },
    bodyHint: {
      fontSize: 12,
      color: "#6b7280",
      textAlign: "right",
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: "#374151",
      textAlign: "right",
    },
    input: {
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: "#fff",
      color: "#0f172a",
    },
    error: {
      color: "#dc2626",
      textAlign: "right",
      fontSize: 12,
    },
    codeRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
    },
    secondaryButton: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      backgroundColor: "#fff",
    },
    secondaryButtonText: {
      color: "#0f172a",
      fontWeight: "700",
      fontSize: 12,
    },
    chatBody: {
      minHeight: 260,
      maxHeight: 320,
      padding: 10,
    },
    loadingRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
    },
    loadingText: {
      fontSize: 12,
      color: "#6b7280",
    },
    emptyText: {
      textAlign: "center",
      color: "#6b7280",
      fontSize: 12,
      marginTop: 6,
    },
    messageRow: {
      width: "100%",
    },
    messageRowEnd: {
      alignItems: "flex-end",
    },
    messageRowStart: {
      alignItems: "flex-start",
    },
    messageBubble: {
      maxWidth: "82%",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 14,
    },
    messageMine: {
      backgroundColor: "#f59e0b",
      borderTopRightRadius: 4,
    },
    messageOther: {
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#e5e7eb",
      borderTopLeftRadius: 4,
    },
    messageBot: {
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#fcd34d",
      borderStyle: "dashed",
      borderTopLeftRadius: 4,
    },
    messageSender: {
      fontSize: 10,
      color: "#64748b",
      marginBottom: 2,
      textAlign: "right",
    },
    messageText: {
      fontSize: 12,
      color: "#0f172a",
      textAlign: "right",
    },
    messageTime: {
      fontSize: 9,
      color: "#94a3b8",
      textAlign: "left",
      marginTop: 4,
    },
    chatInputRow: {
      borderTopWidth: 1,
      borderColor: "#e2e8f0",
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: "#fff",
    },
    chatInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      textAlign: "right",
      backgroundColor: "#fff",
      color: "#0f172a",
    },
    micButton: {
      borderWidth: 1,
      borderColor: "#fbbf24",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: "#fff",
    },
    micButtonIdle: {
      backgroundColor: "#fff",
    },
    micButtonRecording: {
      backgroundColor: "#ef4444",
      borderColor: "#ef4444",
    },
    micButtonDisabled: {
      opacity: 0.5,
    },
    sendButton: {
      backgroundColor: "#f59e0b",
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 12,
    },
    voiceOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
    },
    voiceCard: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: "#fffaf2",
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: "#fde68a",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    voiceTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: "#0f172a",
      textAlign: "center",
      marginBottom: 6,
    },
    voiceHint: {
      fontSize: 12,
      color: "#6b7280",
      textAlign: "center",
      marginBottom: 10,
    },
    waveRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 6,
      height: 50,
    },
    waveBar: {
      width: 4,
      borderRadius: 4,
      backgroundColor: "#f59e0b",
    },
    voiceStatus: {
      textAlign: "center",
      color: "#0f172a",
      fontSize: 12,
      marginTop: 8,
    },
    voiceActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 10,
    },
    uploadHint: {
      textAlign: "center",
      color: "#6b7280",
      fontSize: 11,
      marginTop: 6,
    },
  });

export default SupportChatFloating;
