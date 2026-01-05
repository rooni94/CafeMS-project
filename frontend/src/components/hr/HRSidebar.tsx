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
  permissions?: HRPermissions;
  onToggle?: () => void;
};

const HRSidebar: React.FC<HRSidebarProps> = ({ permissions }) => {
  const { user } = useAuth();
  const role = user?.role as "customer" | "staff" | "supervisor" | "manager" | undefined;
  const isManager = role === "manager";

  const perms = {
    canViewHRDashboard: permissions?.canViewHRDashboard ?? isManager,
    canViewEmployees: permissions?.canViewEmployees ?? isManager,
    canViewAttendance: permissions?.canViewAttendance ?? isManager,
    canViewLeaves: permissions?.canViewLeaves ?? isManager,
    canViewPayroll: permissions?.canViewPayroll ?? isManager,
    canViewVisa: permissions?.canViewVisa ?? isManager,
    canViewDocuments: permissions?.canViewDocuments ?? isManager,
    canViewHRReports: permissions?.canViewHRReports ?? isManager,
    canViewWorkReports: permissions?.canViewWorkReports ?? isManager,
    canViewHRAlerts: permissions?.canViewHRAlerts ?? isManager,
    canViewHRPerformance: permissions?.canViewHRPerformance ?? isManager,
  };

  const linkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm ${
      active ? "bg-amber-100 text-amber-700" : "hover:bg-gray-50 text-gray-700"
    }`;

  if (!Object.values(perms).some(Boolean)) return null;

  return (
    <div className="bg-white rounded-xl shadow p-3 flex flex-wrap items-center gap-2">
      {perms.canViewHRDashboard && (
        <NavLink to="/dashboard/hr" end className={({ isActive }) => linkClass(isActive)}>
          نظرة HR
        </NavLink>
      )}
      {perms.canViewEmployees && (
        <NavLink to="/dashboard/hr/employees" className={({ isActive }) => linkClass(isActive)}>
          الموظفون
        </NavLink>
      )}
      {perms.canViewAttendance && (
        <NavLink to="/dashboard/hr/attendance" className={({ isActive }) => linkClass(isActive)}>
          الحضور
        </NavLink>
      )}
      {perms.canViewLeaves && (
        <NavLink to="/dashboard/hr/leaves" className={({ isActive }) => linkClass(isActive)}>
          الإجازات
        </NavLink>
      )}
      {perms.canViewPayroll && (
        <NavLink to="/dashboard/hr/payroll" className={({ isActive }) => linkClass(isActive)}>
          الرواتب
        </NavLink>
      )}
      {perms.canViewVisa && (
        <NavLink to="/dashboard/hr/visa" className={({ isActive }) => linkClass(isActive)}>
          التأشيرات
        </NavLink>
      )}
      {perms.canViewDocuments && (
        <NavLink to="/dashboard/hr/documents" className={({ isActive }) => linkClass(isActive)}>
          الوثائق
        </NavLink>
      )}
      {perms.canViewHRReports && (
        <NavLink to="/dashboard/hr/reports" className={({ isActive }) => linkClass(isActive)}>
          تقارير HR
        </NavLink>
      )}
      {perms.canViewWorkReports && (
        <NavLink to="/dashboard/hr/work-reports" className={({ isActive }) => linkClass(isActive)}>
          تقارير العمل
        </NavLink>
      )}
      {perms.canViewHRAlerts && (
        <NavLink to="/dashboard/hr/alerts" className={({ isActive }) => linkClass(isActive)}>
          تنبيهات
        </NavLink>
      )}
      {perms.canViewHRPerformance && (
        <NavLink
          to="/dashboard/hr/performance"
          className={({ isActive }) => linkClass(isActive)}
        >
          الأداء
        </NavLink>
      )}
    </div>
  );
};

export default HRSidebar;
