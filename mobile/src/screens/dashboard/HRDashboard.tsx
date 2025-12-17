import React from "react";
import { Text, StyleSheet, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import HRStatBadge from "./components/HRStatBadge";

type HRStats = {
  employees?: number;
  active_leaves?: number;
  alerts?: number;
};

const HRDashboard: React.FC = () => {
  const theme = useTheme();
  const { data: stats } = useQuery<HRStats>({
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
          <Text style={styles.title}>لوحة الموارد البشرية</Text>
          <Text style={styles.helper}>نظرة سريعة على الموظفين والإجازات والتنبيهات.</Text>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
          <Button title="إضافة موظف" onPress={() => {}} />
          <Button title="تسجيل حضور" variant="secondary" onPress={() => {}} />
          <Button title="استعراض العقود" variant="ghost" onPress={() => {}} />
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>إحصاءات HR</Text>
          <View style={styles.statsRow}>
            <HRStatBadge label="عدد الموظفين" value={stats?.employees ?? "-"} />
            <HRStatBadge label="إجازات نشطة" value={stats?.active_leaves ?? "-"} color="#f59e0b" />
            <HRStatBadge label="تنبيهات" value={stats?.alerts ?? "-"} color="#ef4444" />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>ملاحظات</Text>
          <Text style={styles.helper}>يمكن توصيل هذه الأزرار بشاشات HR التفصيلية (الحضور، العقود، التنبيهات) فور تجهيزها في الواجهة.</Text>
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
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

export default HRDashboard;
