import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import StatBadge from "./components/StatBadge";
import CurrencyAmount from "../../components/CurrencyAmount";

type DashboardStats = {
  total_orders: number;
  pending_orders: number;
  preparing_orders: number;
  ready_orders: number;
  completed_orders: number;
  revenue?: number;
};

type OrderRow = {
  id: number;
  total: number;
  status: string;
  created_at: string;
  payment_method?: string;
};

const statusOptions = [
  { value: "pending", label: "قيد المراجعة" },
  { value: "confirmed", label: "مؤكد" },
  { value: "preparing", label: "قيد التحضير" },
  { value: "ready", label: "جاهز" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
];

const DashboardOrders: React.FC = () => {
  const theme = useTheme();
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("orders/dashboard-stats/");
      return res.data;
    },
  });

  const { data: orders } = useQuery<OrderRow[]>({
    queryKey: ["dashboard-orders", filterStatus],
    queryFn: async () => {
      const res = await api.get("orders/", {
        params: filterStatus ? { status: filterStatus } : undefined,
      });
      return res.data.results || res.data;
    },
  });

  const updateStatus = async (orderId: number, status: string) => {
    try {
      setUpdating(true);
      await api.patch(`orders/${orderId}/`, { status });
      qc.invalidateQueries({ queryKey: ["dashboard-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch {
      Alert.alert("خطأ", "تعذر تحديث حالة الطلب.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text style={styles.title}>إحصائيات الطلبات</Text>
          <View style={styles.statsRow}>
            <StatBadge label="إجمالي" value={stats?.total_orders ?? "-"} />
            <StatBadge label="قيد الانتظار" value={stats?.pending_orders ?? "-"} color="#f59e0b" />
            <StatBadge label="قيد التحضير" value={stats?.preparing_orders ?? "-"} color="#3b82f6" />
            <StatBadge label="جاهز" value={stats?.ready_orders ?? "-"} color="#10b981" />
            <StatBadge label="مكتمل" value={stats?.completed_orders ?? "-"} color="#16a34a" />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>تصفية الحالة</Text>
          <Button title="كل الحالات" onPress={() => setFilterStatus(null)} />
          <Button title="طلبات معلقة" variant="secondary" onPress={() => setFilterStatus("pending")} />
          <Button title="طلبات قيد التحضير" variant="secondary" onPress={() => setFilterStatus("preparing")} />
          <Button title="طلبات مكتملة" variant="secondary" onPress={() => setFilterStatus("completed")} />
          <Button title="طلبات ملغاة" variant="secondary" onPress={() => setFilterStatus("cancelled")} />
          <Button title="طلبات مؤكدة" variant="secondary" onPress={() => setFilterStatus("confirmed")} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>أحدث الطلبات</Text>
          {orders && orders.length > 0 && (
            <View style={{ marginTop: 8, gap: 10 }}>
              {orders.slice(0, 5).map((order) => (
                <View key={order.id} style={styles.orderRow}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.orderTitle}>طلب #{order.id}</Text>
                    <Text style={styles.orderSub}>
                      {order.status} ? {new Date(order.created_at).toLocaleString()}
                    </Text>
                    {order.payment_method ? <Text style={styles.orderSub}>الدفع: {order.payment_method}</Text> : null}
                  </View>
                  <CurrencyAmount value={order.total} color="#111827" symbolSize={14} textStyle={styles.orderPrice} />
                </View>
              ))}
            </View>
          )}
          {orders && orders.length === 0 && <Text style={styles.helper}>لا توجد طلبات بعد.</Text>}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
          {orders?.slice(0, 5).map((order) => (
            <View key={order.id} style={[styles.orderRow, { borderBottomWidth: 0, alignItems: "flex-start" }]}>
              <View style={{ flex: 1, alignItems: "flex-end", gap: 4 }}>
                <Text style={styles.orderTitle}>طلب #{order.id}</Text>
                <Text style={styles.orderSub}>الحالة الحالية: {order.status}</Text>
                <View style={styles.statusChips}>
                  {statusOptions.map((s) => (
                    <Button
                      key={s.value}
                      title={s.label}
                      variant={order.status === s.value ? "primary" : "ghost"}
                      onPress={() => updateStatus(order.id, s.value)}
                      disabled={updating}
                    />
                  ))}
                </View>
              </View>
            </View>
          ))}
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
    marginTop: 8,
  },
  orderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  orderSub: {
    fontSize: 12,
    color: "#6b7280",
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 8,
  },
  statusChips: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
  },
});

export default DashboardOrders;

