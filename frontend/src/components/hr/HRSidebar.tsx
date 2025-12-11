// frontend/src/components/hr/HRSidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";
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

type HRSidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
  permissions?: HRPermissions;
};

const HRSidebar: React.FC<HRSidebarProps> = ({
  collapsed,
  onToggle,
  permissions,
}) => {
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const isCollapsed = collapsed ?? internalCollapsed;

  // جلب المستخدم الحالي من الـ AuthContext
  const { user } = useAuth();
  const role = user?.role as "customer" | "staff" | "supervisor" | "manager" | undefined;

  const isManager = role === "manager";

  // لو ما تم تمرير صلاحيات من الأب:
  // المدير يشوف كل شيء, غيره مخفي افتراضيًا
  const perms = {
    canViewHRDashboard:
      permissions?.canViewHRDashboard ?? isManager,
    canViewEmployees:
      permissions?.canViewEmployees ?? isManager,
    canViewAttendance:
      permissions?.canViewAttendance ?? isManager,
    canViewLeaves:
      permissions?.canViewLeaves ?? isManager,
    canViewPayroll:
      permissions?.canViewPayroll ?? isManager,
    canViewVisa:
      permissions?.canViewVisa ?? isManager,
    canViewDocuments:
      permissions?.canViewDocuments ?? isManager,
    canViewHRReports:
      permissions?.canViewHRReports ?? isManager,
    canViewWorkReports:
      permissions?.canViewWorkReports ?? isManager,
    canViewHRAlerts:
      permissions?.canViewHRAlerts ?? isManager,
    canViewHRPerformance:
      permissions?.canViewHRPerformance ?? isManager,
  };

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed((c) => !c);
    }
  };

  // لو المستخدم ما عنده أي صلاحية HR نهائياً، نرجع null (ما نظهر القائمة)
  const hasAnyHRPermission = Object.values(perms).some(Boolean);
  if (!hasAnyHRPermission) {
    return null;
  }

  return (
    <aside
      className={`bg-white rounded-xl shadow p-4 space-y-4 transition-all duration-200 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between border-b pb-3">
        {!isCollapsed && (
          <div>
            <h2 className="text-lg font-semibold">لوحة موارد بشرية</h2>
            <p className="text-xs text-gray-500 mt-1">
              إدارة الموظفين، الحضور، الإجازات، الرواتب والمستندات.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggle}
          className="w-7 h-7 flex items-center justify-center rounded-full border text-xs hover:bg-gray-50"
        >
          {isCollapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="flex flex-col gap-2 text-sm">
        {perms.canViewHRDashboard && (
          <NavLink
            to="/dashboard/hr"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            نظرة عامة HR
          </NavLink>
        )}

        {perms.canViewEmployees && (
          <NavLink
            to="/dashboard/hr/employees"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            الموظفون
          </NavLink>
        )}

        {perms.canViewAttendance && (
          <NavLink
            to="/dashboard/hr/attendance"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            الحضور والغياب
          </NavLink>
        )}

        {perms.canViewLeaves && (
          <NavLink
            to="/dashboard/hr/leaves"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            طلبات الموظفين
          </NavLink>
        )}

        {perms.canViewPayroll && (
          <NavLink
            to="/dashboard/hr/payroll"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            الرواتب
          </NavLink>
        )}

        {perms.canViewVisa && (
          <NavLink
            to="/dashboard/hr/visa"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            الإقامات والتأشيرات
          </NavLink>
        )}

        {perms.canViewDocuments && (
          <NavLink
            to="/dashboard/hr/documents"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            مستندات الموظفين
          </NavLink>
        )}

        {perms.canViewHRReports && (
          <NavLink
            to="/dashboard/hr/reports"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            تقارير HR
          </NavLink>
        )}

        {perms.canViewWorkReports && (
          <NavLink
            to="/dashboard/hr/work-reports"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            تقارير العمل/ الغياب
          </NavLink>
        )}

        {perms.canViewHRAlerts && (
          <NavLink
            to="/dashboard/hr/alerts"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            تنبيهات HR
          </NavLink>
        )}

        {perms.canViewHRPerformance && (
          <NavLink
            to="/dashboard/hr/performance"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg ${
                isActive ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50"
              }`
            }
          >
            أداء الموظفين
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default HRSidebar;
