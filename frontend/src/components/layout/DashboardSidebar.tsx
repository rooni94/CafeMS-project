// src/components/layout/DashboardSidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

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
  onToggle?: () => void;
};

export const DashboardSidebar: React.FC<SidebarProps> = ({ perms }) => {
  const { user } = useAuth();

  const isManager = user?.role === "manager";
  const isSupervisor = user?.role === "supervisor";
  const isStaff = user?.role === "staff";

  const canViewDashboard = isManager || !!perms?.can_view_dashboard;
  const canManageOrders = isManager || !!perms?.can_manage_orders;
  const canManageProducts = isManager || !!perms?.can_manage_products;
  const canManageContactMessages = isManager || !!perms?.can_manage_contact_messages;
  const canManageSupport = isManager || !!perms?.can_manage_support;
  const canViewActivityLog = isManager || !!perms?.can_view_activity_log;
  const canManageUsers = isManager || !!perms?.can_manage_users;
  const canViewUserActivity = isManager || !!perms?.can_view_user_activity;
  const canSeeMyHR = isManager || isSupervisor || isStaff;
  const canManageStoreSettings = isManager || !!perms?.can_manage_store_settings;
  const canManageLoyalty = isManager || !!perms?.can_manage_loyalty;
  const canManageCategories = isManager || !!perms?.can_manage_categories;
  const canManageSubcategories = isManager || !!perms?.can_manage_subcategories;
  const canManageTables = isManager || !!perms?.can_manage_tables;
  const canManageInventory = isManager || !!perms?.can_manage_inventory;
  const canUseCashier = isManager || !!perms?.can_access_cashier || !!perms?.can_manage_orders;

  const linkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm ${
      active ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50 text-gray-700"
    }`;

  const hasAny =
    canViewDashboard ||
    canManageOrders ||
    canUseCashier ||
    canSeeMyHR ||
    canManageProducts ||
    canManageCategories ||
    canManageSubcategories ||
    canManageTables ||
    canManageInventory ||
    canManageContactMessages ||
    canManageSupport ||
    canViewUserActivity ||
    canViewActivityLog ||
    canManageUsers ||
    canManageStoreSettings ||
    canManageLoyalty ||
    isManager;

  if (!hasAny) return null;

  return (
    <div className="bg-white rounded-xl shadow p-3 w-full max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-2 text-center">
      {canViewDashboard && (
        <NavLink to="/dashboard" end className={({ isActive }) => linkClass(isActive)}>
          لوحة التحكم
        </NavLink>
      )}
      {canManageOrders && (
        <NavLink to="/dashboard/orders" className={({ isActive }) => linkClass(isActive)}>
          الطلبات
        </NavLink>
      )}
      {canUseCashier && (
        <NavLink to="/dashboard/cashier" className={({ isActive }) => linkClass(isActive)}>
          الكاشير
        </NavLink>
      )}
      {canSeeMyHR && (
        <NavLink to="/dashboard/my/hr" className={({ isActive }) => linkClass(isActive)}>
          HR (موظفي)
        </NavLink>
      )}
      {canSeeMyHR && (
        <NavLink to="/dashboard/my/documents" className={({ isActive }) => linkClass(isActive)}>
          مستنداتي
        </NavLink>
      )}
      {canManageProducts && (
        <NavLink to="/dashboard/products" className={({ isActive }) => linkClass(isActive)}>
          المنتجات/الأطباق
        </NavLink>
      )}
      {canManageCategories && (
        <NavLink to="/dashboard/categories" className={({ isActive }) => linkClass(isActive)}>
          الأصناف
        </NavLink>
      )}
      {canManageSubcategories && (
        <NavLink to="/dashboard/subcategories" className={({ isActive }) => linkClass(isActive)}>
          الأصناف الفرعية
        </NavLink>
      )}
      {canManageTables && (
        <NavLink to="/dashboard/tables" className={({ isActive }) => linkClass(isActive)}>
          الطاولات
        </NavLink>
      )}
      {canManageInventory && (
        <NavLink to="/dashboard/inventory" className={({ isActive }) => linkClass(isActive)}>
          المخزون
        </NavLink>
      )}
      {canManageContactMessages && (
        <NavLink
          to="/dashboard/contact-messages"
          className={({ isActive }) => linkClass(isActive)}
        >
          رسائل العملاء
        </NavLink>
      )}
      {canManageSupport && (
        <NavLink to="/dashboard/support-chat" className={({ isActive }) => linkClass(isActive)}>
          دعم فني
        </NavLink>
      )}
      {canViewUserActivity && (
        <NavLink to="/dashboard/user-activity" className={({ isActive }) => linkClass(isActive)}>
          نشاط المستخدمين
        </NavLink>
      )}
      {canViewActivityLog && (
        <NavLink to="/dashboard/activity-log" className={({ isActive }) => linkClass(isActive)}>
          سجل النشاط
        </NavLink>
      )}
      {canManageUsers && (
        <NavLink to="/dashboard/users" className={({ isActive }) => linkClass(isActive)}>
          المستخدمون
        </NavLink>
      )}
      {canManageStoreSettings && (
        <NavLink
          to="/dashboard/store-settings"
          className={({ isActive }) => linkClass(isActive)}
        >
          إعدادات المتجر
        </NavLink>
      )}
      {canManageLoyalty && (
        <NavLink to="/dashboard/loyalty" className={({ isActive }) => linkClass(isActive)}>
          الولاء
        </NavLink>
      )}
      {isManager && (
        <NavLink
          to="/dashboard/role-permissions"
          className={({ isActive }) => linkClass(isActive)}
        >
          صلاحيات الأدوار
        </NavLink>
      )}
    </div>
  );
};

export default DashboardSidebar;
