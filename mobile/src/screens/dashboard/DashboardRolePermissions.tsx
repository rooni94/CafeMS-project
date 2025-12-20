import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import DashboardListItem from "./components/DashboardListItem";
import { isManager } from "./components/permissions";

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

const roleLabel = (role: Role) => {
  if (role === "manager") return "مدير";
  if (role === "supervisor") return "مشرف";
  if (role === "staff") return "موظف";
  return "عميل";
};

const generalPermissions: Array<{ key: PermissionKey; label: string; icon: any }> = [
  { key: "can_view_dashboard", label: "عرض لوحة التحكم", icon: "speedometer-outline" },
  { key: "can_manage_orders", label: "إدارة الطلبات", icon: "receipt-outline" },
  { key: "can_access_cashier", label: "الوصول للكاشير POS", icon: "cash-outline" },
  { key: "can_manage_tables", label: "إدارة الطاولات", icon: "grid-outline" },
  { key: "can_manage_inventory", label: "إدارة المخزون", icon: "cube-outline" },
  { key: "can_manage_products", label: "إدارة المنتجات", icon: "fast-food-outline" },
  { key: "can_manage_categories", label: "إدارة الفئات", icon: "albums-outline" },
  { key: "can_manage_subcategories", label: "إدارة التصنيفات الفرعية", icon: "layers-outline" },
  { key: "can_view_activity_log", label: "عرض سجل النشاط", icon: "time-outline" },
  { key: "can_manage_support", label: "إدارة تذاكر الدعم", icon: "chatbubbles-outline" },
  { key: "can_manage_contact_messages", label: "إدارة رسائل التواصل", icon: "mail-outline" },
  { key: "can_manage_users", label: "إدارة المستخدمين", icon: "people-outline" },
  { key: "can_view_user_activity", label: "عرض سجل المستخدمين", icon: "person-outline" },
  { key: "can_manage_store_settings", label: "إعدادات المتجر", icon: "settings-outline" },
  { key: "can_manage_loyalty", label: "برنامج الولاء", icon: "sparkles-outline" },
];

const hrPermissions: Array<{ key: PermissionKey; label: string; icon: any }> = [
  { key: "can_view_hr_dashboard", label: "عرض لوحة HR", icon: "briefcase-outline" },
  { key: "can_manage_employees", label: "إدارة الموظفين", icon: "people-circle-outline" },
  { key: "can_manage_attendance", label: "إدارة الحضور", icon: "calendar-outline" },
  { key: "can_manage_hr_leaves", label: "إدارة الإجازات", icon: "leaf-outline" },
  { key: "can_manage_hr_payroll", label: "إدارة الرواتب", icon: "card-outline" },
  { key: "can_manage_hr_documents", label: "وثائق الموارد البشرية", icon: "document-text-outline" },
  { key: "can_manage_hr_work_reports", label: "تقارير العمل", icon: "analytics-outline" },
  { key: "can_manage_hr_reports", label: "تقارير HR", icon: "bar-chart-outline" },
  { key: "can_view_hr_performance", label: "الأداء", icon: "trending-up-outline" },
];

const DashboardRolePermissions: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const allowed = isManager(user);

  const [rows, setRows] = useState<RolePermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    const fetchPermissions = async () => {
      setLoading(true);
      try {
        const res = await api.get("auth/role-permissions/");
        setRows(res.data || []);
      } catch {
        Alert.alert("تعذر التحميل", "حدث خطأ أثناء تحميل الصلاحيات.");
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, [allowed]);

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
      Alert.alert("تم الحفظ", "تم تحديث الصلاحيات بنجاح.");
    } catch {
      Alert.alert("تعذر الحفظ", "حدث خطأ أثناء حفظ الصلاحيات.");
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return <DashboardAccessDenied title="الأدوار والصلاحيات" subtitle="تخصيص صلاحيات الموظفين والمشرفين." />;
  }

  if (loading) {
    return (
      <DashboardShell title="الأدوار والصلاحيات" subtitle="تخصيص صلاحيات الموظفين والمشرفين.">
        <DashboardSection>
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={{ color: theme.palette.muted }}>جاري التحميل...</Text>
          </View>
        </DashboardSection>
      </DashboardShell>
    );
  }

  const editableRows = rows.filter((r) => r.role === "supervisor" || r.role === "staff");

  return (
    <DashboardShell title="الأدوار والصلاحيات" subtitle="إدارة صلاحيات الموظفين والمشرفين.">
      {editableRows.map((row) => (
        <DashboardSection key={row.id} title={`دور: ${roleLabel(row.role)}`} subtitle="فعّل الصلاحيات المطلوبة ثم احفظ.">
          <Text style={[styles.groupTitle, { color: theme.palette.text }]}>صلاحيات عامة</Text>
          <View style={{ gap: 8 }}>
            {generalPermissions.map((p) => (
              <DashboardListItem
                key={p.key}
                title={p.label}
                icon={p.icon}
                right={
                  <Switch
                    value={row[p.key]}
                    onValueChange={() => toggle(row.id, p.key)}
                    thumbColor={row[p.key] ? theme.palette.accent : "#f1f5f9"}
                    trackColor={{ false: theme.palette.border, true: `${theme.palette.accent}55` }}
                  />
                }
              />
            ))}
          </View>

          <Text style={[styles.groupTitle, { color: theme.palette.text, marginTop: 8 }]}>صلاحيات الموارد البشرية</Text>
          <View style={{ gap: 8 }}>
            {hrPermissions.map((p) => (
              <DashboardListItem
                key={p.key}
                title={p.label}
                icon={p.icon}
                right={
                  <Switch
                    value={row[p.key]}
                    onValueChange={() => toggle(row.id, p.key)}
                    thumbColor={row[p.key] ? theme.palette.accent : "#f1f5f9"}
                    trackColor={{ false: theme.palette.border, true: `${theme.palette.accent}55` }}
                  />
                }
              />
            ))}
          </View>
        </DashboardSection>
      ))}

      <View style={{ paddingHorizontal: 12 }}>
        <Button title={saving ? "جارٍ الحفظ..." : "حفظ الصلاحيات"} onPress={saveAll} disabled={saving} />
      </View>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    loading: {
      alignItems: "center",
      gap: 10,
      paddingVertical: 20,
    },
    groupTitle: {
      textAlign: "right",
      fontSize: 13,
      fontWeight: "900",
    },
  });

export default DashboardRolePermissions;
