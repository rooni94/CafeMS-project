// mobile/src/screens/dashboard/DashboardSupport.tsx
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import DashboardListItem from "./components/DashboardListItem";
import { has } from "./components/permissions";

type Conversation = {
  id: number;
  owner_name?: string;
  subject?: string;
  status?: string;
  is_closed?: boolean;
  updated_at?: string;
  user?: { username?: string; first_name?: string; last_name?: string; email?: string };
  customer_name?: string;
};

const DashboardSupport: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, permissions } = useAuth();
  const allowed = has(user, permissions, "can_manage_support");

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["dashboard", "support-conversations"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("support/conversations/");
      return res.data?.results || res.data || [];
    },
  });

  const getDisplayName = (c: Conversation) => {
    if (c.owner_name && c.owner_name.trim()) return c.owner_name;
    if (c.customer_name && c.customer_name.trim()) return c.customer_name;
    if (c.user) {
      const full = `${c.user.first_name || ""} ${c.user.last_name || ""}`.trim();
      if (full) return full;
      if (c.user.username) return c.user.username;
      if (c.user.email) return c.user.email;
    }
    return "عميل";
  };

  if (!allowed) {
    return <DashboardAccessDenied title="الدعم الفني" subtitle="متابعة محادثات وتذاكر الدعم." />;
  }

  return (
    <DashboardShell title="الدعم الفني" subtitle="متابعة محادثات وتذاكر الدعم من لوحة التحكم.">
      <DashboardSection
        title="التذاكر"
        subtitle={isLoading ? "جاري التحميل..." : "اضغط على تذكرة لفتح المحادثة."}
      >
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.palette.accent} />
            <Text style={[styles.loadingText, { color: theme.palette.muted }]}>جاري التحميل...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد تذاكر.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {conversations.slice(0, 60).map((c) => (
              <DashboardListItem
                key={c.id}
                title={getDisplayName(c)}
                subtitle={`${c.subject?.trim() ? c.subject : "بدون عنوان"} • #${c.id}${
                  c.updated_at ? ` • ${new Date(c.updated_at).toLocaleString()}` : ""
                }`}
                icon="chatbubbles-outline"
                onPress={() =>
                  navigation.navigate("DashboardSupportChat", {
                    id: c.id,
                    owner_name: getDisplayName(c),
                    subject: c.subject,
                  })
                }
              />
            ))}
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
    },
  });

export default DashboardSupport;
