import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View, I18nManager } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import DashboardListItem from "./components/DashboardListItem";
import { has } from "./components/permissions";
import { useI18n } from "../../i18n";

type ContactMessage = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  is_read?: boolean;
};

const DashboardMessages: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();
  const { t } = useI18n();

  const allowed = has(user, permissions, "can_manage_contact_messages");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const { data: messages = [], isLoading } = useQuery<ContactMessage[]>({
    queryKey: ["dashboard", "contact-messages"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("contact/messages/");
      return res.data?.results || res.data || [];
    },
  });

  const selected = useMemo(() => messages.find((m) => m.id === selectedId) || null, [messages, selectedId]);

  const sendReply = async () => {
    if (!selectedId || !reply.trim()) {
      Alert.alert(
        t("dashboard.messagesMissingTitle", "بيانات ناقصة"),
        t("dashboard.messagesMissingBody", "اختر رسالة واكتب الرد.")
      );
      return;
    }
    setSending(true);
    try {
      await api.post(`contact/messages/${selectedId}/reply/`, { reply: reply.trim() });
      setReply("");
      qc.invalidateQueries({ queryKey: ["dashboard", "contact-messages"] });
      Alert.alert(
        t("dashboard.messagesSentTitle", "تم الإرسال"),
        t("dashboard.messagesSentBody", "تم إرسال الرد بنجاح.")
      );
    } catch {
      Alert.alert(
        t("dashboard.messagesSendErrorTitle", "تعذر الإرسال"),
        t("dashboard.messagesSendErrorBody", "حدث خطأ أثناء إرسال الرد.")
      );
    } finally {
      setSending(false);
    }
  };

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title={t("dashboard.messagesTitle", "رسائل التواصل")}
        subtitle={t("dashboard.messagesSubtitle", "قراءة الرسائل والرد عليها من لوحة التحكم.")}
      />
    );
  }

  return (
    <DashboardShell title={t("dashboard.messagesTitle", "رسائل التواصل")} subtitle={t("dashboard.messagesSubtitle", "قراءة الرسائل والرد عليها من لوحة التحكم.")}>
      <DashboardSection title={t("dashboard.messagesListTitle", "الرسائل")} subtitle={isLoading ? t("common.loading", "جاري التحميل...") : t("dashboard.messagesListSubtitle", "اضغط على رسالة لعرض التفاصيل.")}>
        {messages.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>{t("dashboard.messagesEmpty", "لا توجد رسائل.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {messages.slice(0, 40).map((msg) => (
              <DashboardListItem
                key={msg.id}
                title={msg.subject?.trim() ? msg.subject : t("dashboard.messagesNoSubject", "بدون عنوان")}
                subtitle={`${msg.name || t("dashboard.messagesUnknown", "غير معروف")} • ${
                  msg.email || msg.phone || t("dashboard.messagesNoContact", "لا يوجد تواصل")
                }${msg.message ? ` • ${msg.message}` : ""}`}
                icon="mail-unread-outline"
                onPress={() => setSelectedId(msg.id)}
                style={selectedId === msg.id ? { borderColor: theme.palette.accentSoft, backgroundColor: theme.palette.surfaceAlt } : undefined}
                right={
                  <View style={[styles.badge, { backgroundColor: msg.is_read ? theme.palette.border : `${theme.palette.accent}22` }]}>
                    <Text style={[styles.badgeText, { color: theme.palette.text }]}>
                      {msg.is_read ? t("dashboard.messagesRead", "مقروءة") : t("dashboard.messagesNew", "جديدة")}
                    </Text>
                  </View>
                }
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title={t("dashboard.messagesReplyTitle", "تفاصيل ورد")} subtitle={selected ? t("dashboard.messagesReplySubtitle", "اكتب الرد ثم إرسال.") : t("dashboard.messagesSelectPrompt", "اختر رسالة من الأعلى.")}>
        {selected ? (
          <View style={{ gap: 10 }}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.palette.muted }]}>{t("dashboard.messagesSenderLabel", "المرسل")}</Text>
              <Text style={[styles.detailVal, { color: theme.palette.text }]}>{selected.name || "-"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.palette.muted }]}>{t("dashboard.messagesContactLabel", "التواصل")}</Text>
              <Text style={[styles.detailVal, { color: theme.palette.text }]}>{selected.email || selected.phone || "-"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.palette.muted }]}>{t("dashboard.messagesSubjectLabel", "الموضوع")}</Text>
              <Text style={[styles.detailVal, { color: theme.palette.text }]}>{selected.subject || "-"}</Text>
            </View>
            {selected.message ? (
              <View>
                <Text style={[styles.detailKey, { color: theme.palette.muted, marginBottom: 6 }]}>{t("dashboard.messagesBodyLabel", "نص الرسالة")}</Text>
                <Text style={[styles.messageBody, { color: theme.palette.text }]}>{selected.message}</Text>
              </View>
            ) : null}

            <Input label={t("dashboard.messagesReplyLabel", "الرد")} value={reply} onChangeText={setReply} multiline numberOfLines={4} placeholder={t("dashboard.messagesReplyPlaceholder", "اكتب الرد هنا...")} />
            <Button title={sending ? t("common.sending", "جارٍ الإرسال...") : t("dashboard.messagesSendReply", "إرسال الرد")} onPress={sendReply} disabled={sending} />
          </View>
        ) : (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>{t("dashboard.messagesSelectFirst", "اختر رسالة أولاً.")}</Text>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    empty: {
      textAlign: I18nManager.isRTL ? "right" : "left",
      fontSize: 13,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "800",
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    detailKey: {
      fontSize: 12,
      fontWeight: "800",
    },
    detailVal: {
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "left",
    },
    messageBody: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: I18nManager.isRTL ? "right" : "left",
    },
  });

export default DashboardMessages;
