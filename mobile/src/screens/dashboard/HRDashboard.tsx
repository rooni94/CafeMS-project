import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import HRStatBadge from "./components/HRStatBadge";
import DashboardShell from "./components/DashboardShell";
import DashboardSection from "./components/DashboardSection";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import { hasAny } from "./components/permissions";
import { useI18n } from "../../i18n";

type HRStats = {
  employees?: number;
  active_leaves?: number;
  alerts?: number;
};

const HRDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const { user, permissions } = useAuth();

  const allowed = hasAny(user, permissions, [
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

  const { data: stats } = useQuery<HRStats>({
    queryKey: ["dashboard", "hr-stats"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("hr/dashboard/stats/");
      return res.data;
    },
  });

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title={t("dashboard.hrDashboardTitle", "لوحة الموارد البشرية")}
        subtitle={t("dashboard.hrDashboardSubtitle", "ملخص سريع وروابط سريعة للطلبات والوثائق.")}
      />
    );
  }

  return (
    <DashboardShell
      title={t("dashboard.hrDashboardTitle", "لوحة الموارد البشرية")}
      subtitle={t("dashboard.hrDashboardSubtitle", "ملخص سريع وروابط سريعة للطلبات والوثائق.")}
    >
      <DashboardSection title={t("dashboard.hrDashboardSummaryTitle", "ملخص")} subtitle={t("dashboard.hrDashboardSummarySubtitle", "قد تختلف البيانات حسب صلاحياتك.")}>
        <View style={styles.statsRow}>
          <HRStatBadge label={t("dashboard.hrDashboardEmployees", "الموظفون")} value={stats?.employees ?? "-"} color={theme.palette.accentSoft} />
          <HRStatBadge label={t("dashboard.hrDashboardActiveLeaves", "إجازات نشطة")} value={stats?.active_leaves ?? "-"} color={theme.palette.accent} />
          <HRStatBadge label={t("dashboard.hrDashboardAlerts", "تنبيهات")} value={stats?.alerts ?? "-"} color={theme.palette.danger} />
        </View>
      </DashboardSection>

      <DashboardSection title={t("dashboard.hrDashboardLinksTitle", "روابط سريعة")} subtitle={t("dashboard.hrDashboardLinksSubtitle", "انتقل مباشرة إلى ما تحتاجه.")}>
        <View style={styles.actions}>
          <Button
            title={t("dashboard.hrDashboardDocsButton", "وثائق الموارد البشرية")}
            variant="secondary"
            onPress={() => navigation.navigate("DashboardHRDocuments")}
          />
          <Button title={t("dashboard.hrDashboardRequestsButton", "طلبات الموارد البشرية")} onPress={() => navigation.navigate("DashboardHRRequests")} />
        </View>
        <Text style={[styles.note, { color: theme.palette.muted }]}>
          {t(
            "dashboard.hrDashboardNote",
            "بعض ميزات الموارد البشرية قد تكون متاحة بشكل كامل على نسخة الويب فقط حسب إعدادات مشروعك."
          )}
        </Text>
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    actions: {
      gap: 10,
    },
    note: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 12,
      lineHeight: 18,
    },
  });

export default HRDashboard;
