import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import CurrencyAmount from "../../components/CurrencyAmount";
import DashboardShell from "./components/DashboardShell";

type OrderStats = {
  total_orders?: number;
  pending_orders?: number;
  preparing_orders?: number;
  ready_orders?: number;
  completed_orders?: number;
  revenue?: number;
};

type InventorySummary = {
  total_items?: number;
  low_stock_items?: number;
  out_of_stock_items?: number;
};

const DashboardHome: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { user, permissions } = useAuth();

  const { data: orderStats } = useQuery<OrderStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("orders/dashboard-stats/");
      return res.data;
    },
  });

  const { data: inventory } = useQuery<InventorySummary>({
    queryKey: ["inventory-summary"],
    queryFn: async () => {
      const res = await api.get("orders/pos/inventory/summary/");
      return res.data;
    },
  });

  const isManager = user?.role === "manager";
  const isSupervisor = user?.role === "supervisor";
  const isStaff = user?.role === "staff";

  const can = (perm: string) => {
    if (isManager || isSupervisor) return true;
    if (!permissions) return false;
    // @ts-ignore
    return !!permissions[perm as keyof typeof permissions];
  };

  const showOrders = can("can_manage_orders") || can("can_view_dashboard");
  const showInventory = can("can_manage_inventory");
  const showProducts = can("can_manage_products") || can("can_manage_categories");
  const showSupport = can("can_manage_contact_messages") || can("can_manage_support") || can("can_view_user_activity");
  const showUsers = can("can_manage_users");
  // HR console is intentionally omitted on mobile (web-only).
  const showHR = false;

  return (
    <DashboardShell
      title="لوحة تحكم المتجر"
      subtitle="نظرة سريعة على الطلبات، المخزون، والدعم مع وصول سريع للصفحات الإدارية."
      contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
    >

        {showOrders && (
          <Card style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>أرقام الطلبات</Text>
            <View style={styles.statsRow}>
              <Stat label="إجمالي الطلبات" value={orderStats?.total_orders} />
              <Stat label="بانتظار المعالجة" value={orderStats?.pending_orders} />
              <Stat label="قيد التجهيز" value={orderStats?.preparing_orders} />
              <Stat label="جاهز" value={orderStats?.ready_orders} />
              <Stat label="مكتمل" value={orderStats?.completed_orders} />
              <Stat label="الإيرادات" value={orderStats?.revenue} isCurrency />
            </View>
            <Button title="إدارة الطلبات" onPress={() => navigation.navigate("DashboardOrders")} />
          </Card>
        )}

        {showInventory && (
          <Card style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>المخزون</Text>
            <View style={styles.statsRow}>
              <Stat label="عدد الأصناف" value={inventory?.total_items} />
              <Stat label="قارب على النفاد" value={inventory?.low_stock_items} />
              <Stat label="غير متوفر" value={inventory?.out_of_stock_items} />
            </View>
            <Button title="إدارة المخزون" variant="secondary" onPress={() => navigation.navigate("DashboardInventory")} />
          </Card>
        )}

        {showProducts && (
          <Card style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>الأصناف والتصنيفات</Text>
            <View style={styles.linksGrid}>
              {can("can_manage_products") && <Button title="إدارة المنتجات" onPress={() => navigation.navigate("DashboardProducts")} />}
              {can("can_manage_categories") && (
                <Button title="التصنيفات والتصنيفات الفرعية" variant="secondary" onPress={() => navigation.navigate("DashboardCategories")} />
              )}
            </View>
          </Card>
        )}

        {showSupport && (
          <Card style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>الدعم والرسائل</Text>
            <View style={styles.linksGrid}>
              {can("can_manage_contact_messages") && <Button title="رسائل التواصل" onPress={() => navigation.navigate("DashboardMessages")} />}
              {can("can_manage_support") && <Button title="تذاكر الدعم" onPress={() => navigation.navigate("DashboardSupport")} />}
              {can("can_view_user_activity") && <Button title="سجل النشاط" onPress={() => navigation.navigate("DashboardLogs")} />}
            </View>
          </Card>
        )}

        {showUsers && (
          <Card style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>المستخدمون والصلاحيات</Text>
            <View style={styles.linksGrid}>
              {can("can_manage_users") && <Button title="إدارة المستخدمين" onPress={() => navigation.navigate("DashboardUsers")} />}
              {can("can_manage_users") && (
                <Button title="الأدوار والصلاحيات" variant="secondary" onPress={() => navigation.navigate("DashboardRolePermissions")} />
              )}
            </View>
          </Card>
        )}

        {showHR && (
          <Card style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>الموارد البشرية</Text>
            <View style={styles.linksGrid}>
              <Button title="وثائق الموارد البشرية" variant="secondary" onPress={() => navigation.navigate("DashboardHRDocuments")} />
              <Button title="الطلبات الداخلية" onPress={() => navigation.navigate("DashboardHRRequests")} />
            </View>
          </Card>
        )}
    </DashboardShell>
  );
};

const Stat: React.FC<{ label: string; value: number | string | undefined; suffix?: string; isCurrency?: boolean }> = ({ label, value, suffix, isCurrency }) => (
  <View style={styles.statBox}>
    {isCurrency ? (
      <CurrencyAmount value={value ?? "-"} color="#111827" symbolSize={14} textStyle={styles.statValue} />
    ) : (
      <Text style={styles.statValue}>
        {value ?? "-"} {suffix || ""}
      </Text>
    )}
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  headline: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
  },
  helper: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statBox: {
    minWidth: 110,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "flex-end",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  linksGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
});

export default DashboardHome;
