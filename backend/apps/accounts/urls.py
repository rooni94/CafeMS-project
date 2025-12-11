# backend/apps/accounts/urls.py
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter

from .views import (
    RegisterView,
    CurrentUserView,
    AddressListCreateView,
    AddressDetailView,
    ChangePasswordView,
    DashboardUserListCreateView,
    DashboardUserDetailView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    VerifyEmailView,
    RolePermissionViewSet,
    MyRolePermissionView,
    UserActivityListView,   
    MyPermissionsAPIView,
)

router = DefaultRouter()
# يعطيك:
# GET    /api/auth/role-permissions/        -> list
# PATCH  /api/auth/role-permissions/<id>/   -> update
router.register(r"role-permissions", RolePermissionViewSet, basename="role-permissions")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", CurrentUserView.as_view(), name="current_user"),

    # تغيير كلمة المرور
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),

    # عناوين المستخدم
    path("addresses/", AddressListCreateView.as_view(), name="address-list-create"),
    path("addresses/<int:pk>/", AddressDetailView.as_view(), name="address-detail"),

    # إدارة المستخدمين من لوحة المدير
    path("users/", DashboardUserListCreateView.as_view(), name="dashboard-users"),
    path("users/<int:pk>/", DashboardUserDetailView.as_view(), name="dashboard-users-detail"),

    # إعادة تعيين كلمة المرور + تفعيل
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password-reset-confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("role-permissions/me/", MyRolePermissionView.as_view(), name="my-role-permissions"),
    path("user-activity/", UserActivityListView.as_view(), name="user-activity"),
    path("my-permissions/", MyPermissionsAPIView.as_view(), name="my-permissions"),
    path("", include(router.urls)),
]

# نضيف مسارات الروتر في النهاية
urlpatterns += router.urls
