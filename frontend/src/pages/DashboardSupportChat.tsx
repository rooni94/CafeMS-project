// src/pages/DashboardSupportChat.tsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

type Conversation = {
  id: number;
  customer_name: string | null;
  customer_id: number | null;
  guest_name?: string | null;
  guest_email?: string | null;
  is_guest?: boolean;
  created_at: string;
  last_message_at: string | null;
  unread_for_support: boolean;
  is_closed?: boolean;
};

type SupportMessage = {
  id: number;
  conversation: number;
  sender_type:
    | "customer"
    | "guest"
    | "staff"
    | "supervisor"
    | "manager"
    | "bot";
  sender_name?: string;
  content: string;
  created_at: string;
};

const DashboardSupportChat: React.FC = () => {
  const { user, accessToken } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isSupport =
    user?.role === "staff" ||
    user?.role === "supervisor" ||
    user?.role === "manager";

  // تحميل المحادثات
  const fetchConversations = () => {
    setLoadingConvs(true);
    api
      .get<Conversation[]>("support/conversations/")
      .then((res) => setConversations(res.data))
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoadingConvs(false));
  };

  // تحميل رسائل محادثة معينة عن طريق REST
  const fetchMessages = (convId: number) => {
    setLoadingMsgs(true);
    api
      .get<SupportMessage[]>(`support/conversations/${convId}/messages/`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoadingMsgs(false));
  };

  useEffect(() => {
    if (!isSupport) return;
    fetchConversations();
  }, [isSupport]);

  // فتح WebSocket لمحادثة معينة
  const connectWebSocket = (convId: number) => {
    if (!accessToken) return;

    const apiUrl = import.meta.env.VITE_API_URL || "/api/";
    const loc = window.location;

    let wsBase = "";
    try {
      if (
        typeof apiUrl === "string" &&
        (apiUrl.startsWith("http://") || apiUrl.startsWith("https://"))
      ) {
        const url = new URL(apiUrl);
        const wsScheme = url.protocol === "https:" ? "wss" : "ws";
        wsBase = `${wsScheme}://${url.host}`;
      }
    } catch {
      // ignore
    }

    if (!wsBase) {
      const wsScheme = loc.protocol === "https:" ? "wss" : "ws";
      wsBase = `${wsScheme}://${loc.host}`;
    }

    const wsUrl = `${wsBase}/ws/support/${convId}/?token=${encodeURIComponent(accessToken)}`;

    if (wsRef.current) {
      wsRef.current.close();
    }

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
        console.error("WS parse error", err);
      }
    };

    ws.onclose = () => {
      setConnecting(false);
      wsRef.current = null;
    };

    ws.onerror = (err) => {
      console.error("WS error", err);
      setConnecting(false);
    };
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    setMessages([]);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    fetchMessages(conv.id);
    connectWebSocket(conv.id);

    // تعليم كمقروءة
    api.post(`support/conversations/${conv.id}/mark-read/`).catch(() => {});
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedConv]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedConv || selectedConv.is_closed) return;

    // 1) لو WebSocket مفتوح → نستخدمه
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

    // 2) fallback → REST API
    try {
      const res = await api.post<SupportMessage>(
        `support/conversations/${selectedConv.id}/messages/`,
        { content: text }
      );
      setMessages((prev) => [...prev, res.data]);
      setInput("");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء إرسال الرسالة.");
    }
  };

  if (!isSupport) {
    return <div>هذا القسم مخصص لفريق الدعم فقط.</div>;
  }

  return (
    <div className="flex gap-4 h-[70vh]">
      {/* قائمة المحادثات */}
      <div className="w-64 bg-white rounded-xl shadow p-3 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">محادثات الدعم</h2>
          <button
            onClick={fetchConversations}
            className="text-[11px] text-amber-600 hover:underline"
          >
            تحديث
          </button>
        </div>
        {loadingConvs ? (
          <div className="text-xs text-gray-500">جاري تحميل المحادثات...</div>
        ) : conversations.length === 0 ? (
          <div className="text-xs text-gray-500">لا توجد محادثات حالياً.</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1 text-xs">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectConversation(c)}
                className={`w-full text-right px-2 py-2 rounded-lg border text-xs ${
                  selectedConv?.id === c.id
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold">
                    {c.is_guest
                      ? c.guest_name || c.customer_name || "ضيف"
                      : c.customer_name || `مستخدم #${c.customer_id ?? c.id}`}
                  </span>
                  {c.unread_for_support && (
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  )}
                </div>

                {c.is_guest && c.guest_email && (
                  <div className="text-[10px] text-gray-400 truncate">
                    {c.guest_email}
                  </div>
                )}

                <div className="text-[10px] text-gray-500">
                  {c.last_message_at
                    ? new Date(c.last_message_at).toLocaleString()
                    : new Date(c.created_at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 bg-white rounded-xl shadow flex flex-col">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
            اختر محادثة من القائمة لعرض الرسائل.
          </div>
        ) : (
          <>
<div className="px-4 py-2 border-b flex items-center justify-between">
  <div>
    <h3 className="text-sm font-semibold">
      المحادثة مع{" "}
      {selectedConv.is_guest
        ? selectedConv.guest_name || "ضيف"
        : selectedConv.customer_name || `مستخدم #${selectedConv.customer_id}`}
    </h3>
    <div className="text-[11px] text-gray-500">
      بدأ الحوار: {new Date(selectedConv.created_at).toLocaleString()}
    </div>
    {selectedConv.is_guest && selectedConv.guest_email && (
      <div className="text-[11px] text-gray-500">
        بريد الضيف: {selectedConv.guest_email}
      </div>
    )}
    {selectedConv.is_closed && (
      <div className="text-[11px] text-red-500 mt-1">
        هذه المحادثة مغلقة.
      </div>
    )}
  </div>

  <div className="flex items-center gap-2">
    {!selectedConv.is_closed && (
      <button
        onClick={async () => {
          try {
            await api.post(`support/conversations/${selectedConv.id}/close/`);
            setSelectedConv((prev) =>
              prev ? { ...prev, is_closed: true } : prev
            );
            setConversations((prev) =>
              prev.map((c) =>
                c.id === selectedConv.id ? { ...c, is_closed: true } : c
              )
            );
          } catch (err) {
            console.error(err);
            alert("تعذر إغلاق المحادثة.");
          }
        }}
        className="px-2 py-1 rounded-full border border-amber-500 text-amber-700 text-[11px] hover:bg-amber-50"
      >
        إنهاء المحادثة
      </button>
    )}
    <button
      onClick={async () => {
        if (!window.confirm("هل أنت متأكد من حذف هذه المحادثة من السجل؟")) return;
        try {
          await api.delete(`support/conversations/${selectedConv.id}/delete/`);
          setConversations((prev) =>
            prev.filter((c) => c.id !== selectedConv.id)
          );
          setSelectedConv(null);
          setMessages([]);
        } catch (err) {
          console.error(err);
          alert("تعذر حذف المحادثة.");
        }
      }}
      className="px-2 py-1 rounded-full border border-red-500 text-red-600 text-[11px] hover:bg-red-50"
    >
      حذف
    </button>
  </div>
</div>

            <div className="flex-1 px-3 py-2 overflow-y-auto space-y-2 text-xs bg-amber-50/40">
              {loadingMsgs ? (
                <div className="text-center text-gray-500 mt-3">
                  جاري تحميل الرسائل...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-3">
                  لا توجد رسائل بعد في هذه المحادثة.
                </div>
              ) : (
                <>
                  {messages.map((m) => {
                    const isSupportSide =
                      m.sender_type === "staff" ||
                      m.sender_type === "supervisor" ||
                      m.sender_type === "manager";
                    const isBot = m.sender_type === "bot";

                    return (
                      <div
                        key={m.id}
                        className={`flex ${
                          isSupportSide ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl shadow-sm ${
                            isSupportSide
                              ? "bg-amber-500 text-white rounded-br-none"
                              : isBot
                              ? "bg-white border border-dashed border-amber-300 text-gray-800 rounded-bl-none"
                              : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                          }`}
                        >
                          <div className="text-[10px] text-gray-200 mb-0.5">
                            {isBot
                              ? "دعم آلي"
                              : m.sender_type === "customer"
                              ? "العميل"
                              : m.sender_type === "guest"
                              ? "الضيف"
                              : m.sender_name || "الدعم"}
                          </div>
                          <div>{m.content}</div>
                          <div className="text-[9px] text-gray-200 mt-1 text-left">
                            {new Date(m.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="border-t px-3 py-2 flex items-center gap-2">
              <input
                className="flex-1 border rounded-full px-3 py-1.5 text-xs"
                placeholder="اكتب ردك على العميل..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                    
                  }
                }}
                disabled={connecting || loadingMsgs || !selectedConv || selectedConv.is_closed}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || connecting || loadingMsgs || !selectedConv || selectedConv.is_closed}
                className="px-4 py-1.5 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
              >
                إرسال
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardSupportChat;
