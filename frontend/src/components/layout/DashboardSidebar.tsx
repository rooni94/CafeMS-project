// src/components/layout/DashboardSidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// نفس نوع الصلاحيات المستخدمة في Dashboard.tsx
export type RolePermissions = {
  role: "customer" | "staff" | "supervisor" | "manager";
  can_view_dashboard: boolean;
  can_manage_orders: boolean;
  can_manage_products: boolean;
  can_manage_categories: boolean;
  can_manage_subcategories?: boolean;
  can_access_cashier?: boolean;
  can_manage_tables?: boolean;
  can_manage_inventory?: boolean;
  can_view_activity_log: boolean;
  can_manage_support: boolean;
  can_manage_contact_messages: boolean;
  can_manage_users: boolean;
  can_view_user_activity: boolean;
  can_manage_store_settings?: boolean;
  can_manage_loyalty?: boolean;
  can_view_hr_performance?: boolean;
};

type SidebarProps = {
  perms: RolePermissions | null;
  collapsed?: boolean;
  onToggle?: () => void;
};

export const DashboardSidebar: React.FC<SidebarProps> = ({
  perms,
  collapsed = false,
  onToggle,
}) => {
  const { user } = useAuth();

  const isManager = user?.role === "manager";
  const isSupervisor = user?.role === "supervisor";
  const isStaff = user?.role === "staff";

  const canViewDashboard = isManager || !!perms?.can_view_dashboard;
  const canManageOrders = isManager || !!perms?.can_manage_orders;
  const canManageProducts = isManager || !!perms?.can_manage_products;
  const canManageContactMessages =
    isManager || !!perms?.can_manage_contact_messages;
  const canManageSupport = isManager || !!perms?.can_manage_support;
  const canViewActivityLog = isManager || !!perms?.can_view_activity_log;
  const canManageUsers = isManager || !!perms?.can_manage_users;
  const canViewUserActivity = isManager || !!perms?.can_view_user_activity;
  const canSeeMyHR = isManager || isSupervisor || isStaff;
  const canManageStoreSettings =
    isManager || !!perms?.can_manage_store_settings;
  const canManageLoyalty = isManager || !!perms?.can_manage_loyalty;
  const canManageCategories = isManager || !!perms?.can_manage_categories;
  const canManageSubcategories =
    isManager || !!perms?.can_manage_subcategories;
  const canManageTables = isManager || !!perms?.can_manage_tables;
  const canManageInventory = isManager || !!perms?.can_manage_inventory;
  const canUseCashier =
    isManager || !!perms?.can_access_cashier || !!perms?.can_manage_orders;

  return (
    <aside
      className={`bg-white rounded-xl shadow p-4 space-y-4 transition-all duration-200 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between border-b pb-3">
        {!collapsed && (
          <div>
            <h2 className="text-lg font-semibold">لوحة التحكم</h2>
            <p className="text-xs text-gray-500 mt-1">
              {isManager
                ? "مرحباً، لديك صلاحيات كاملة لإدارة المتجر بما في ذلك المستخدمين."
                : perms?.role === "supervisor"
                ? "مرحباً، لديك صلاحيات إدارة الطلبات والأطباق والمحادثات حسب ما يحدده المدير."
                : perms?.role === "staff"
                ? "مرحباً، يمكنك إدارة الطلبات والمهام الموكلة لك حسب صلاحياتك."
                : ""}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          className="w-7 h-7 flex items-center justify-center rounded-full border text-xs hover:bg-gray-50"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="flex flex-col gap-2 text-sm">
        {canViewDashboard && (
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            نظرة عامة
          </NavLink>
        )}

        {canManageOrders && (
          <NavLink
            to="/dashboard/orders"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            إدارة الطلبات
          </NavLink>
        )}
        {canUseCashier && (
          <NavLink
            to="/dashboard/cashier"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            شاشة الكاشير
          </NavLink>
        )}

        {canSeeMyHR && (
          <NavLink
            to="/dashboard/my/hr"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
             (الموارد البشرية)
          </NavLink>
        )}

        {canSeeMyHR && (
          <NavLink
            to="/dashboard/my/documents"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            رفع المستندات (الموارد البشرية)
          </NavLink>
        )}

        {canManageProducts && (
          <NavLink
            to="/dashboard/products"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            إدارة الأطباق
          </NavLink>
        )}

        {canManageCategories && (
          <NavLink
            to="/dashboard/categories"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            إدارة الأصناف
          </NavLink>
        )}

        {canManageSubcategories && (
          <NavLink
            to="/dashboard/subcategories"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            الأصناف الفرعية
          </NavLink>
        )}

        {canManageTables && (
          <NavLink
            to="/dashboard/tables"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            إدارة الطاولات
          </NavLink>
        )}

        {canManageInventory && (
          <NavLink
            to="/dashboard/inventory"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            إدارة المخزون
          </NavLink>
        )}

        {canManageContactMessages && (
          <NavLink
            to="/dashboard/contact-messages"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            رسائل التواصل
          </NavLink>
        )}

        {canManageSupport && (
          <NavLink
            to="/dashboard/support-chat"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            محادثات الدعم
          </NavLink>
        )}

        {canViewUserActivity && (
          <NavLink
            to="/dashboard/user-activity"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            نشاط المستخدمين
          </NavLink>
        )}

        {canViewActivityLog && (
          <NavLink
            to="/dashboard/activity-log"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            سجل نشاط الموظفين
          </NavLink>
        )}

        {canManageUsers && (
          <NavLink
            to="/dashboard/users"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            إدارة المستخدمين
          </NavLink>
        )}

        {canManageStoreSettings && (
          <NavLink
            to="/dashboard/store-settings"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
           تخصيص الواجهة
          </NavLink>
        )}

        {canManageLoyalty && (
          <NavLink
            to="/dashboard/loyalty"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            برنامج الولاء
          </NavLink>
        )}

        {isManager && (
          <NavLink
            to="/dashboard/role-permissions"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            صلاحيات الأدوار
          </NavLink>
        )}
      </nav>
    </aside>
  );
};
