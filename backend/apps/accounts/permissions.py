# backend/apps/accounts/permissions.py
from rest_framework import permissions
from django.contrib.auth import get_user_model
from .models import RolePermission

User = get_user_model()


def get_role_permission(user):
    """إرجاع سجل RolePermission الخاص بدور المستخدم إن وُجد."""
    role = getattr(user, "role", None)
    if not role:
        return None
    try:
        return RolePermission.objects.get(role=role)
    except RolePermission.DoesNotExist:
        return None


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "manager"
        )


class HasFeaturePermission(permissions.BasePermission):
    """
    صلاحية عامة مبنية على جدول RolePermission.
    - المدير دائماً مسموح له بكل شيء.
    - غير كذا: نقرأ سجل RolePermission ونشوف قيمة الحقل المحدد في feature_name.
    """

    feature_name: str = ""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        role = getattr(user, "role", None)
        if role == "manager":
            # المدير يمتلك كافة الصلاحيات
            return True

        rp = get_role_permission(user)
        if not rp or not self.feature_name:
            return False

        return bool(getattr(rp, self.feature_name, False))


# ===== صلاحيات خاصة بالـ HR مبنية على الحقل hr_role في User =====

HR_RANK = {
    "none": 0,
    "staff": 1,
    "supervisor": 2,
    "manager": 3,
}

# خريطة تربط بين role العادي و hr_role تلقائياً
ROLE_TO_HR_ROLE = {
    "customer": "none",
    "staff": "staff",
    "supervisor": "supervisor",
    "manager": "manager",
}


def _get_hr_rank(user) -> int:
    if not user or not user.is_authenticated:
        return 0

    # لو hr_role معيّن يدوياً نستخدمه
    hr_role = getattr(user, "hr_role", "none")

    # لو hr_role = none نشتقه من role
    if hr_role == "none":
        base_role = getattr(user, "role", "customer")
        hr_role = ROLE_TO_HR_ROLE.get(base_role, "none")

    return HR_RANK.get(hr_role, 0)


class IsHRStaffOrAbove(permissions.BasePermission):
    """
    أي شخص عنده hr_role != none (أو role = staff/supervisor/manager)
    """

    def has_permission(self, request, view):
        return _get_hr_rank(request.user) >= HR_RANK["staff"]


class IsHRSupervisorOrManager(permissions.BasePermission):
    """
    hr_role in [supervisor, manager]
    """

    def has_permission(self, request, view):
        return _get_hr_rank(request.user) >= HR_RANK["supervisor"]


class IsHRManager(permissions.BasePermission):
    """
    hr_role == manager فقط (أو role == manager)
    """

    def has_permission(self, request, view):
        return _get_hr_rank(request.user) >= HR_RANK["manager"]


class IsOwnerOrHR(permissions.BasePermission):
    """
    - يسمح للموظف يشوف سجلاته فقط
    - أو أي شخص HR Staff أو أعلى يشوف كل شيء
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if _get_hr_rank(user) >= HR_RANK["staff"]:
            return True

        related_user = getattr(getattr(obj, "employee", None), "user", None)
        if related_user and related_user == user:
            return True

        return False


# ===== صلاحيات features مبنية على HasFeaturePermission =====

class CanViewDashboard(HasFeaturePermission):
    feature_name = "can_view_dashboard"


class CanManageOrders(HasFeaturePermission):
    feature_name = "can_manage_orders"


class CanManageProducts(HasFeaturePermission):
    feature_name = "can_manage_products"


class CanManageCategories(HasFeaturePermission):
    feature_name = "can_manage_categories"


class CanManageSubCategories(HasFeaturePermission):
    feature_name = "can_manage_subcategories"


class CanViewActivityLog(HasFeaturePermission):
    feature_name = "can_view_activity_log"


class CanManageSupport(HasFeaturePermission):
    feature_name = "can_manage_support"


class CanManageContactMessages(HasFeaturePermission):
    feature_name = "can_manage_contact_messages"


class CanManageUsers(HasFeaturePermission):
    feature_name = "can_manage_users"


class CanManageStoreSettings(HasFeaturePermission):
    feature_name = "can_manage_store_settings"


class CanManageLoyalty(HasFeaturePermission):
    feature_name = "can_manage_loyalty"


class CanAccessCashier(HasFeaturePermission):
    feature_name = "can_access_cashier"


class CanManageTables(HasFeaturePermission):
    feature_name = "can_manage_tables"


class CanManageInventory(HasFeaturePermission):
    feature_name = "can_manage_inventory"


class CanViewUserActivity(HasFeaturePermission):
    feature_name = "can_view_user_activity"


# ===== صلاحيات HR مبنية على RolePermission =====

class CanViewHRDashboard(HasFeaturePermission):
    feature_name = "can_view_hr_dashboard"


class CanManageEmployees(HasFeaturePermission):
    feature_name = "can_manage_employees"


class CanManageAttendance(HasFeaturePermission):
    feature_name = "can_manage_attendance"


class CanManageHRLeaves(HasFeaturePermission):
    feature_name = "can_manage_hr_leaves"


class CanManageHRPayroll(HasFeaturePermission):
    feature_name = "can_manage_hr_payroll"


class CanManageHRDocuments(HasFeaturePermission):
    feature_name = "can_manage_hr_documents"


class CanManageHRWorkReports(HasFeaturePermission):
    feature_name = "can_manage_hr_work_reports"


class CanManageHRReports(HasFeaturePermission):
    feature_name = "can_manage_hr_reports"


class CanViewHRPerformance(HasFeaturePermission):
    feature_name = "can_view_hr_performance"
