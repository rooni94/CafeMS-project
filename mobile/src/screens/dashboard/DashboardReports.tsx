import React from "react";
import { Text, StyleSheet, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Screen from "../../components/Screen";
import { Card } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import StatBadge from "./components/StatBadge";

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

  const { data: orderStats } = useQuery<OrderStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("orders/dashboard-stats/");
      return res.data;
    },
  });

  const { data: hrStats } = useQuery<HRStats>({
    queryKey: ["hr-dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("hr/dashboard/stats/");
      return res.data;
    },
  });

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text style={styles.title}>تقارير سريعة</Text>
          <Text style={styles.helper}>أرقام موجزة للطلبات والموارد البشرية.</Text>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>الطلبات</Text>
          <StatBadge label="إجمالي الطلبات" value={orderStats?.total_orders ?? "-"} />
          <StatBadge label="مكتملة" value={orderStats?.completed_orders ?? "-"} color="#16a34a" />
          <StatBadge label="قيد الانتظار" value={orderStats?.pending_orders ?? "-"} color="#f59e0b" />
          <StatBadge label="الإيراد" value={orderStats?.revenue ?? "-"} color="#0ea5e9" />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>الموارد البشرية</Text>
          <StatBadge label="عدد الموظفين" value={hrStats?.employees ?? "-"} />
          <StatBadge label="إجازات نشطة" value={hrStats?.active_leaves ?? "-"} color="#f59e0b" />
          <StatBadge label="تنبيهات" value={hrStats?.alerts ?? "-"} color="#ef4444" />
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  helper: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
  },
});

export default DashboardReports;
