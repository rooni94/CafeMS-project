import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Switch } from "react-native";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";

type Role = "customer" | "staff" | "supervisor" | "manager";

type PermissionKey =
  | "can_view_dashboard"
  | "can_manage_orders"
  | "can_manage_products"
  | "can_manage_categories"
  | "can_manage_subcategories"
  | "can_access_cashier"
  | "can_manage_tables"
  | "can_manage_inventory"
  | "can_view_activity_log"
  | "can_manage_support"
  | "can_manage_contact_messages"
  | "can_manage_users"
  | "can_view_user_activity"
  | "can_manage_store_settings"
  | "can_manage_loyalty"
  | "can_view_hr_dashboard"
  | "can_manage_employees"
  | "can_manage_attendance"
  | "can_manage_hr_leaves"
  | "can_manage_hr_payroll"
  | "can_manage_hr_documents"
  | "can_manage_hr_work_reports"
  | "can_manage_hr_reports"
  | "can_view_hr_performance";

type RolePermissionRow = {
  id: number;
  role: Role;
} & Record<PermissionKey, boolean>;

const roleLabel = (role: Role) =>
  role === "manager" ? "مدير" : role === "supervisor" ? "مشرف" : role === "staff" ? "موظف" : "عميل";

const generalPermissions: { key: PermissionKey; label: string }[] = [
  { key: "can_view_dashboard", label: "عرض لوحة التحكم" },
  { key: "can_manage_orders", label: "إدارة الطلبات" },
  { key: "can_access_cashier", label: "الدخول للكاشير POS" },
  { key: "can_manage_tables", label: "إدارة الطاولات" },
  { key: "can_manage_inventory", label: "إدارة المخزون" },
  { key: "can_manage_products", label: "إدارة المنتجات" },
  { key: "can_manage_categories", label: "إدارة الأصناف" },
  { key: "can_manage_subcategories", label: "إدارة الأصناف الفرعية" },
  { key: "can_view_activity_log", label: "عرض سجل النشاط" },
  { key: "can_manage_support", label: "إدارة محادثات الدعم" },
  { key: "can_manage_contact_messages", label: "إدارة رسائل التواصل" },
  { key: "can_manage_users", label: "إدارة المستخدمين" },
  { key: "can_view_user_activity", label: "عرض نشاط المستخدمين/الموظفين" },
  { key: "can_manage_store_settings", label: "إعدادات المتجر" },
  { key: "can_manage_loyalty", label: "برنامج الولاء" },
];

const hrPermissions: { key: PermissionKey; label: string }[] = [
  { key: "can_view_hr_dashboard", label: "عرض لوحة HR" },
  { key: "can_manage_employees", label: "إدارة الموظفين" },
  { key: "can_manage_attendance", label: "إدارة الحضور" },
  { key: "can_manage_hr_leaves", label: "إدارة الإجازات" },
  { key: "can_manage_hr_payroll", label: "إدارة الرواتب" },
  { key: "can_manage_hr_documents", label: "إدارة مستندات الموظفين" },
  { key: "can_manage_hr_work_reports", label: "تقارير العمل" },
  { key: "can_manage_hr_reports", label: "تقارير HR" },
  { key: "can_view_hr_performance", label: "أداء الموظفين" },
];

const DashboardRolePermissions: React.FC = () => {
  const theme = useTheme();
  const [rows, setRows] = useState<RolePermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      try {
        const res = await api.get("auth/role-permissions/");
        setRows(res.data || []);
      } catch {
        Alert.alert("خطأ", "تعذر تحميل صلاحيات الأدوار.");
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  const toggle = (id: number, key: PermissionKey) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: !r[key] } : r)));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        rows.map((row) => {
          const payload = { ...row };
          delete (payload as any).id;
          delete (payload as any).role;
          return api.patch(`auth/role-permissions/${row.id}/`, payload);
        })
      );
      Alert.alert("تم", "تم حفظ الصلاحيات.");
    } catch {
      Alert.alert("خطأ", "تعذر حفظ الصلاحيات.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ padding: 16, alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>جاري التحميل...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text style={styles.title}>صلاحيات الأدوار</Text>
          <Text style={styles.helper}>تفعيل/إيقاف صلاحيات لكل دور (موظف، مشرف).</Text>
        </Card>

        {rows
          .filter((r) => r.role === "supervisor" || r.role === "staff")
          .map((row) => (
            <Card key={row.id} style={{ gap: 10 }}>
              <Text style={styles.sectionTitle}>الدور: {roleLabel(row.role)}</Text>
              <Text style={styles.subHeader}>صلاحيات عامة</Text>
              {generalPermissions.map((p) => (
                <View key={p.key} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.label}>{p.label}</Text>
                  </View>
                  <Switch value={row[p.key]} onValueChange={() => toggle(row.id, p.key)} />
                </View>
              ))}

              <Text style={styles.subHeader}>الموارد البشرية</Text>
              {hrPermissions.map((p) => (
                <View key={p.key} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.label}>{p.label}</Text>
                  </View>
                  <Switch value={row[p.key]} onValueChange={() => toggle(row.id, p.key)} />
                </View>
              ))}
            </Card>
          ))}

        <Button title={saving ? "جارٍ الحفظ..." : "حفظ الصلاحيات"} onPress={saveAll} disabled={saving} />
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
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  subHeader: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "right",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
  },
});

export default DashboardRolePermissions;
