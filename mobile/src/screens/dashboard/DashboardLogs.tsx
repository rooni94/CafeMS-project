import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import DashboardShell from "./components/DashboardShell";

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

  const { data: userLogs } = useQuery<UserLog[]>({
    queryKey: ["user-activity"],
    queryFn: async () => {
      const res = await api.get("auth/user-activity/");
      return res.data.results || res.data;
    },
  });

  const { data: supportLogs } = useQuery<SupportLog[]>({
    queryKey: ["support-activity"],
    queryFn: async () => {
      const res = await api.get("support/activities/");
      return res.data.results || res.data;
    },
  });

  return (
    <DashboardShell title="سجل النشاط" subtitle="سجلات المستخدمين والدعم لمتابعة العمليات.">
        <Card>
          <Text style={styles.title}>سجل النشاط</Text>
          <Text style={styles.helper}>نشاط المستخدمين والدعم لمتابعة العمليات الحساسة.</Text>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>نشاط المستخدمين</Text>
          {userLogs && userLogs.length > 0 ? (
            userLogs.slice(0, 20).map((log) => (
              <View key={log.id} style={styles.row}>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.name}>{log.action || "إجراء"}</Text>
                  <Text style={styles.sub}>
                    {log.user?.username ?? "مستخدم"} ? {log.ip_address || "—"} ?{" "}
                    {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.helper}>لا يوجد سجل حتى الآن.</Text>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>نشاط الدعم</Text>
          {supportLogs && supportLogs.length > 0 ? (
            supportLogs.slice(0, 20).map((log) => (
              <View key={log.id} style={styles.row}>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.name}>{log.action || "إجراء"}</Text>
                  <Text style={styles.sub}>
                    محادثة #{log.conversation ?? "-"} ? {log.actor || "فريق الدعم"} ?{" "}
                    {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.helper}>لا يوجد نشاط للدعم.</Text>
          )}
        </Card>
    </DashboardShell>
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
  name: {
    fontSize: 14,
    fontWeight: "700",
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
  },
});

export default DashboardLogs;
