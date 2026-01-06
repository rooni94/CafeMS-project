# backend/apps/accounts/views.py
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils import timezone
from rest_framework import viewsets, generics, permissions, status, views
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.conf import settings

from .serializers import (
    DashboardUserSerializer,
    RegisterSerializer,
    UserSerializer,
    AddressSerializer,
    ChangePasswordSerializer,
    RolePermissionSerializer,
    UserActivitySerializer, 
    PhoneRegisterStartSerializer,
    PhoneRegisterVerifySerializer,
)
from .models import Address, RolePermission, UserActivity, PushToken
from .emails import safe_send_mail, build_frontend_url
from .tokens import account_activation_token, password_reset_token
from .permissions import IsManager, CanManageUsers, CanViewUserActivity, get_role_permission
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .authentica import AuthenticaError, send_otp as authentica_send_otp, verify_otp as authentica_verify_otp
from .phone import normalize_phone

User = get_user_model()


class DashboardUserListCreateView(generics.ListCreateAPIView):
    """
    GET /api/auth/users/   -> قائمة المستخدمين
    POST /api/auth/users/  -> إنشاء مستخدم جديد (role, email, phone, password)
    """
    serializer_class = DashboardUserSerializer
    permission_classes = [CanManageUsers]

    def get_queryset(self):
        return User.objects.all().order_by("-date_joined")

    def perform_create(self, serializer):
        # هنا نسمح للمدير/من له صلاحية can_manage_users بإنشاء مستخدم مع كلمة مرور
        raw_password = self.request.data.get("password")
        user = serializer.save()
        if raw_password:
            user.set_password(raw_password)
            user.save()


class DashboardUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/auth/users/<id>/      -> تفاصيل
    PATCH /api/auth/users/<id>/    -> تعديل role / تعطيل إلخ
    DELETE /api/auth/users/<id>/   -> حذف المستخدم
    """
    serializer_class = DashboardUserSerializer
    permission_classes = [CanManageUsers]
    queryset = User.objects.all()


class RegisterView(generics.CreateAPIView):
    """
    تسجيل مستخدم جديد (يُستخدم في /api/auth/register/)
    التسجيل لا يتوقف على إرسال الإيميل إطلاقاً.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    # لا نحتاج perform_create هنا، كل المنطق داخل RegisterSerializer.create


class VerifyEmailView(views.APIView):
    """
    GET /api/auth/verify-email/?uid=<uidb64>&token=<token>
    (موجودة لو أحببت تفعيل الحساب مستقبلاً، حالياً الحساب يُفعّل مباشرة عند التسجيل)
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        uidb64 = request.query_params.get("uid")
        token = request.query_params.get("token")

        if not uidb64 or not token:
            return Response(
                {"detail": "رابط التفعيل غير صالح."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except Exception:
            return Response(
                {"detail": "رابط التفعيل غير صالح."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not account_activation_token.check_token(user, token):
            return Response(
                {"detail": "رمز التفعيل غير صالح أو منتهي."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            user.is_active = True
            user.save()

        return Response({"detail": "تم تفعيل حسابك بنجاح. يمكنك الآن تسجيل الدخول."})


class TokenObtainPairByIdentifierView(APIView):
    """
    POST /api/auth/token/
      body: { "username": "<username|email|phone>", "password": "..." }

    Backwards compatible with SimpleJWT while allowing email/phone login.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        identifier = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        if not identifier or not password:
            raise AuthenticationFailed("No active account found with the given credentials")

        user_obj = None
        if "@" in identifier:
            user_obj = User.objects.filter(email__iexact=identifier).first()
        else:
            normalized_phone = normalize_phone(identifier)
            if normalized_phone.startswith("+") and len(normalized_phone) >= 8:
                user_obj = User.objects.filter(phone=normalized_phone).first()

        username = user_obj.username if user_obj else identifier
        user = authenticate(request=request, username=username, password=password)
        if user is None:
            raise AuthenticationFailed("No active account found with the given credentials")

        refresh = RefreshToken.for_user(user)
        return Response({"refresh": str(refresh), "access": str(refresh.access_token)})


class PhoneRegisterStartView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PhoneRegisterStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        resend_seconds = int(getattr(settings, "AUTHENTICA_OTP_RESEND_SECONDS", 60))
        if user.phone_otp_sent_at and (timezone.now() - user.phone_otp_sent_at).total_seconds() < resend_seconds:
            return Response(
                {"detail": "OTP recently sent. Please wait before requesting again."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            result = authentica_send_otp(phone=user.phone)
        except AuthenticaError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        user.phone_otp_sent_at = timezone.now()
        user.save(update_fields=["phone_otp_sent_at"])

        return Response(
            {"detail": result.message or "OTP sent.", "phone": user.phone, "resend_seconds": resend_seconds},
            status=status.HTTP_200_OK,
        )


class PhoneRegisterVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PhoneRegisterVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        otp = serializer.validated_data["otp"]

        try:
            result = authentica_verify_otp(phone=phone, otp=otp)
        except AuthenticaError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if not result.ok:
            return Response({"detail": result.message or "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(phone=phone).order_by("-date_joined").first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        changed_fields = []
        if not user.is_phone_verified:
            user.is_phone_verified = True
            user.phone_verified_at = timezone.now()
            changed_fields += ["is_phone_verified", "phone_verified_at"]
        if not user.is_active:
            user.is_active = True
            changed_fields.append("is_active")

        if changed_fields:
            user.save(update_fields=changed_fields)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "detail": result.message or "OTP verified.",
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(views.APIView):
    """
    طلب رابط إعادة تعيين كلمة المرور
    POST /api/auth/password-reset/
    body: { "email": "user@example.com" }
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        if not email:
            return Response(
                {"detail": "الرجاء إدخال البريد الإلكتروني."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # لأسباب أمنية نرجع نفس الرسالة دائماً
            return Response(
                {
                    "detail": "إذا كان البريد مسجلاً لدينا، ستصل رسالة لإعادة تعيين كلمة المرور."
                },
                status=status.HTTP_200_OK,
            )

        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = password_reset_token.make_token(user)

        frontend_reset = getattr(settings, "FRONTEND_RESET_PASSWORD_URL", "")
        if frontend_reset:
            if "?" in frontend_reset:
                reset_url = f"{frontend_reset}&uid={uidb64}&token={token}"
            else:
                reset_url = f"{frontend_reset}?uid={uidb64}&token={token}"
        else:
            reset_url = build_frontend_url(f"/reset-password?uid={uidb64}&token={token}")

        subject = "إعادة تعيين كلمة المرور – CafeMS Demo"
        message = (
            "مرحبًا!\n\n"
            "وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك.\n"
            "يمكنك تعيين كلمة مرور جديدة من خلال الرابط التالي:\n\n"
            f"{reset_url}\n\n"
            "إذا لم تقم بطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة.\n\n"
            "مع تحيات CafeMS Demo 🌿"
        )

        safe_send_mail(subject, message, [user.email])

        return Response(
            {
                "detail": "إذا كان البريد مسجلاً لدينا، ستصل رسالة لإعادة تعيين كلمة المرور."
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(views.APIView):
    """
    تأكيد إعادة تعيين كلمة المرور
    POST /api/auth/password-reset-confirm/
    body: { "uid": "...", "token": "...", "new_password": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        if not uidb64 or not token or not new_password:
            return Response(
                {"detail": "بيانات غير مكتملة."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except Exception:
            return Response(
                {"detail": "رابط غير صالح."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not password_reset_token.check_token(user, token):
            return Response(
                {"detail": "الرابط غير صالح أو منتهي."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        return Response(
            {"detail": "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول."},
            status=status.HTTP_200_OK,
        )


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """
    إرجاع وتحديث بيانات المستخدم الحالي
    GET  /api/auth/me/
    PUT/PATCH /api/auth/me/
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class AddressListCreateView(generics.ListCreateAPIView):
    """
    عرض كل عناوين المستخدم + إضافة عنوان جديد
    GET  /api/auth/addresses/
    POST /api/auth/addresses/
    """
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by("-created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    عرض / تعديل / حذف عنوان معيّن
    GET    /api/auth/addresses/<pk>/
    PATCH  /api/auth/addresses/<pk>/
    DELETE /api/auth/addresses/<pk>/
    """
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class ChangePasswordView(views.APIView):
    """
    تغيير كلمة المرور للمستخدم الحالي
    POST /api/auth/change-password/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "تم تغيير كلمة المرور بنجاح."},
            status=status.HTTP_200_OK,
        )


class RolePermissionListView(generics.ListAPIView):
    """
    GET /api/auth/role-permissions/
    (للمدير فقط)
    """
    queryset = RolePermission.objects.all().order_by("role")
    serializer_class = RolePermissionSerializer
    permission_classes = [IsManager]


class RolePermissionDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/auth/role-permissions/<role>/
    PATCH /api/auth/role-permissions/<role>/
    """
    queryset = RolePermission.objects.all()
    serializer_class = RolePermissionSerializer
    permission_classes = [IsManager]
    lookup_field = "role"


class RolePermissionViewSet(viewsets.ModelViewSet):
    """
    CRUD لصلاحيات الأدوار:
    - GET    /api/auth/role-permissions/        -> قائمة الصلاحيات لكل دور
    - PATCH  /api/auth/role-permissions/<id>/   -> تعديل صلاحيات دور واحد
    (مسموح فقط للمدير)
    """
    queryset = RolePermission.objects.all().order_by("role")
    serializer_class = RolePermissionSerializer
    permission_classes = [IsManager]

class MyRolePermissionView(views.APIView):
    """
    GET /api/auth/role-permissions/me/
    يرجّع سجل RolePermission الخاص بدور المستخدم الحالي.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        role = getattr(user, "role", None)
        if not role:
            return Response(
                {"detail": "لا يوجد دور مخصص لهذا المستخدم."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            rp = RolePermission.objects.get(role=role)
        except RolePermission.DoesNotExist:
            return Response(
                {"detail": "لم يتم إعداد صلاحيات لهذا الدور بعد."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = RolePermissionSerializer(rp)
        return Response(serializer.data, status=status.HTTP_200_OK)
  
class UserActivityListView(APIView):
    """
    GET /api/auth/user-activity/?limit=200&role=staff&user_id=3
    """
    permission_classes = [CanViewUserActivity]

    def get(self, request, *args, **kwargs):
      qs = UserActivity.objects.select_related("user").order_by("-created_at")

      role = request.query_params.get("role")
      if role:
          qs = qs.filter(user__role=role)

      user_id = request.query_params.get("user_id")
      if user_id:
          qs = qs.filter(user_id=user_id)

      limit = request.query_params.get("limit")
      if limit:
          try:
              limit_int = int(limit)
              qs = qs[:limit_int]
          except ValueError:
              pass

      serializer = UserActivitySerializer(qs, many=True)
      return Response(serializer.data)

class MyPermissionsAPIView(APIView):
    """
    يرجع معلومات المستخدم + صلاحيات دوره من جدول RolePermission.
    GET /api/auth/my-permissions/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        rp = get_role_permission(user)  # من accounts/permissions.py

        rp_data = RolePermissionSerializer(rp).data if rp else None

        return Response(
            {
                "role": getattr(user, "role", None),
                "is_staff": getattr(user, "is_staff", False),
                "is_superuser": getattr(user, "is_superuser", False),
                "permissions": rp_data,
            }
        )


class PushTokenView(APIView):
    """
    Register or deactivate push tokens for the current user.
    POST /api/auth/push-tokens/
    DELETE /api/auth/push-tokens/?token=...
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        token = (request.data.get("token") or "").strip()
        if not token:
            return Response({"detail": "token is required."}, status=status.HTTP_400_BAD_REQUEST)

        platform = (request.data.get("platform") or "unknown").strip().lower()
        device_id = (request.data.get("device_id") or "").strip()
        device_name = (request.data.get("device_name") or "").strip()

        push_token, created = PushToken.objects.update_or_create(
            token=token,
            defaults={
                "user": request.user,
                "platform": platform,
                "device_id": device_id,
                "device_name": device_name,
                "is_active": True,
            },
        )

        return Response(
            {"id": push_token.id, "token": push_token.token},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, *args, **kwargs):
        token = (request.data.get("token") or request.query_params.get("token") or "").strip()
        if not token:
            return Response({"detail": "token is required."}, status=status.HTTP_400_BAD_REQUEST)

        PushToken.objects.filter(user=request.user, token=token).update(is_active=False)
        return Response(status=status.HTTP_204_NO_CONTENT)

