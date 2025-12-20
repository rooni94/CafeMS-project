import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import DashboardListItem from "./components/DashboardListItem";
import StatBadge from "./components/StatBadge";
import { hasAny } from "./components/permissions";

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
  { value: "pending", label: "قيد الانتظار" },
  { value: "confirmed", label: "تم التأكيد" },
  { value: "preparing", label: "قيد التجهيز" },
  { value: "ready", label: "جاهز" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
] as const;

const statusLabel = (value: string) => statusOptions.find((s) => s.value === value as any)?.label || value;

const DashboardOrders: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = hasAny(user, permissions, ["can_manage_orders", "can_view_dashboard"]);

  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["dashboard", "orders-stats"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/dashboard-stats/");
      return res.data;
    },
  });

  const { data: orders = [], isLoading } = useQuery<OrderRow[]>({
    queryKey: ["dashboard", "orders", filterStatus],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/", {
        params: filterStatus ? { status: filterStatus } : undefined,
      });
      return res.data?.results || res.data || [];
    },
  });

  const updateStatus = async (orderId: number, status: string) => {
    try {
      setUpdating(true);
      await api.patch(`orders/${orderId}/`, { status });
      qc.invalidateQueries({ queryKey: ["dashboard", "orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "orders-stats"] });
    } catch {
      Alert.alert("تعذر التحديث", "حدث خطأ أثناء تحديث حالة الطلب.");
    } finally {
      setUpdating(false);
    }
  };

  if (!allowed) {
    return <DashboardAccessDenied title="طلبات العملاء" subtitle="متابعة الطلبات وتحديث حالتها بسرعة." />;
  }

  return (
    <DashboardShell title="طلبات العملاء" subtitle="متابعة الطلبات وتحديث حالتها بسرعة.">
      <DashboardSection title="ملخص اليوم" subtitle="أرقام سريعة لمتابعة الأداء.">
        <View style={styles.statsRow}>
          <StatBadge label="كل الطلبات" value={stats?.total_orders ?? "-"} color={theme.palette.accentSoft} />
          <StatBadge label="قيد الانتظار" value={stats?.pending_orders ?? "-"} color={theme.palette.accent} />
          <StatBadge label="قيد التجهيز" value={stats?.preparing_orders ?? "-"} color="#3b82f6" />
        </View>
        <View style={styles.statsRow}>
          <StatBadge label="جاهز" value={stats?.ready_orders ?? "-"} color="#10b981" />
          <StatBadge label="مكتمل" value={stats?.completed_orders ?? "-"} color={theme.palette.success} />
          <View style={[styles.revenueBadge, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
            <CurrencyAmount value={stats?.revenue ?? "-"} color={theme.palette.text} symbolSize={14} textStyle={styles.revenueValue} />
            <Text style={[styles.revenueLabel, { color: theme.palette.muted }]}>الإيراد</Text>
          </View>
        </View>
      </DashboardSection>

      <DashboardSection title="تصفية" subtitle="اختر حالة لعرض الطلبات.">
        <View style={styles.filtersRow}>
          <Button title="الكل" variant={filterStatus == null ? "primary" : "ghost"} onPress={() => setFilterStatus(null)} />
          {statusOptions.map((s) => (
            <Button
              key={s.value}
              title={s.label}
              variant={filterStatus === s.value ? "primary" : "ghost"}
              onPress={() => setFilterStatus(s.value)}
            />
          ))}
        </View>
      </DashboardSection>

      <DashboardSection title="الطلبات" subtitle={isLoading ? "جاري التحميل..." : "اضغط على طلب لتعديل حالته."}>
        {orders.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.palette.muted }]}>لا توجد طلبات مطابقة للتصفية الحالية.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {orders.slice(0, 30).map((order) => {
              const isExpanded = expandedId === order.id;
              const subtitleParts = [
                statusLabel(order.status),
                new Date(order.created_at).toLocaleString(),
                order.payment_method ? `الدفع: ${order.payment_method}` : null,
              ].filter(Boolean);

              return (
                <View key={order.id} style={{ gap: 8 }}>
                  <DashboardListItem
                    title={`طلب #${order.id}`}
                    subtitle={subtitleParts.join(" • ")}
                    icon="receipt-outline"
                    onPress={() => setExpandedId((prev) => (prev === order.id ? null : order.id))}
                    right={<CurrencyAmount value={order.total} color={theme.palette.text} symbolSize={12} textStyle={styles.totalText} />}
                  />

                  {isExpanded ? (
                    <View style={styles.statusWrap}>
                      {statusOptions.map((s) => (
                        <Button
                          key={s.value}
                          title={s.label}
                          variant={order.status === s.value ? "primary" : "secondary"}
                          onPress={() => updateStatus(order.id, s.value)}
                          disabled={updating}
                          style={styles.statusBtn}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    statsRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 10,
    },
    revenueBadge: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      minWidth: 120,
    },
    revenueValue: {
      fontSize: 16,
      fontWeight: "900",
      color: theme.palette.text,
    },
    revenueLabel: {
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
    },
    filtersRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    emptyText: {
      textAlign: "right",
      fontSize: 13,
      lineHeight: 18,
    },
    totalText: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.palette.text,
    },
    statusWrap: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 6,
    },
    statusBtn: {
      borderRadius: 999,
    },
  });

export default DashboardOrders;
