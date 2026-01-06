// mobile/src/screens/dashboard/DashboardSupport.tsx
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardListItem from "./components/DashboardListItem";
import DashboardSection from "./components/DashboardSection";
import DashboardShell from "./components/DashboardShell";
import { has } from "./components/permissions";
import { useI18n } from "../../i18n";

type Conversation = {
  id: number;
  owner_name?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  is_guest?: boolean;
  guest_name?: string | null;
  guest_email?: string | null;
  created_at?: string;
  last_message_at?: string | null;
  unread_for_support?: boolean;
  is_closed?: boolean;
};

const DashboardSupport: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, permissions } = useAuth();
  const { t } = useI18n();
  const allowed = has(user, permissions, "can_manage_support");

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["dashboard", "support-conversations"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("support/conversations/");
      return res.data?.results || res.data || [];
    },
  });

  const normalizeDisplayText = (val?: string | null) => {
    const text = (val || "").trim();
    if (!text) return null;
    if (text === "زائر" || text === "ضيف") return null;
    return text;
  };

  const getDisplayName = (c: Conversation) => {
    if (c.is_guest) {
      return (
        normalizeDisplayText(c.guest_name) ||
        normalizeDisplayText(c.customer_name) ||
        normalizeDisplayText(c.guest_email) ||
        normalizeDisplayText(c.customer_email) ||
        t("dashboard.supportGuestLabel", "ضيف")
      );
    }
    return (
      normalizeDisplayText(c.owner_name) ||
      normalizeDisplayText(c.customer_name) ||
      normalizeDisplayText(c.customer_email) ||
      t("dashboard.supportUserLabel", "مستخدم")
    );
  };

  const getSubtitle = (c: Conversation) => {
    const email = c.is_guest ? (c.guest_email || c.customer_email) : c.customer_email;
    const when = c.last_message_at || c.created_at;
    const parts = [
      email ? (c.is_guest ? `${t("dashboard.supportGuestLabel", "ضيف")}: ${email}` : `${t("dashboard.supportEmailLabel", "البريد")}: ${email}`) : null,
      when ? new Date(when).toLocaleString() : null,
      `#${c.id}`,
      c.is_closed ? t("dashboard.supportClosed", "مغلقة") : null,
    ].filter(Boolean) as string[];
    return parts.join(" • ");
  };

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title={t("dashboard.supportConversationsTitle", "محادثات الدعم")}
        subtitle={t("dashboard.supportAccessDenied", "لا تملك صلاحية الوصول لمحادثات الدعم.")}
      />
    );
  }

  return (
    <DashboardShell title={t("dashboard.supportConversationsTitle", "محادثات الدعم")} subtitle={t("dashboard.supportConversationsSubtitle", "تابع محادثات الدعم مع العملاء والضيوف.")}>
      <DashboardSection
        title={t("dashboard.supportConversationsListTitle", "المحادثات")}
        subtitle={isLoading ? t("dashboard.supportLoading", "جاري تحميل المحادثات...") : t("dashboard.supportListSubtitle", "اضغط على محادثة لفتحها والرد.")}
      >
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.palette.accent} />
            <Text style={[styles.loadingText, { color: theme.palette.muted }]}>{t("common.loading", "جاري التحميل...")}</Text>
          </View>
        ) : conversations.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>{t("dashboard.supportEmpty", "لا توجد محادثات حالياً.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {conversations.slice(0, 80).map((c) => {
              const displayName = getDisplayName(c);
              return (
                <DashboardListItem
                  key={c.id}
                  title={displayName}
                  subtitle={getSubtitle(c)}
                  icon="chatbubbles-outline"
                  onPress={() =>
                    navigation.navigate("DashboardSupportChat", {
                      id: c.id,
                      owner_name: displayName,
                      is_guest: !!c.is_guest,
                      guest_email: c.is_guest ? c.guest_email || c.customer_email || undefined : undefined,
                    })
                  }
                  right={
                    c.unread_for_support ? (
                      <View style={[styles.dot, { backgroundColor: theme.palette.danger }]} />
                    ) : undefined
                  }
                />
              );
            })}
          </View>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    empty: {
      textAlign: "right",
      fontSize: 13,
      writingDirection: "rtl",
    },
    loadingRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 10,
    },
    loadingText: {
      fontSize: 13,
      textAlign: "right",
      writingDirection: "rtl",
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
  });

export default DashboardSupport;
