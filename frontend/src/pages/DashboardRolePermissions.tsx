// src/pages/DashboardRolePermissions.tsx
import React, { useEffect, useState } from "react";
import { api } from "../services/api";

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
  can_view_dashboard: boolean;
  can_manage_orders: boolean;
  can_manage_products: boolean;
  can_manage_categories: boolean;
  can_manage_subcategories: boolean;
  can_access_cashier: boolean;
  can_manage_tables: boolean;
  can_manage_inventory: boolean;
  can_view_activity_log: boolean;
  can_manage_support: boolean;
  can_manage_contact_messages: boolean;
  can_manage_users: boolean;
  can_view_user_activity: boolean;
  can_manage_store_settings: boolean;
  can_manage_loyalty: boolean;
  can_view_hr_dashboard: boolean;
  can_manage_employees: boolean;
  can_manage_attendance: boolean;
  can_manage_hr_leaves: boolean;
  can_manage_hr_payroll: boolean;
  can_manage_hr_documents: boolean;
  can_manage_hr_work_reports: boolean;
  can_manage_hr_reports: boolean;
  can_view_hr_performance: boolean;
};

const DashboardRolePermissions: React.FC = () => {
  const [rows, setRows] = useState<RolePermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const fetchPermissions = () => {
    setLoading(true);
    setErr(null);
    setSaveMsg(null);

    api
      .get("auth/role-permissions/")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setRows(
          data.map((row) => ({
            ...row,
            can_access_cashier: !!row.can_access_cashier,
            can_manage_tables: !!row.can_manage_tables,
            can_manage_inventory: !!row.can_manage_inventory,
            can_manage_store_settings: !!row.can_manage_store_settings,
            can_manage_loyalty: !!row.can_manage_loyalty,
            can_manage_subcategories: !!row.can_manage_subcategories,
            can_manage_hr_reports: !!row.can_manage_hr_reports,
            can_view_hr_performance: !!row.can_view_hr_performance,
          }))
        );
      })
      .catch((error) => {
        console.error(error);
        setErr("تعذر تحميل صلاحيات الأدوار.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const togglePermission = (id: number, key: PermissionKey) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [key]: !row[key] } : row
      )
    );
    setSaveMsg(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    setSaveMsg(null);

    try {
      await Promise.all(
        rows.map((row) => {
          const payload: Partial<RolePermissionRow> = { ...row };
          delete payload.id;
          delete (payload as any).role;
          return api.patch(`auth/role-permissions/${row.id}/`, payload);
        })
      );

      setSaveMsg("تم حفظ الصلاحيات بنجاح.");
    } catch (error) {
      console.error(error);
      setErr("تعذر حفظ الصلاحيات، تحقق من الخادم.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>جاري تحميل صلاحيات الأدوار...</div>;
  if (err) return <div className="text-sm text-red-500">{err}</div>;
  if (!rows.length)
    return (
      <div>لا توجد بيانات صلاحيات حالياً، تحقق من إعدادات الباكند.</div>
    );

  const generalPermissions: { key: PermissionKey; label: string }[] = [
    { key: "can_view_dashboard", label: "عرض لوحة النظرة العامة" },
    { key: "can_manage_orders", label: "إدارة الطلبات" },
    { key: "can_access_cashier", label: "شاشة الكاشير" },
    { key: "can_manage_tables", label: "إدارة الطاولات" },
    { key: "can_manage_inventory", label: "إدارة المخزون" },
    { key: "can_manage_products", label: "إدارة الأطباق" },
    { key: "can_manage_categories", label: "إدارة التصنيفات" },
    { key: "can_manage_subcategories", label: "إدارة التصنيفات الفرعية" },
    { key: "can_view_activity_log", label: "عرض سجل النشاط" },
    { key: "can_manage_support", label: "إدارة محادثات الدعم" },
    { key: "can_manage_contact_messages", label: "رسائل التواصل" },
    { key: "can_manage_users", label: "إدارة المستخدمين" },
    { key: "can_view_user_activity", label: "عرض نشاط المستخدمين" },
    { key: "can_manage_store_settings", label: "تخصيص الواجهة" },
    { key: "can_manage_loyalty", label: "إدارة الولاء" },
  ];

  const hrPermissions: { key: PermissionKey; label: string }[] = [
    { key: "can_view_hr_dashboard", label: "عرض لوحة HR" },
    { key: "can_manage_employees", label: "إدارة بيانات الموظفين" },
    { key: "can_manage_attendance", label: "إدارة الحضور والغياب" },
    { key: "can_manage_hr_leaves", label: "إدارة طلبات الإجازة" },
    { key: "can_manage_hr_payroll", label: "إدارة الرواتب" },
    { key: "can_manage_hr_documents", label: "إدارة مستندات الموظفين" },
    {
      key: "can_manage_hr_work_reports",
      label: "مراجعة تقارير العمل / الغياب",
    },
    { key: "can_manage_hr_reports", label: "إدارة تقارير HR" },
    { key: "can_view_hr_performance", label: "لوحة أداء الموظفين (المبيعات)" },
  ];

  const roleLabel = (role: Role) => {
    switch (role) {
      case "manager":
        return "مدير";
      case "supervisor":
        return "مشرف";
      case "staff":
        return "موظف";
      case "customer":
        return "عميل";
      default:
        return role;
    }
  };

  const visibleRows = rows
    .filter((r) => r.role === "supervisor" || r.role === "staff")
    .sort((a, b) => (a.role > b.role ? 1 : -1));

  const renderCheckbox = (
    row: RolePermissionRow,
    key: PermissionKey,
    label: string
  ) => (
    <label
      key={key}
      className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 border border-transparent"
    >
      <span className="text-xs text-gray-700">{label}</span>
      <input
        type="checkbox"
        checked={row[key]}
        onChange={() => togglePermission(row.id, key)}
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">صلاحيات الأدوار</h2>
      <p className="text-sm text-gray-600">
        من هنا يمكنك تحديد ما يمكن لكل دور فعله داخل النظام دون تعديل الكود.
      </p>

      {(saveMsg || err) && (
        <div
          className={`text-xs rounded-lg px-3 py-2 ${
            saveMsg
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {saveMsg || err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleRows.map((row) => (
          <div
            key={row.id}
            className="bg-white rounded-xl shadow p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">
                صلاحيات دور {roleLabel(row.role)}
              </h3>
              <span className="text-[11px] text-gray-500">
                يتم تطبيق الصلاحيات مباشرة بعد الحفظ
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-600">
                صلاحيات المتجر
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {generalPermissions.map((p) =>
                  renderCheckbox(row, p.key, p.label)
                )}
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <h4 className="text-xs font-semibold text-gray-600">
                صلاحيات الموارد البشرية
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {hrPermissions.map((p) =>
                  renderCheckbox(row, p.key, p.label)
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-start">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-60"
        >
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>
      </div>
    </div>
  );
};

export default DashboardRolePermissions;
