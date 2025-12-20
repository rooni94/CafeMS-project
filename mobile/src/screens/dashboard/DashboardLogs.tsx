import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import DashboardListItem from "./components/DashboardListItem";
import { hasAny } from "./components/permissions";

type UserLog = {
  id: number;
  action?: string;
  created_at?: string;
  user?: { username?: string };
  ip_address?: string;
};

type SupportLog = {
  id: number;
  action?: string;
  created_at?: string;
  conversation?: number;
  actor?: string;
};

const DashboardLogs: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, permissions } = useAuth();

  const canViewUsers = hasAny(user, permissions, ["can_view_user_activity", "can_view_activity_log"]);
  const canViewSupport = hasAny(user, permissions, ["can_manage_support", "can_view_activity_log"]);
  const allowed = canViewUsers || canViewSupport;

  const { data: userLogs = [], isLoading: usersLoading } = useQuery<UserLog[]>({
    queryKey: ["dashboard", "user-activity"],
    enabled: canViewUsers,
    queryFn: async () => {
      const res = await api.get("auth/user-activity/");
      return res.data?.results || res.data || [];
    },
  });

  const { data: supportLogs = [], isLoading: supportLoading } = useQuery<SupportLog[]>({
    queryKey: ["dashboard", "support-activity"],
    enabled: canViewSupport,
    queryFn: async () => {
      const res = await api.get("support/activities/");
      return res.data?.results || res.data || [];
    },
  });

  if (!allowed) {
    return <DashboardAccessDenied title="السجلات" subtitle="سجل المستخدمين وسجل الدعم." />;
  }

  return (
    <DashboardShell title="السجلات" subtitle="سجل المستخدمين وسجل الدعم.">
      <DashboardSection title="سجل المستخدمين" subtitle={usersLoading ? "جاري التحميل..." : "آخر الأحداث المسجلة."}>
        {userLogs.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا يوجد سجل مستخدمين.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {userLogs.slice(0, 40).map((log) => (
              <DashboardListItem
                key={log.id}
                title={log.action?.trim() ? log.action : "حدث"}
                subtitle={`${log.user?.username || "—"} • ${log.ip_address || "—"} • ${log.created_at ? new Date(log.created_at).toLocaleString() : "—"}`}
                icon="person-outline"
              />
            ))}
          </View>
        )}
      </DashboardSection>

      <DashboardSection title="سجل الدعم" subtitle={supportLoading ? "جاري التحميل..." : "آخر الأحداث المرتبطة بالدعم."}>
        {supportLogs.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا يوجد سجل دعم.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {supportLogs.slice(0, 40).map((log) => (
              <DashboardListItem
                key={log.id}
                title={log.action?.trim() ? log.action : "حدث"}
                subtitle={`محادثة #${log.conversation ?? "-"} • ${log.actor || "—"} • ${log.created_at ? new Date(log.created_at).toLocaleString() : "—"}`}
                icon="chatbubble-ellipses-outline"
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
  });

export default DashboardLogs;
