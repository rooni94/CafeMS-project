// src/components/support/SupportChatWidget.tsx
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
};

type GuestProfile = {
  name: string;
  email: string;
  conversation_id?: number;
};

const GUEST_STORAGE_KEY = "cafe_support_guest";

const getWsBaseUrl = () => {
  const loc = window.location;
  const wsScheme = loc.protocol === "https:" ? "wss" : "ws";
  const backendPort = "8000"; // تأكد أنه نفس منفذ الباكند عندك
  return `${wsScheme}://${loc.hostname}:${backendPort}`;
};

const SupportChatWidget: React.FC = () => {
  const { user, accessToken } = useAuth();

  const [open, setOpen] = useState(false);

  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [input, setInput] = useState("");

  // 👇 حالة الزائر
  const isGuest = !user;
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const [guestStep, setGuestStep] = useState<"form" | "code" | "chat">("form");
  const [guestRequestId, setGuestRequestId] = useState<number | null>(null);
  const [guestCode, setGuestCode] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSubmitting, setGuestSubmitting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // تحميل بيانات محتملة للضيف من localStorage
  useEffect(() => {
    if (!isGuest) return;
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as GuestProfile;
        if (data.name) setGuestName(data.name);
        if (data.email) setGuestEmail(data.email);
        if (data.conversation_id) {
          setConversationId(data.conversation_id);
          setGuestStep("chat");
        }
      }
    } catch (e) {
      console.error("Guest storage parse error", e);
    }
  }, [isGuest]);

  // ====== مستخدم مسجّل ======
  const initForLoggedUser = async () => {
    if (!user || !accessToken) return;
    setLoading(true);
    try {
      const convRes = await api.get("support/my-conversation/");
      const convId = convRes.data.conversation.id as number;
      setConversationId(convId);

      const msgRes = await api.get<SupportMessage[]>("support/my-messages/");
      setMessages(msgRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ====== ضيف – طلب كود للتحقق ======
  const handleGuestRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError(null);

    if (!guestName.trim() || !guestEmail.trim()) {
      setGuestError("الرجاء إدخال الاسم والبريد الإلكتروني.");
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

      // نخزن الاسم والإيميل مؤقتاً
      const partial: GuestProfile = { name: guestName.trim(), email: guestEmail.trim() };
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(partial));
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        "تعذر إرسال كود التحقق، تأكد من البريد ثم حاول مرة أخرى.";
      setGuestError(msg);
    } finally {
      setGuestSubmitting(false);
    }
  };

  // ====== ضيف – التحقق من الكود وإنشاء المحادثة ======
  const handleGuestVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError(null);

    if (!guestRequestId) {
      setGuestError("انتهت صلاحية الطلب، أعد إدخال بياناتك.");
      setGuestStep("form");
      return;
    }
    if (!guestCode.trim()) {
      setGuestError("الرجاء إدخال كود التحقق.");
      return;
    }

    setGuestSubmitting(true);
    try {
      const res = await api.post("support/guest-verify-code/", {
        request_id: guestRequestId,
        code: guestCode.trim(),
      });

      const conv = res.data.conversation;
      const convId = conv.id as number;
      setConversationId(convId);
      setGuestStep("chat");

      // نخزن البيانات كاملة
      const toStore: GuestProfile = {
        name: guestName.trim(),
        email: guestEmail.trim(),
        conversation_id: convId,
      };
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(toStore));

      // تحميل أي رسائل ترحيب/بوت
      const msgRes = await api.get<SupportMessage[]>(
        `support/conversations/${convId}/messages/`
      );
      setMessages(msgRes.data);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        "كود التحقق غير صحيح أو منتهي. حاول مرة أخرى.";
      setGuestError(msg);
    } finally {
      setGuestSubmitting(false);
    }
  };

  // ====== ضيف – في حال عندنا conversation_id مباشر (من localStorage) ======
  const initForGuestIfHasConversation = async (convId: number) => {
    setLoading(true);
    try {
      const msgRes = await api.get<SupportMessage[]>(
        `support/conversations/${convId}/messages/`
      );
      setMessages(msgRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2) فتح WebSocket
  const connectWebSocket = (convId: number) => {
    const base = getWsBaseUrl();
    const qs = accessToken ? `?token=${accessToken}` : "?guest=1";
    const wsUrl = `${base}/ws/support/${convId}/${qs}`;

    setConnecting(true);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnecting(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SupportMessage;
        setMessages((prev) => [...prev, data]);
      } catch (err) {
        console.error("WS message parse error", err);
      }
    };

    ws.onclose = () => {
      setConnecting(false);       // ✅ مهم
      wsRef.current = null;
    };

    ws.onerror = (err) => {
      console.error("WS error", err);
      setConnecting(false);       // ✅ مهم
    };
  };

  // عند فتح الشات
  useEffect(() => {
    if (!open) return;

    setMessages([]);
    setConversationId(null);

    if (user && accessToken) {
      // مستخدم مسجّل
      setGuestStep("chat");
      initForLoggedUser();
    } else {
      // ضيف
      // لو عندنا conv_id مسبقاً من التخزين
      try {
        const raw = localStorage.getItem(GUEST_STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as GuestProfile;
          if (stored.conversation_id) {
            setGuestStep("chat");
            setConversationId(stored.conversation_id);
            initForGuestIfHasConversation(stored.conversation_id);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }

      // لو ما عندنا محادثة سابقة → نبدأ من الفورم
      setGuestStep("form");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, accessToken]);

  // بعد معرفة conversationId نفتح الـ WebSocket
  useEffect(() => {
    if (!open || !conversationId) return;
    connectWebSocket(conversationId);

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [conversationId, open, accessToken]);

  // Scroll لآخر رسالة
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    // لو WebSocket جاهز نستعمله
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          content: text,
        })
      );
      setInput("");
      return;
    }

    // في حال WS غير جاهز → نستخدم REST
    try {
      if (user && accessToken) {
        // مستخدم مسجّل
        const res = await api.post("support/my-messages/", { content: text });
        const customerMsg = res.data.customer_message as SupportMessage;
        const botReply = res.data.bot_reply as SupportMessage | null;
        setMessages((prev) =>
          botReply ? [...prev, customerMsg, botReply] : [...prev, customerMsg]
        );
        setInput("");
      } else if (isGuest && conversationId) {
        // ضيف: نرسل الرسالة عن طريق endpoint خاص بالدعم لاحقاً
        // حالياً سنكتفي بإضافتها محلياً كرسالة ضيف حتى تضبط الـ WebSocket
        const fakeMsg: SupportMessage = {
          id: Date.now(),
          conversation: conversationId,
          sender_type: "guest",
          content: text,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fakeMsg]);
        setInput("");
      } else {
        alert("الرجاء إكمال خطوات التحقق قبل إرسال الرسائل.");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء إرسال الرسالة.");
    }
  };

  const handleEndChat = async () => {
    // إغلاق WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // لو مستخدم مسجّل → نغلق المحادثة من الباكند
    if (user && accessToken) {
      try {
        await api.post("support/my-conversation/close/");
      } catch (err) {
        console.error(err);
      }
    }

    // تنظيف الحالة المحلية
    setConversationId(null);
    setMessages([]);
    setInput("");

    if (isGuest) {
      // حذف بيانات الضيف كي يبدأ من جديد
      localStorage.removeItem(GUEST_STORAGE_KEY);
      setGuestStep("form");
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {open && (
        <div className="w-72 sm:w-80 h-96 bg-white rounded-2xl shadow-lg border border-amber-100 flex flex-col overflow-hidden mb-2">
          <div className="px-3 py-2 bg-amber-500 text-white flex items-center justify-between">
            <span className="text-sm font-semibold">دعم CafeMS Demo</span>
            <div className="flex items-center gap-2">
              {(user || (isGuest && guestStep === "chat")) && (
                <button
                  onClick={handleEndChat}
                  className="text-[10px] border border-white/60 rounded-full px-2 py-0.5 hover:bg-white/10"
                >
                  إنهاء
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-xs hover:text-red-100"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 👇 حالة الضيف – خطوة 1: نموذج الاسم والإيميل */}
          {isGuest && guestStep === "form" && (
            <div className="flex-1 px-3 py-3 text-xs bg-amber-50/40">
              <p className="mb-2 text-gray-700 text-sm font-semibold">
                تواصل معنا كضيف
              </p>
              <p className="mb-3 text-gray-500 text-[11px]">
                الرجاء إدخال الاسم والبريد الإلكتروني لإرسال كود تحقق إلى بريدك.
              </p>
              <form
                onSubmit={handleGuestRequestCode}
                className="space-y-2 text-xs"
              >
                <div>
                  <label className="block mb-1">الاسم</label>
                  <input
                    className="w-full border rounded-lg px-2 py-1.5"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    className="w-full border rounded-lg px-2 py-1.5"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                  />
                </div>
                {guestError && (
                  <div className="text-[11px] text-red-500 mt-1">
                    {guestError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={guestSubmitting}
                  className="w-full mt-2 py-1.5 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
                >
                  {guestSubmitting ? "جاري إرسال الكود..." : "إرسال كود التحقق"}
                </button>
              </form>
            </div>
          )}

          {/* 👇 حالة الضيف – خطوة 2: إدخال كود التحقق */}
          {isGuest && guestStep === "code" && (
            <div className="flex-1 px-3 py-3 text-xs bg-amber-50/40">
              <p className="mb-2 text-gray-700 text-sm font-semibold">
                تحقق من بريدك الإلكتروني
              </p>
              <p className="mb-3 text-gray-500 text-[11px]">
                تم إرسال كود مكوّن من 6 أرقام إلى بريدك الإلكتروني.
                الرجاء إدخاله بالأسفل لإكمال التحقق.
              </p>
              <form
                onSubmit={handleGuestVerifyCode}
                className="space-y-2 text-xs"
              >
                <div>
                  <label className="block mb-1">كود التحقق</label>
                  <input
                    className="w-full border rounded-lg px-2 py-1.5 text-center tracking-[0.3em]"
                    value={guestCode}
                    onChange={(e) => setGuestCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>
                {guestError && (
                  <div className="text-[11px] text-red-500 mt-1">
                    {guestError}
                  </div>
                )}
                <div className="flex justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGuestStep("form");
                      setGuestCode("");
                    }}
                    className="px-3 py-1.5 rounded-full border text-xs"
                  >
                    الرجوع
                  </button>
                  <button
                    type="submit"
                    disabled={guestSubmitting}
                    className="px-4 py-1.5 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
                  >
                    {guestSubmitting ? "جاري التحقق..." : "تأكيد الكود"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 👇 الشات العادي (للعميل أو للضيف بعد التحقق) */}
          {(!isGuest || guestStep === "chat") && (
            <>
              <div className="flex-1 px-3 py-2 overflow-y-auto space-y-2 text-xs bg-amber-50/40">
                {(loading || connecting) && (
                  <div className="text-center text-gray-500 mt-3">
                    {loading
                      ? "جاري تحميل المحادثة..."
                      : "جاري الاتصال بالدردشة..."}
                  </div>
                )}

                {!loading && !connecting && messages.length === 0 && (
                  <div className="text-gray-500 text-center mt-4">
                    اكتب رسالتك لبدء المحادثة مع الدعم.
                  </div>
                )}

                {messages.map((m) => {
                  const isMe =
                    (!isGuest && m.sender_type === "customer") ||
                    (isGuest && m.sender_type === "guest");
                  const isBot = m.sender_type === "bot";

                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        isMe ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl shadow-sm ${
                          isMe
                            ? "bg-amber-500 text-white rounded-br-none"
                            : isBot
                            ? "bg-white border border-dashed border-amber-300 text-gray-800 rounded-bl-none"
                            : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                        }`}
                      >
                        {!isMe && (
                          <div className="text-[10px] text-gray-500 mb-0.5">
                            {isBot
                              ? "دعم آلي"
                              : m.sender_name || "الدعم"}
                          </div>
                        )}
                        <div>{m.content}</div>
                        <div className="text-[9px] text-gray-400 mt-1 text-left">
                          {new Date(m.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t px-2 py-2 flex items-center gap-1">
                <input
                  className="flex-1 border rounded-full px-3 py-1.5 text-xs"
                  placeholder="اكتب رسالتك..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading || connecting || (isGuest && guestStep !== "chat")}
                />
                <button
                  onClick={handleSend}
                  disabled={
                    !input.trim() ||
                    loading ||
                    connecting ||
                    (isGuest && guestStep !== "chat")
                  }
                  className="px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
                >
                  إرسال
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* زر الشات – يظهر للجميع */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-12 h-12 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center text-xl hover:bg-amber-600"
      >
        💬
      </button>
    </div>
  );
};

export default SupportChatWidget;
