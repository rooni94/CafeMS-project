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
import { useI18n } from "../../i18n";

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

const roleLabel = (role: Role, t: (key: string, fallback?: string) => string) => {
  if (role === "manager") return t("dashboard.rolesRoleManager", "مدير");
  if (role === "supervisor") return t("dashboard.rolesRoleSupervisor", "مشرف");
  if (role === "staff") return t("dashboard.rolesRoleStaff", "موظف");
  return t("dashboard.rolesRoleCustomer", "عميل");
};

const generalPermissions: Array<{ key: PermissionKey; labelKey: string; labelFallback: string; icon: any }> = [
  { key: "can_view_dashboard", labelKey: "dashboard.rolesPermViewDashboard", labelFallback: "عرض لوحة التحكم", icon: "speedometer-outline" },
  { key: "can_manage_orders", labelKey: "dashboard.rolesPermManageOrders", labelFallback: "إدارة الطلبات", icon: "receipt-outline" },
  { key: "can_access_cashier", labelKey: "dashboard.rolesPermAccessCashier", labelFallback: "الوصول للكاشير POS", icon: "cash-outline" },
  { key: "can_manage_tables", labelKey: "dashboard.rolesPermManageTables", labelFallback: "إدارة الطاولات", icon: "grid-outline" },
  { key: "can_manage_inventory", labelKey: "dashboard.rolesPermManageInventory", labelFallback: "إدارة المخزون", icon: "cube-outline" },
  { key: "can_manage_products", labelKey: "dashboard.rolesPermManageProducts", labelFallback: "إدارة المنتجات", icon: "fast-food-outline" },
  { key: "can_manage_categories", labelKey: "dashboard.rolesPermManageCategories", labelFallback: "إدارة الفئات", icon: "albums-outline" },
  { key: "can_manage_subcategories", labelKey: "dashboard.rolesPermManageSubcategories", labelFallback: "إدارة التصنيفات الفرعية", icon: "layers-outline" },
  { key: "can_view_activity_log", labelKey: "dashboard.rolesPermViewActivityLog", labelFallback: "عرض سجل النشاط", icon: "time-outline" },
  { key: "can_manage_support", labelKey: "dashboard.rolesPermManageSupport", labelFallback: "إدارة تذاكر الدعم", icon: "chatbubbles-outline" },
  { key: "can_manage_contact_messages", labelKey: "dashboard.rolesPermManageContactMessages", labelFallback: "إدارة رسائل التواصل", icon: "mail-outline" },
  { key: "can_manage_users", labelKey: "dashboard.rolesPermManageUsers", labelFallback: "إدارة المستخدمين", icon: "people-outline" },
  { key: "can_view_user_activity", labelKey: "dashboard.rolesPermViewUserActivity", labelFallback: "عرض سجل المستخدمين", icon: "person-outline" },
  { key: "can_manage_store_settings", labelKey: "dashboard.rolesPermManageStoreSettings", labelFallback: "إعدادات المتجر", icon: "settings-outline" },
  { key: "can_manage_loyalty", labelKey: "dashboard.rolesPermManageLoyalty", labelFallback: "برنامج الولاء", icon: "sparkles-outline" },
];

const hrPermissions: Array<{ key: PermissionKey; labelKey: string; labelFallback: string; icon: any }> = [
  { key: "can_view_hr_dashboard", labelKey: "dashboard.rolesPermViewHrDashboard", labelFallback: "عرض لوحة HR", icon: "briefcase-outline" },
  { key: "can_manage_employees", labelKey: "dashboard.rolesPermManageEmployees", labelFallback: "إدارة الموظفين", icon: "people-circle-outline" },
  { key: "can_manage_attendance", labelKey: "dashboard.rolesPermManageAttendance", labelFallback: "إدارة الحضور", icon: "calendar-outline" },
  { key: "can_manage_hr_leaves", labelKey: "dashboard.rolesPermManageHrLeaves", labelFallback: "إدارة الإجازات", icon: "leaf-outline" },
  { key: "can_manage_hr_payroll", labelKey: "dashboard.rolesPermManageHrPayroll", labelFallback: "إدارة الرواتب", icon: "card-outline" },
  { key: "can_manage_hr_documents", labelKey: "dashboard.rolesPermManageHrDocuments", labelFallback: "وثائق الموارد البشرية", icon: "document-text-outline" },
  { key: "can_manage_hr_work_reports", labelKey: "dashboard.rolesPermManageHrWorkReports", labelFallback: "تقارير العمل", icon: "analytics-outline" },
  { key: "can_manage_hr_reports", labelKey: "dashboard.rolesPermManageHrReports", labelFallback: "تقارير HR", icon: "bar-chart-outline" },
  { key: "can_view_hr_performance", labelKey: "dashboard.rolesPermViewHrPerformance", labelFallback: "الأداء", icon: "trending-up-outline" },
];

const DashboardRolePermissions: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
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
        Alert.alert(
          t("dashboard.rolesLoadErrorTitle", "تعذر التحميل"),
          t("dashboard.rolesLoadErrorBody", "حدث خطأ أثناء تحميل الصلاحيات."),
        );
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
      Alert.alert(
        t("dashboard.rolesSaveSuccessTitle", "تم الحفظ"),
        t("dashboard.rolesSaveSuccessBody", "تم تحديث الصلاحيات بنجاح."),
      );
    } catch {
      Alert.alert(
        t("dashboard.rolesSaveErrorTitle", "تعذر الحفظ"),
        t("dashboard.rolesSaveErrorBody", "حدث خطأ أثناء حفظ الصلاحيات."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title={t("dashboard.rolesTitle", "الأدوار والصلاحيات")}
        subtitle={t("dashboard.rolesSubtitle", "تخصيص صلاحيات الموظفين والمشرفين.")}
      />
    );
  }

  if (loading) {
    return (
      <DashboardShell
        title={t("dashboard.rolesTitle", "الأدوار والصلاحيات")}
        subtitle={t("dashboard.rolesSubtitle", "تخصيص صلاحيات الموظفين والمشرفين.")}
      >
        <DashboardSection>
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={{ color: theme.palette.muted }}>{t("common.loading", "جاري التحميل...")}</Text>
          </View>
        </DashboardSection>
      </DashboardShell>
    );
  }

  const editableRows = rows.filter((r) => r.role === "supervisor" || r.role === "staff");

  return (
    <DashboardShell
      title={t("dashboard.rolesTitle", "الأدوار والصلاحيات")}
      subtitle={t("dashboard.rolesManageSubtitle", "إدارة صلاحيات الموظفين والمشرفين.")}
    >
      {editableRows.map((row) => (
        <DashboardSection
          key={row.id}
          title={`${t("dashboard.rolesRolePrefix", "دور")}: ${roleLabel(row.role, t)}`}
          subtitle={t("dashboard.rolesSectionHint", "فعّل الصلاحيات المطلوبة ثم احفظ.")}
        >
          <Text style={[styles.groupTitle, { color: theme.palette.text }]}>{t("dashboard.rolesGroupGeneral", "صلاحيات عامة")}</Text>
          <View style={{ gap: 8 }}>
            {generalPermissions.map((p) => (
              <DashboardListItem
                key={p.key}
                title={t(p.labelKey, p.labelFallback)}
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

          <Text style={[styles.groupTitle, { color: theme.palette.text, marginTop: 8 }]}>
            {t("dashboard.rolesGroupHR", "صلاحيات الموارد البشرية")}
          </Text>
          <View style={{ gap: 8 }}>
            {hrPermissions.map((p) => (
              <DashboardListItem
                key={p.key}
                title={t(p.labelKey, p.labelFallback)}
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
        <Button
          title={saving ? t("common.saving", "جارٍ الحفظ...") : t("dashboard.rolesSaveButton", "حفظ الصلاحيات")}
          onPress={saveAll}
          disabled={saving}
        />
      </View>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    loading: {
      alignItems: "center",
      gap: 10,
      paddingVertical: 20,
    },
    groupTitle: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
      fontWeight: "900",
    },
  });

export default DashboardRolePermissions;
