# backend/apps/hr/permissions.py
from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsHRManager(permissions.BasePermission):
    """
    يسمح فقط:
    - superuser
    - staff
    - role == 'manager'
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return True

        role = getattr(user, "role", None)
        if role == "manager":
            return True

        return False
