import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList } from "react-native";
import Screen from "../../components/Screen";
import { Card } from "../../components/ui";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

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
  const { user } = useAuth();

  const canManageSupport = ["manager", "supervisor", "staff", "admin"].includes((user?.role as string) || "");

  const { data: conversations = [], isLoading: convLoading } = useQuery<Conversation[]>({
    queryKey: ["support-conversations-admin"],
    enabled: canManageSupport,
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

  if (!canManageSupport) {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>الدعم للموظفين فقط</Text>
          <Text style={styles.helper}>تحتاج صلاحية موظف/مدير لعرض محادثات الدعم.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false} style={{ backgroundColor: "#f1f5f9" }}>
      <View style={styles.container}>
        <View style={styles.listPane}>
          <View style={styles.listHeader}>
            <Text style={styles.title}>طلبات الدعم</Text>
            {convLoading && <ActivityIndicator size="small" color={theme.palette.accent} />}
          </View>
          <FlatList
            data={conversations}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ gap: 8, paddingBottom: 16, flexGrow: 1 }}
            renderItem={({ item }) => {
              return (
                <Pressable
                  style={[styles.convCard]}
                  onPress={() =>
                    navigation.navigate("DashboardSupportChat", {
                      id: item.id,
                      owner_name: getDisplayName(item),
                      subject: item.subject,
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.convName}>{getDisplayName(item)}</Text>
                    <Text style={styles.convSubject}>{item.subject || "بدون عنوان"}</Text>
                  </View>
                  <Ionicons name="chevron-back" size={18} color={"#94a3b8"} />
                </Pressable>
              );
            }}
            ListEmptyComponent={
              convLoading ? null : <Text style={styles.helper}>لا توجد محادثات دعم حالياً.</Text>
            }
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  listPane: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  listHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  convCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  convCardActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  convName: {
    textAlign: "right",
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  convSubject: {
    textAlign: "right",
    fontSize: 12,
    color: "#cbd5e1",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  helper: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "right",
  },
  chatPane: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    borderRadius: 16,
    padding: 10,
  },
  chatEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chatTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  bubbleRowRight: {
    justifyContent: "flex-end",
  },
  bubbleRowLeft: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarStaff: {
    backgroundColor: "#F59E0B",
  },
  avatarCustomer: {
    backgroundColor: "#f59e0b",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleStaff: {
    backgroundColor: "#F59E0B",
  },
  bubbleCustomer: {
    backgroundColor: "#fff",
  },
  bubbleText: {
    color: "#111827",
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleMeta: {
    color: "#cbd5e1",
    fontSize: 11,
    marginTop: 4,
    textAlign: "left",
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    textAlign: "right",
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default DashboardSupport;
