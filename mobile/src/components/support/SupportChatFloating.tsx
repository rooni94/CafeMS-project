// mobile/src/components/support/SupportChatFloating.tsx
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
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { ENV } from "../../config/env";
import { Button } from "../ui";

type SupportMessage = {
  id: number;
  conversation: number;
  sender_type:
    | "customer"
    | "staff"
    | "supervisor"
    | "manager"
    | "bot"
    | "guest";
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

const SupportChatFloating: React.FC = () => {
  const { user, accessToken } = useAuth();
  const isGuest = !user;

  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [input, setInput] = useState("");

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestStep, setGuestStep] = useState<"form" | "code" | "chat">("form");
  const [guestRequestId, setGuestRequestId] = useState<number | null>(null);
  const [guestCode, setGuestCode] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const wsBase = useMemo(() => getWsBaseUrl(), []);
  const styles = useMemo(() => createStyles(), []);

  const loadGuestProfile = async () => {
    try {
      const raw = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as GuestProfile;
      if (data.name) setGuestName(data.name);
      if (data.email) setGuestEmail(data.email);
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        setGuestStep("chat");
      }
    } catch {
      // ignore
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
      setMessages(msgRes.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const initForGuestIfHasConversation = async (convId: number) => {
    setLoading(true);
    try {
      const msgRes = await api.get<SupportMessage[]>(
        `support/conversations/${convId}/messages/`
      );
      setMessages(msgRes.data || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = (convId: number) => {
    if (!wsBase) return;
    const qs = accessToken ? `?token=${accessToken}` : "?guest=1";
    const wsUrl = `${wsBase}/ws/support/${convId}/${qs}`;

    try {
      setConnecting(true);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnecting(false);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SupportMessage;
          setMessages((prev) => [...prev, data]);
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setConnecting(false);
        wsRef.current = null;
      };

      ws.onerror = () => {
        setConnecting(false);
      };
    } catch {
      setConnecting(false);
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
            if (stored.conversation_id) {
              setGuestStep("chat");
              setConversationId(stored.conversation_id);
              initForGuestIfHasConversation(stored.conversation_id);
              return;
            }
          }
          setGuestStep("form");
        })
        .catch(() => setGuestStep("form"));
    }
  }, [open, user, accessToken]);

  // WebSocket + timeout
  useEffect(() => {
    if (!open || !conversationId) return;

    connectWebSocket(conversationId);

    const timeout = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
        setConnecting(false);
      }
    }, 7000);

    return () => {
      clearTimeout(timeout);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [conversationId, open, accessToken, wsBase]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onShow = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
    return () => onShow.remove();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setKeyboardHeight(0);
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [open]);

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
      const partial: GuestProfile = {
        name: guestName.trim(),
        email: guestEmail.trim(),
      };
      await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(partial));
    } catch (err: any) {
      setGuestError(
        err?.response?.data?.detail ||
          "تعذر إرسال رمز التحقق، حاول لاحقاً."
      );
    } finally {
      setGuestSubmitting(false);
    }
  };

  const handleGuestVerifyCode = async () => {
    setGuestError(null);
    if (!guestRequestId) {
      setGuestError("يرجى طلب رمز التحقق أولاً.");
      setGuestStep("form");
      return;
    }
    if (!guestCode.trim()) {
      setGuestError("يرجى إدخال رمز التحقق.");
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
      const toStore: GuestProfile = {
        name: guestName.trim(),
        email: guestEmail.trim(),
        conversation_id: convId,
      };
      await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(toStore));
      try {
        const msgRes = await api.get<SupportMessage[]>(
          `support/conversations/${convId}/messages/`
        );
        setMessages(msgRes.data || []);
      } catch {
        setMessages([]);
      }
    } catch (err: any) {
      setGuestError(
        err?.response?.data?.detail || "رمز غير صحيح، حاول مرة أخرى."
      );
    } finally {
      setGuestSubmitting(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: text }));
      setInput("");
      return;
    }

    try {
      if (user && accessToken) {
        const res = await api.post("support/my-messages/", { content: text });
        const customerMsg = res.data.customer_message as SupportMessage;
        const botReply = res.data.bot_reply as SupportMessage | null;
        setMessages((prev) =>
          botReply ? [...prev, customerMsg, botReply] : [...prev, customerMsg]
        );
        setInput("");
      } else if (isGuest && conversationId) {
        const fakeMsg: SupportMessage = {
          id: Date.now(),
          conversation: conversationId,
          sender_type: "guest",
          content: text,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fakeMsg]);
        setInput("");
      }
    } catch {
      // تجاهل، نقدر نضيف Alert لو حاب
    }
  };

  const handleEndChat = async () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    if (user && accessToken) {
      try {
        await api.post("support/my-conversation/close/");
      } catch {
        // ignore
      }
    }
    setConversationId(null);
    setMessages([]);
    setInput("");
    if (isGuest) {
      await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
      setGuestStep("form");
    }
  };

  return (
    <>
      <Pressable style={styles.fab} onPress={() => setOpen(true)}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={22}
          color="#fff"
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.panelWrap,
              { bottom: keyboardHeight ? keyboardHeight + 16 : 80 },
            ]}
          >
            <Pressable style={styles.panel} onPress={() => undefined}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>دعم CafeMS Demo</Text>
                <View style={styles.headerActions}>
                  {(user || (isGuest && guestStep === "chat")) && (
                    <Pressable
                      style={styles.headerButton}
                      onPress={handleEndChat}
                    >
                      <Text style={styles.headerButtonText}>إنهاء</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setOpen(false)}>
                    <Ionicons name="close" size={18} color="#fff" />
                  </Pressable>
                </View>
              </View>

              {isGuest && guestStep === "form" && (
                <View style={styles.body}>
                  <Text style={styles.bodyTitle}>تواصل معنا كضيف</Text>
                  <Text style={styles.bodyHint}>
                    الرجاء إدخال الاسم والبريد الإلكتروني لإرسال كود تحقق إلى
                    بريدك.
                  </Text>
                  <Text style={styles.inputLabel}>الاسم</Text>
                  <TextInput
                    value={guestName}
                    onChangeText={setGuestName}
                    style={styles.input}
                    textAlign="right"
                    placeholder="الاسم"
                  />
                  <Text style={styles.inputLabel}>البريد الإلكتروني</Text>
                  <TextInput
                    value={guestEmail}
                    onChangeText={setGuestEmail}
                    style={styles.input}
                    textAlign="right"
                    placeholder="example@mail.com"
                    keyboardType="email-address"
                  />
                  {guestError ? (
                    <Text style={styles.error}>{guestError}</Text>
                  ) : null}
                  <Button
                    title={
                      guestSubmitting ? "جاري الإرسال..." : "إرسال كود التحقق"
                    }
                    onPress={handleGuestRequestCode}
                    disabled={guestSubmitting}
                  />
                </View>
              )}

              {isGuest && guestStep === "code" && (
                <View style={styles.body}>
                  <Text style={styles.bodyTitle}>تأكيد البريد الإلكتروني</Text>
                  <Text style={styles.bodyHint}>
                    أدخل كود التحقق المرسل إلى بريدك الإلكتروني.
                  </Text>
                  <Text style={styles.inputLabel}>كود التحقق</Text>
                  <TextInput
                    value={guestCode}
                    onChangeText={setGuestCode}
                    style={styles.input}
                    textAlign="center"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                  {guestError ? (
                    <Text style={styles.error}>{guestError}</Text>
                  ) : null}
                  <View style={styles.codeRow}>
                    <Button
                      title="رجوع"
                      variant="secondary"
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => {
                        setGuestStep("form");
                        setGuestCode("");
                      }}
                    />
                    <Button
                      title={
                        guestSubmitting ? "جاري التحقق..." : "تأكيد الكود"
                      }
                      onPress={handleGuestVerifyCode}
                      disabled={guestSubmitting}
                      style={{ flex: 1 }}
                      size="sm"
                    />
                  </View>
                </View>
              )}

              {(!isGuest || guestStep === "chat") && (
                <>
                  <View style={styles.chatBody}>
                    {(loading || connecting) && (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color="#f59e0b" />
                        <Text style={styles.loadingText}>
                          {loading
                            ? "جاري تحميل المحادثة..."
                            : "جاري محاولة الاتصال بالشات..."}
                        </Text>
                      </View>
                    )}
                    {!loading && !connecting && messages.length === 0 && (
                      <Text style={styles.emptyText}>
                        أهلاً! اكتب سؤالك وبنرد عليك قريب 🤍
                      </Text>
                    )}
                    <ScrollView
                      ref={scrollRef}
                      contentContainerStyle={{
                        gap: 8,
                        paddingBottom: 8,
                      }}
                      keyboardShouldPersistTaps="handled"
                    >
                      {messages.map((m) => {
                        const isMe =
                          (!isGuest && m.sender_type === "customer") ||
                          (isGuest && m.sender_type === "guest");
                        const isBot = m.sender_type === "bot";
                        return (
                          <View
                            key={m.id}
                            style={[
                              styles.messageRow,
                              isMe
                                ? styles.messageRowEnd
                                : styles.messageRowStart,
                            ]}
                          >
                            <View
                              style={[
                                styles.messageBubble,
                                isMe
                                  ? styles.messageMine
                                  : isBot
                                  ? styles.messageBot
                                  : styles.messageOther,
                              ]}
                            >
                              {!isMe && (
                                <Text style={styles.messageSender}>
                                  {isBot ? "رد تلقائي" : m.sender_name || "الدعم"}
                                </Text>
                              )}
                              <Text
                                style={[
                                  styles.messageText,
                                  isMe && { color: "#fff" },
                                ]}
                              >
                                {m.content}
                              </Text>
                              <Text style={styles.messageTime}>
                                {new Date(
                                  m.created_at
                                ).toLocaleTimeString()}
                              </Text>
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
                      editable={!loading && !connecting}
                      returnKeyType="send"
                      onSubmitEditing={handleSend}
                      blurOnSubmit={false}
                    />
                    <Pressable
                      style={[
                        styles.sendButton,
                        !input.trim() && styles.sendButtonDisabled,
                      ]}
                      onPress={handleSend}
                      disabled={!input.trim()}
                    >
                      <Text style={styles.sendButtonText}>إرسال</Text>
                    </Pressable>
                  </View>
                </>
              )}
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
  });

export default SupportChatFloating;
