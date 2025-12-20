import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import StatBadge from "./components/StatBadge";
import { has, hasAny } from "./components/permissions";

type OrderStats = {
  total_orders?: number;
  completed_orders?: number;
  pending_orders?: number;
  revenue?: number;
};

type HRStats = {
  employees?: number;
  active_leaves?: number;
  alerts?: number;
};

const DashboardReports: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, permissions } = useAuth();

  const allowed = has(user, permissions, "can_view_dashboard");
  const canHR = hasAny(user, permissions, [
    "can_view_hr_dashboard",
    "can_manage_employees",
    "can_manage_attendance",
    "can_manage_hr_leaves",
    "can_manage_hr_payroll",
    "can_manage_hr_documents",
    "can_manage_hr_reports",
    "can_manage_hr_work_reports",
    "can_view_hr_performance",
  ]);

  const { data: orderStats } = useQuery<OrderStats>({
    queryKey: ["dashboard", "orders-stats"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/dashboard-stats/");
      return res.data;
    },
  });

  const { data: hrStats } = useQuery<HRStats>({
    queryKey: ["dashboard", "hr-stats"],
    enabled: canHR,
    queryFn: async () => {
      const res = await api.get("hr/dashboard/stats/");
      return res.data;
    },
  });

  if (!allowed) {
    return <DashboardAccessDenied title="التقارير" subtitle="ملخصات سريعة للطلبات والموارد البشرية." />;
  }

  return (
    <DashboardShell title="التقارير" subtitle="ملخصات سريعة للطلبات والموارد البشرية.">
      <DashboardSection title="الطلبات" subtitle="مؤشرات عامة عن الطلبات والإيراد.">
        <View style={styles.row}>
          <StatBadge label="كل الطلبات" value={orderStats?.total_orders ?? "-"} color={theme.palette.accentSoft} />
          <StatBadge label="مكتمل" value={orderStats?.completed_orders ?? "-"} color={theme.palette.success} />
          <StatBadge label="قيد الانتظار" value={orderStats?.pending_orders ?? "-"} color={theme.palette.accent} />
        </View>
        <View style={styles.row}>
          <StatBadge label="الإيراد" value={orderStats?.revenue ?? "-"} color="#0ea5e9" />
        </View>
      </DashboardSection>

      <DashboardSection title="الموارد البشرية" subtitle="ملخص HR (إن كان مفعّلًا لديك).">
        <View style={styles.row}>
          <StatBadge label="الموظفون" value={hrStats?.employees ?? "-"} color={theme.palette.accentSoft} />
          <StatBadge label="إجازات نشطة" value={hrStats?.active_leaves ?? "-"} color={theme.palette.accent} />
          <StatBadge label="تنبيهات" value={hrStats?.alerts ?? "-"} color={theme.palette.danger} />
        </View>
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 10,
    },
  });

export default DashboardReports;
