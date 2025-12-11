// frontend/src/components/hr/HRRouteGuard.tsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

type Props = {
  children: React.ReactElement;
};

const HRRouteGuard: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const [hrLoading, setHrLoading] = useState(true);
  const [canAccessHR, setCanAccessHR] = useState(false);

  useEffect(() => {
    // لو ما فيه يوزر أصلاً
    if (!user) {
      setCanAccessHR(false);
      setHrLoading(false);
      return;
    }

    setHrLoading(true);

    api
      .get("auth/my-permissions/")
      .then((res) => {
        const data = res.data || {};
        const p = data.permissions || {};

        // نعتبر أنه يقدر يدخل HR لو:
        // - سوبر يوزر أو staff
        // - أو عنده أي صلاحية HR من RolePermission
          const allowed =
            data.is_superuser ||
            data.is_staff ||
            !!p.can_view_hr_dashboard ||
            !!p.can_manage_employees ||
            !!p.can_manage_attendance ||
            !!p.can_manage_hr_leaves ||
            !!p.can_manage_hr_payroll ||
            !!p.can_manage_hr_documents ||
            !!p.can_manage_hr_work_reports ||
            !!p.can_manage_hr_reports ||
            !!p.can_view_hr_performance;


        setCanAccessHR(allowed);
      })
      .catch((err) => {
        console.error("Failed to load HR permissions", err);
        setCanAccessHR(false);
      })
      .finally(() => setHrLoading(false));
  }, [user]);

  // أثناء تحميل حالة الأوث أو صلاحيات HR
  if (loading || hrLoading) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        جارٍ التحقق من صلاحيات الموارد البشرية...
      </div>
    );
  }

  // لو مو مسجل دخول → روح للّوجين
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // لو ما عنده صلاحية HR → رجّعه للداشبورد العادي
  if (!canAccessHR) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default HRRouteGuard;
