import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import CurrencyAmount from "../../components/CurrencyAmount";
import { Button } from "../../components/ui";
import { RolePermissions } from "../../types";
import DashboardShell from "./components/DashboardShell";
import DashboardSection from "./components/DashboardSection";
import DashboardTile from "./components/DashboardTile";
import StatBadge from "./components/StatBadge";
import { has, hasAny, isManager } from "./components/permissions";

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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, permissions, accessToken, refreshPermissions } = useAuth();
  const isEmployee = user?.role === "manager" || user?.role === "supervisor" || user?.role === "staff";
  const permissionsLoading = !!accessToken && isEmployee && !isManager(user) && !permissions;

  const can = useCallback((perm: keyof RolePermissions) => has(user, permissions, perm), [user, permissions]);
  const canHR = useCallback(
    () =>
      hasAny(user, permissions, [
        "can_view_hr_dashboard",
        "can_manage_employees",
        "can_manage_attendance",
        "can_manage_hr_leaves",
        "can_manage_hr_payroll",
        "can_manage_hr_documents",
        "can_manage_hr_reports",
        "can_manage_hr_work_reports",
        "can_view_hr_performance",
      ]),
    [user, permissions]
  );

  const { data: orderStats } = useQuery<OrderStats>({
    queryKey: ["dashboard", "orders-stats"],
    enabled: can("can_manage_orders") || can("can_view_dashboard"),
    queryFn: async () => {
      const res = await api.get("orders/dashboard-stats/");
      return res.data;
    },
  });

  const { data: inventory } = useQuery<InventorySummary>({
    queryKey: ["dashboard", "inventory-summary"],
    enabled: can("can_manage_inventory") || can("can_view_dashboard"),
    queryFn: async () => {
      const res = await api.get("orders/pos/inventory/summary/");
      return res.data;
    },
  });

  const tiles = useMemo(
    () =>
      [
        can("can_manage_orders") && {
          title: "طلبات العملاء",
          subtitle: "تتبع الطلبات وتحديث حالتها",
          icon: "receipt-outline" as const,
          onPress: () => navigation.navigate("DashboardOrders"),
          color: theme.palette.accent,
        },
        can("can_manage_products") && {
          title: "المنتجات",
          subtitle: "إضافة وتعديل المنتجات والإضافات",
          icon: "fast-food-outline" as const,
          onPress: () => navigation.navigate("DashboardProducts"),
          color: theme.palette.success,
        },
        (can("can_manage_categories") || can("can_manage_subcategories")) && {
          title: "التصنيفات",
          subtitle: "الفئات والتصنيفات الفرعية",
          icon: "albums-outline" as const,
          onPress: () => navigation.navigate("DashboardCategories"),
          color: theme.palette.accentSoft,
        },
        can("can_manage_inventory") && {
          title: "المخزون",
          subtitle: "تنبيه النواقص وتعديل الكميات",
          icon: "cube-outline" as const,
          onPress: () => navigation.navigate("DashboardInventory"),
          color: "#0ea5e9",
        },
        can("can_manage_tables") && {
          title: "الطاولات",
          subtitle: "إدارة طاولات الصالة",
          icon: "grid-outline" as const,
          onPress: () => navigation.navigate("DashboardTables"),
          color: "#8b5cf6",
        },
        can("can_access_cashier") && {
          title: "الكاشير",
          subtitle: "طلبات نقطة البيع POS",
          icon: "cash-outline" as const,
          onPress: () => navigation.navigate("DashboardPOS"),
          color: "#f97316",
        },
        can("can_manage_loyalty") && {
          title: "برنامج الولاء",
          subtitle: "الإعدادات والمعاملات",
          icon: "sparkles-outline" as const,
          onPress: () => navigation.navigate("DashboardLoyalty"),
          color: "#22c55e",
        },
        can("can_manage_store_settings") && {
          title: "إعدادات المتجر",
          subtitle: "معلومات المتجر والواجهة",
          icon: "settings-outline" as const,
          onPress: () => navigation.navigate("DashboardSettings"),
          color: theme.palette.accentSoft,
        },
        can("can_manage_contact_messages") && {
          title: "رسائل التواصل",
          subtitle: "عرض الرسائل والرد عليها من لوحة التحكم",
          icon: "mail-outline" as const,
          onPress: () => navigation.navigate("DashboardMessages"),
          color: theme.palette.accent,
        },
        can("can_manage_support") && {
          title: "الدعم الفني",
          subtitle: "متابعة محادثات وتذاكر الدعم",
          icon: "chatbubbles-outline" as const,
          onPress: () => navigation.navigate("DashboardSupport"),
          color: "#f97316",
        },
        canHR() && {
          title: "الموارد البشرية",
          subtitle: "لوحة HR والمستندات والطلبات",
          icon: "briefcase-outline" as const,
          onPress: () => navigation.navigate("HRDashboard"),
          color: "#8b5cf6",
        },
        can("can_manage_users") && {
          title: "المستخدمون",
          subtitle: "إدارة المستخدمين والصلاحيات",
          icon: "people-outline" as const,
          onPress: () => navigation.navigate("DashboardUsers"),
          color: "#64748b",
        },
        isManager(user) && {
          title: "الأدوار والصلاحيات",
          subtitle: "تعديل صلاحيات الموظفين",
          icon: "key-outline" as const,
          onPress: () => navigation.navigate("DashboardRolePermissions"),
          color: "#0f172a",
        },
        (can("can_view_activity_log") || can("can_view_user_activity")) && {
          title: "السجلات",
          subtitle: "سجل النشاط وسجل المستخدمين",
          icon: "time-outline" as const,
          onPress: () => navigation.navigate("DashboardLogs"),
          color: "#0f172a",
        },
        can("can_view_dashboard") && {
          title: "التقارير",
          subtitle: "ملخصات وإحصائيات عامة",
          icon: "bar-chart-outline" as const,
          onPress: () => navigation.navigate("DashboardReports"),
          color: "#0ea5e9",
        },
      ].filter(Boolean) as {
        title: string;
        subtitle: string;
        icon: any;
        onPress: () => void;
        color: string;
      }[],
    [can, canHR, navigation, theme.palette]
  );

  return (
    <DashboardShell
      title="لوحة التحكم"
      subtitle="إدارة المتجر والطلبات والمنتجات من مكان واحد."
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <DashboardSection title="نظرة سريعة" subtitle="أرقام مختصرة لمتابعة الحالة الحالية.">
        <View style={styles.statsRow}>
          <StatBadge label="كل الطلبات" value={orderStats?.total_orders ?? "-"} color={theme.palette.accentSoft} />
          <StatBadge label="قيد الانتظار" value={orderStats?.pending_orders ?? "-"} color={theme.palette.accent} />
          <StatBadge label="قيد التجهيز" value={orderStats?.preparing_orders ?? "-"} color="#3b82f6" />
        </View>
        <View style={styles.statsRow}>
          <StatBadge label="جاهز" value={orderStats?.ready_orders ?? "-"} color="#10b981" />
          <StatBadge label="مكتمل" value={orderStats?.completed_orders ?? "-"} color={theme.palette.success} />
          <View style={[styles.revenueBadge, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
            <CurrencyAmount value={orderStats?.revenue ?? "-"} color={theme.palette.text} symbolSize={14} textStyle={styles.revenueValue} />
            <Text style={[styles.revenueLabel, { color: theme.palette.muted }]}>الإيراد</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBadge label="الأصناف" value={inventory?.total_items ?? "-"} color={theme.palette.accentSoft} />
          <StatBadge label="منخفض" value={inventory?.low_stock_items ?? "-"} color={theme.palette.accent} />
          <StatBadge label="نفد" value={inventory?.out_of_stock_items ?? "-"} color={theme.palette.danger} />
        </View>
      </DashboardSection>

      <DashboardSection title="الأقسام" subtitle="اختصر الطريق إلى ما تحتاجه.">
        <View style={styles.tilesGrid}>
          {tiles.length === 0 ? (
            permissionsLoading ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.empty, { color: theme.palette.muted }]}>جاري تحميل الصلاحيات…</Text>
                <Button title="إعادة المحاولة" variant="secondary" onPress={refreshPermissions} />
              </View>
            ) : (
              <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد أقسام متاحة حسب صلاحياتك.</Text>
            )
          ) : (
            tiles.map((t) => (
              <View key={t.title} style={styles.tileItem}>
                <DashboardTile
                  title={t.title}
                  subtitle={t.subtitle}
                  icon={t.icon}
                  onPress={t.onPress}
                  color={t.color}
                  style={{ width: "100%" }}
                />
              </View>
            ))
          )}
        </View>
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    statsRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 6,
    },
    tilesGrid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    tileItem: {
      width: "49.5%",
      marginBottom: 6,
    },
    empty: {
      width: "100%",
      textAlign: "right",
      fontSize: 13,
      lineHeight: 18,
    },
    emptyWrap: {
      width: "100%",
      gap: 10,
      alignItems: "stretch",
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
  });

export default DashboardHome;
