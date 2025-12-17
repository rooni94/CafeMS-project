import React from "react";
import { Text, StyleSheet, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Screen from "../../components/Screen";
import { Card } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";

type ActivityRow = {
  id: number;
  order?: number;
  action?: string;
  created_at: string;
  notes?: string;
};

const DashboardActivity: React.FC = () => {
  const theme = useTheme();
  const { data: activities } = useQuery<ActivityRow[]>({
    queryKey: ["order-activity"],
    queryFn: async () => {
      const res = await api.get("orders/activity-log/");
      return res.data.results || res.data;
    },
  });

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text style={styles.title}>سجل نشاط الطلبات</Text>
          <Text style={styles.helper}>أحدث العمليات التي تمت على الطلبات.</Text>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>النشاط</Text>
          {activities && activities.length > 0 ? (
            <View style={{ marginTop: 8, gap: 10 }}>
              {activities.slice(0, 20).map((a) => (
                <View key={a.id} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.action}>{a.action || "إجراء"}</Text>
                    <Text style={styles.sub}>
                      {a.order ? `طلب #${a.order}` : "—"} ? {new Date(a.created_at).toLocaleString()}
                    </Text>
                    {a.notes ? <Text style={styles.sub}>{a.notes}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>لا يوجد نشاط حتى الآن.</Text>
          )}
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
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  action: {
    fontSize: 14,
    fontWeight: "700",
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
  },
});

export default DashboardActivity;
