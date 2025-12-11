// src/components/hr/EmployeeHRRouteGuard.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type Props = {
  children: React.ReactElement;
};

const EmployeeHRRouteGuard: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();

  // أثناء تحميل حالة المستخدم
  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        جارٍ التحقق من جلسة الدخول...
      </div>
    );
  }

  // لو غير مسجل دخول → نرجعه لصفحة تسجيل الدخول
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // مسموح فقط: staff + supervisor + manager
  if (!["staff", "supervisor", "manager"].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default EmployeeHRRouteGuard;
