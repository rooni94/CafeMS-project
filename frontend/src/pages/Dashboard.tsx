// src/pages/Dashboard.tsx
import React, { useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { DashboardSidebar, RolePermissions } from "../components/layout/DashboardSidebar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

import DashboardUsers from "./DashboardUsers";
import DashboardSupportChat from "./DashboardSupportChat";
import DashboardRolePermissions from "./DashboardRolePermissions";
import DashboardUserActivity from "./DashboardUserActivity";

import DashboardHome from "./dashboard/DashboardHome";
import DashboardOrders from "./dashboard/DashboardOrders";
import DashboardProducts from "./dashboard/DashboardProducts";
import DashboardCategories from "./dashboard/DashboardCategories";
import DashboardSubCategories from "./dashboard/DashboardSubCategories";
import DashboardContactMessages from "./dashboard/DashboardContactMessages";
import DashboardActivityLog from "./dashboard/DashboardActivityLog";
import StoreSettingsPage from "./dashboard/StoreSettingsPage";
import CashierPage from "./dashboard/CashierPage";
import InventoryManagementPage from "./dashboard/InventoryManagementPage";
import TablesManagementPage from "./dashboard/TablesManagementPage";
import DashboardLoyaltyPage from "./dashboard/DashboardLoyaltyPage";
import NotificationCampaignsPage from "./dashboard/NotificationCampaignsPage";

import MyLeavesPage from "./My/MyLeavesPage";
import MyDocumentsPage from "./My/MyDocumentsPage";
import EmployeeHRRouteGuard from "../components/hr/EmployeeHRRouteGuard";

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [rolePerms, setRolePerms] = React.useState<RolePermissions | null>(null);
  const [permLoading, setPermLoading] = React.useState(true);

  useEffect(() => {
    if (loading) {
      return;
    }


    if (!user) {
      nav("/login");
      return;
    }

    if (
      user.role !== "manager" &&
      user.role !== "supervisor" &&
      user.role !== "staff"
    ) {
      nav("/");
      return;
    }

    if (user.role === "manager") {
      setRolePerms({
        role: "manager",
        can_view_dashboard: true,
        can_manage_orders: true,
        can_manage_products: true,
        can_manage_categories: true,
        can_manage_subcategories: true,
        can_access_cashier: true,
        can_manage_tables: true,
        can_manage_inventory: true,
        can_view_activity_log: true,
        can_manage_support: true,
        can_manage_contact_messages: true,
        can_manage_users: true,
        can_view_user_activity: true,
        can_manage_store_settings: true,
        can_view_hr_dashboard: true,
        can_manage_employees: true,
        can_manage_attendance: true,
        can_manage_hr_leaves: true,
        can_manage_hr_payroll: true,
        can_manage_hr_documents: true,
        can_manage_hr_reports: true,
        can_manage_hr_work_reports: true,
        can_view_hr_performance: true,
        can_view_accounting: true,
        can_manage_accounting: true,
        can_manage_financial_reports: true,
        can_manage_payments: true,
        can_manage_suppliers: true,
      });
      setPermLoading(false);
      return;
    }

    setPermLoading(true);
    api
      .get("auth/role-permissions/me/")
      .then((res) => {
        setRolePerms(res.data);
      })
      .catch((err) => {
        console.error("role-permissions error:", err);
        setRolePerms(null);
      })
      .finally(() => setPermLoading(false));
  }, [user, loading, nav]);

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        جاري التحقق من الجلسة، يرجى الانتظار...
      </div>
    );
  }


  if (!user) {
    return <div>يجب تسجيل الدخول للوصول إلى لوحة التحكم.</div>;
  }

  if (
    user.role !== "manager" &&
    user.role !== "supervisor" &&
    user.role !== "staff"
  ) {
    return <div>ليس لديك صلاحية للوصول إلى لوحة التحكم.</div>;
  }

  if (permLoading) {
    return <div>جاري تحميل صلاحيات الدور...</div>;
  }

  const isManager = user.role === "manager";

  const canViewDashboard = isManager || !!rolePerms?.can_view_dashboard;
  const canManageOrders = isManager || !!rolePerms?.can_manage_orders;
  const canManageProducts = isManager || !!rolePerms?.can_manage_products;
  const canManageCategories = isManager || !!rolePerms?.can_manage_categories;
  const canManageSubcategories =
    isManager || !!rolePerms?.can_manage_subcategories;
  const canManageTables = isManager || !!rolePerms?.can_manage_tables;
  const canManageInventory = isManager || !!rolePerms?.can_manage_inventory;
  const canManageContactMessages =
    isManager || !!rolePerms?.can_manage_contact_messages;
  const canManageSupport = isManager || !!rolePerms?.can_manage_support;
  const canViewActivityLog = isManager || !!rolePerms?.can_view_activity_log;
  const canManageUsers = isManager || !!rolePerms?.can_manage_users;
  const canViewUserActivity =
    isManager || !!rolePerms?.can_view_user_activity;
  const canManageStoreSettings =
    isManager || !!rolePerms?.can_manage_store_settings;
  const canAccessCashier =
    isManager ||
    !!rolePerms?.can_access_cashier ||
    !!rolePerms?.can_manage_orders;
  const canManageLoyalty =
    isManager || !!rolePerms?.can_manage_loyalty;
  const canViewHRPerformance =
    isManager || !!rolePerms?.can_view_hr_performance;

  const fromHeader = Boolean((location.state as any)?.fromHeader);
  const headerRoutes = ["/dashboard/orders", "/dashboard/cashier", "/dashboard/support-chat"];
  const hideDashboardBar = fromHeader && headerRoutes.some((path) => location.pathname.startsWith(path));

  return (
    <div className="flex flex-col gap-4 items-center">
      {!hideDashboardBar && (
        <div className="w-full flex justify-center px-4">
          <div className="w-full max-w-6xl">
            <DashboardSidebar perms={rolePerms} />
          </div>
        </div>
      )}

      <div className="flex-1 w-full">
        <Routes>
          {canViewDashboard && <Route path="/" element={<DashboardHome />} />}

          {canManageOrders && (
            <Route path="orders" element={<DashboardOrders />} />
          )}
          {canAccessCashier && (
            <Route path="cashier" element={<CashierPage />} />
          )}

          {canManageProducts && (
            <Route path="products" element={<DashboardProducts />} />
          )}
          {canManageCategories && (
            <Route path="categories" element={<DashboardCategories />} />
          )}
          {canManageSubcategories && (
            <Route path="subcategories" element={<DashboardSubCategories />} />
          )}
          {canManageTables && (
            <Route path="tables" element={<TablesManagementPage />} />
          )}
          {canManageInventory && (
            <Route path="inventory" element={<InventoryManagementPage />} />
          )}

          {canManageSupport && (
            <Route path="support-chat" element={<DashboardSupportChat />} />
          )}

          {canManageContactMessages && (
            <Route
              path="contact-messages"
              element={<DashboardContactMessages />}
            />
          )}

          {canManageStoreSettings && (
            <Route path="store-settings" element={<StoreSettingsPage />} />
          )}

          {canManageLoyalty && (
            <Route path="loyalty" element={<DashboardLoyaltyPage />} />
          )}

          {canViewActivityLog && (
            <Route path="activity-log" element={<DashboardActivityLog />} />
          )}

          {canViewUserActivity && (
            <Route path="user-activity" element={<DashboardUserActivity />} />
          )}

          {canManageUsers && (
            <Route path="users" element={<DashboardUsers />} />
          )}

          {canManageUsers && (
            <Route path="notification-campaigns" element={<NotificationCampaignsPage />} />
          )}

          {isManager && (
            <Route
              path="role-permissions"
              element={<DashboardRolePermissions />}
            />
          )}

          {/* طلباتي HR (إجازات) */}
          <Route
            path="my/hr"
            element={
              <EmployeeHRRouteGuard>
                <MyLeavesPage />
              </EmployeeHRRouteGuard>
            }
          />

          {/* رفع مستنداتي HR */}
          <Route
            path="my/documents"
            element={
              <EmployeeHRRouteGuard>
                <MyDocumentsPage />
              </EmployeeHRRouteGuard>
            }
          />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
