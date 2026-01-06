// mobile/src/screens/dashboard/DashboardSupportChat.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Screen from "../../components/Screen";
import { useTheme } from "../../theme";
import { api, parseApiError } from "../../services/api";
import { AppStackParamList } from "../../navigation/AppNavigator";
import { safeGoBack } from "../../navigation/helpers";
import { useI18n } from "../../i18n";

type Message = {
  id: number;
  text?: string;
  content?: string;
  message?: string;
  sender?: string;
  sender_role?: string;
  sender_type?: string;
  created_at: string;
};

const safeText = (val: any) => {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return val.text || val.content || val.message || JSON.stringify(val);
  return String(val);
};

const DashboardSupportChat: React.FC = () => {
  const route = useRoute<RouteProp<AppStackParamList, "DashboardSupportChat">>();
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const qc = useQueryClient();
  const { t } = useI18n();
  const { id, owner_name, subject, guest_email, is_guest } = route.params || {};
  const [reply, setReply] = useState("");

  const { data: conversation } = useQuery({
    queryKey: ["support-conversation-admin", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`support/conversations/${id}/`);
      return res.data;
    },
  });

  const { data: messages = [], isLoading: msgLoading } = useQuery<Message[]>({
    queryKey: ["support-messages-admin", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`support/conversations/${id}/messages/`);
      return res.data?.results || res.data || [];
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const content = reply.trim();
      if (!content) return;
      const payload = { content, message: content, text: content };
      await api.post(`support/conversations/${id}/messages/`, payload);
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["support-messages-admin", id] });
    },
    onError: (err) =>
      Alert.alert(
        t("dashboard.supportChatSendErrorTitle", "تعذر الإرسال"),
        parseApiError(err, t("dashboard.supportChatSendErrorBody", "تعذر إرسال الرسالة."))
      ),
  });

  const closeConversation = useMutation({
    mutationFn: async () => {
      await api.post(`support/conversations/${id}/close/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-conversation-admin", id] });
      qc.invalidateQueries({ queryKey: ["support-conversations-admin"] });
      Alert.alert(
        t("dashboard.supportChatClosedTitle", "تم"),
        t("dashboard.supportChatClosedBody", "تم إنهاء المحادثة.")
      );
    },
    onError: (err) =>
      Alert.alert(
        t("common.errorTitle", "خطأ"),
        parseApiError(err, t("dashboard.supportChatCloseError", "تعذر إنهاء المحادثة."))
      ),
  });

  const deleteConversation = useMutation({
    mutationFn: async () => {
      await api.delete(`support/conversations/${id}/delete/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-conversations-admin"] });
      qc.invalidateQueries({ queryKey: ["support-conversation-admin", id] });
      qc.invalidateQueries({ queryKey: ["support-messages-admin", id] });
      safeGoBack(navigation, { stack: "DashboardSupport" });
    },
    onError: (err) =>
      Alert.alert(
        t("common.errorTitle", "خطأ"),
        parseApiError(err, t("dashboard.supportChatDeleteError", "تعذر حذف المحادثة."))
      ),
  });

  const chatTitle = useMemo(
    () => conversation?.owner_name || owner_name || subject || `${t("dashboard.conversationLabel", "محادثة")} #${id}`,
    [conversation?.owner_name, owner_name, subject, id]
  );

  return (
    <Screen scrollable={false} style={{ backgroundColor: "#f5f7fb" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.chatPane}>
          <View style={styles.chatHeader}>
            <Pressable onPress={() => safeGoBack(navigation, { stack: "DashboardSupport" })} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={theme.palette.accent} />
            </Pressable>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={styles.chatTitle}>{chatTitle}</Text>
              <Text style={styles.helper}>{subject || t("dashboard.supportChatHelper", "دردشة دعم")}</Text>
              {is_guest && guest_email ? (
                <Text style={styles.helper}>
                  {t("dashboard.supportChatGuestEmail", "بريد الضيف")}: {guest_email}
                </Text>
              ) : null}
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable style={styles.actionBtn} onPress={() => closeConversation.mutate()} disabled={(closeConversation as any).isLoading}>
                {(closeConversation as any).isLoading ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                )}
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => deleteConversation.mutate()} disabled={(deleteConversation as any).isLoading}>
                {(deleteConversation as any).isLoading ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                )}
              </Pressable>
            </View>
          </View>

          {msgLoading ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
              {messages.map((m) => {
                const isStaff = m.sender_role === "staff" || m.sender_type === "agent";
                return (
                  <View key={m.id} style={[styles.bubbleRow, isStaff ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
                    <View style={[styles.avatar, isStaff ? styles.avatarStaff : styles.avatarCustomer]}>
                      <Ionicons name={isStaff ? "shield-checkmark" : "person"} size={16} color="#fff" />
                    </View>
                    <View style={[styles.bubble, isStaff ? styles.bubbleStaff : styles.bubbleCustomer]}>
                      <Text style={[styles.bubbleText, isStaff && { color: "#fff" }]}>{safeText(m.text || m.content || m.message)}</Text>
                      <Text style={styles.bubbleMeta}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder={t("dashboard.supportChatPlaceholder", "اكتب رسالتك...")}
              value={reply}
              onChangeText={setReply}
              multiline
              textAlign="right"
            />
            <Pressable
              onPress={() => sendMessage.mutate()}
              style={[styles.sendBtn, { backgroundColor: theme.palette.accent }]}
              disabled={!reply.trim() || (sendMessage as any).isLoading}
            >
              {(sendMessage as any).isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  chatPane: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    borderRadius: 16,
    padding: 10,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chatTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "auto",
  },
  helper: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "auto",
  },
  messages: {
    paddingVertical: 6,
    paddingBottom: 16,
    gap: 10,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  bubbleRowRight: {
    justifyContent: "flex-end",
  },
  bubbleRowLeft: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarStaff: {
    backgroundColor: "#F59E0B",
  },
  avatarCustomer: {
    backgroundColor: "#94a3b8",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleStaff: {
    backgroundColor: "#F59E0B",
  },
  bubbleCustomer: {
    backgroundColor: "#fff",
  },
  bubbleText: {
    color: "#111827",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "auto",
  },
  bubbleMeta: {
    marginTop: 6,
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "auto",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    color: "#0f172a",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default DashboardSupportChat;

