import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import HRSidebar from "./HRSidebar";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export type HRPermissions = {
  canViewHRDashboard?: boolean;
  canViewEmployees?: boolean;
  canViewAttendance?: boolean;
  canViewLeaves?: boolean;
  canViewPayroll?: boolean;
  canViewVisa?: boolean;
  canViewDocuments?: boolean;
  canViewHRReports?: boolean;
  canViewWorkReports?: boolean;
  canViewHRAlerts?: boolean;
  canViewHRPerformance?: boolean;
};

const HRLayout: React.FC = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<HRPermissions | null>(null);
  const [loadingPerms, setLoadingPerms] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions(null);
      setLoadingPerms(false);
      return;
    }

    const baseManagerAccess =
      user.role === "manager" ||
      (user as any).is_staff ||
      (user as any).is_superuser;

    api
      .get("auth/my-permissions/")
      .then((res) => {
        const data = res.data || {};
        const p = data.permissions || {};

        const hasFullHR =
          baseManagerAccess ||
          data.is_superuser ||
          data.is_staff; // نفترض آخر واحدة كأقوى صلاحية

        const perms: HRPermissions = hasFullHR
          ? {
              canViewHRDashboard: true,
              canViewEmployees: true,
              canViewAttendance: true,
              canViewLeaves: true,
              canViewPayroll: true,
              canViewVisa: true,
              canViewDocuments: true,
              canViewHRReports: true,
              canViewWorkReports: true,
              canViewHRAlerts: true,
              canViewHRPerformance: true,
            }
          : {
              canViewHRDashboard: !!p.can_view_hr_dashboard,
              canViewEmployees: !!p.can_manage_employees,
              canViewAttendance: !!p.can_manage_attendance,
              canViewLeaves: !!p.can_manage_hr_leaves,
              canViewPayroll: !!p.can_manage_hr_payroll,
              canViewVisa: !!p.can_manage_hr_documents, // أو تختار صلاحية أخرى لو عندك
              canViewDocuments: !!p.can_manage_hr_documents,
              canViewHRReports: !!p.can_manage_hr_reports,
              canViewWorkReports: !!p.can_manage_hr_work_reports,
              canViewHRAlerts:
                !!p.can_manage_hr_documents ||
                !!p.can_manage_hr_work_reports ||
                !!p.can_manage_hr_reports,
              canViewHRPerformance: !!p.can_view_hr_performance,
            };

        setPermissions(perms);
      })
      .catch((err) => {
        console.error("Failed to load my-permissions in HRLayout", err);
        // في حالة الفشل: المدير يشوف كل شيء، غيره لا شيء
        const baseManagerAccess =
          user.role === "manager" ||
          (user as any).is_staff ||
          (user as any).is_superuser;

        setPermissions(
          baseManagerAccess
            ? {
                canViewHRDashboard: true,
                canViewEmployees: true,
                canViewAttendance: true,
                canViewLeaves: true,
                canViewPayroll: true,
                canViewVisa: true,
                canViewDocuments: true,
                canViewHRReports: true,
                canViewWorkReports: true,
                canViewHRAlerts: true,
                canViewHRPerformance: true,
              }
            : {}
        );
      })
      .finally(() => setLoadingPerms(false));
  }, [user]);

  if (loadingPerms) {
    return (
      <div className="p-4 text-sm text-gray-500">
        جاري تحميل صلاحيات الموارد البشرية...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full flex justify-center px-4">
        <div className="w-full max-w-6xl">
          <HRSidebar permissions={permissions || undefined} />
        </div>
      </div>
      <div className="max-w-full bg-white rounded-xl shadow p-4 min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
};

export default HRLayout;
