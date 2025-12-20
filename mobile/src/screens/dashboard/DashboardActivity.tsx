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
import { has } from "./components/permissions";

type ActivityRow = {
  id: number;
  order?: number;
  action?: string;
  created_at: string;
  notes?: string;
};

const DashboardActivity: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, permissions } = useAuth();
  const allowed = has(user, permissions, "can_view_activity_log");

  const { data: activities = [], isLoading } = useQuery<ActivityRow[]>({
    queryKey: ["dashboard", "orders-activity"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/activity-log/");
      return res.data?.results || res.data || [];
    },
  });

  if (!allowed) {
    return <DashboardAccessDenied title="سجل الطلبات" subtitle="متابعة آخر الأحداث المرتبطة بالطلبات." />;
  }

  return (
    <DashboardShell title="سجل الطلبات" subtitle="متابعة آخر الأحداث المرتبطة بالطلبات.">
      <DashboardSection title="الأنشطة" subtitle={isLoading ? "جاري التحميل..." : "آخر 50 نشاطاً."}>
        {activities.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا يوجد نشاط.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {activities.slice(0, 50).map((a) => (
              <DashboardListItem
                key={a.id}
                title={a.action?.trim() ? a.action : "نشاط"}
                subtitle={`${a.order ? `طلب #${a.order}` : "—"} • ${new Date(a.created_at).toLocaleString()}${a.notes ? ` • ${a.notes}` : ""}`}
                icon="time-outline"
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

export default DashboardActivity;
