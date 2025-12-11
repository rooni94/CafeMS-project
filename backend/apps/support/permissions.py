# backend/apps/support/permissions.py
from apps.accounts.permissions import CanManageSupport


class IsEmployeeOrManager(CanManageSupport):
    """
    صلاحية موظفي/مديري الدعم مبنية على can_manage_support في RolePermission.
    - المدير دائماً مسموح له.
    - المشرف/الموظف تُحدد صلاحيتهم من لوحة "صلاحيات الأدوار".
    """
    pass
