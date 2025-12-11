# backend/apps/accounts/serializers.py
import re
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Address, RolePermission
from .emails import safe_send_mail, build_frontend_url
from .tokens import account_activation_token
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from .models import Address, RolePermission, UserActivity


User = get_user_model()

# نفس نمط الفرونت: حرف صغير + كبير + رقم + رمز خاص + 8 أحرف على الأقل
STRONG_PASSWORD_REGEX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$"
)


class DashboardUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "phone", "role", "is_active", "date_joined"]
        read_only_fields = ["id", "date_joined"]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "phone", "avatar", "address"]
        read_only_fields = ["id", "role", "username"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password1 = serializers.CharField(write_only=True)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user
        old = attrs.get("old_password")
        new1 = attrs.get("new_password1")
        new2 = attrs.get("new_password2")

        if not user.check_password(old):
            raise serializers.ValidationError(
                {"old_password": "كلمة المرور الحالية غير صحيحة."}
            )

        if new1 != new2:
            raise serializers.ValidationError(
                {"new_password2": "كلمة المرور الجديدة غير متطابقة."}
            )

        # تحقق كلمة مرور قوية
        if not STRONG_PASSWORD_REGEX.match(new1):
            raise serializers.ValidationError(
                {
                    "new_password1": (
                        "كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص "
                        "وألا تقل عن 8 أحرف."
                    )
                }
            )

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        new_password = self.validated_data["new_password1"]
        user.set_password(new_password)
        user.save()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "phone"]
        read_only_fields = ["id"]

    def validate_password(self, value: str) -> str:
        # نطبق نفس الشروط القوية في الباك إند كطبقة أمان إضافية
        if not STRONG_PASSWORD_REGEX.match(value):
            raise serializers.ValidationError(
                "كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص وألا تقل عن 8 أحرف."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)

        # ✅ الحساب غير مفعّل حتى يضغط رابط التفعيل
        user.is_active = False
        user.save()

        # نرسل له إيميل تفعيل لو فيه بريد
        if user.email:
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = account_activation_token.make_token(user)

            # صفحة في الفرونت مثلاً: /verify-email
            verify_url = build_frontend_url(
                f"/verify-email?uid={uidb64}&token={token}"
            )

            subject = "تفعيل حسابك – CafeMS Demo"
            message = (
                f"مرحباً {user.username},\n\n"
                "شكراً لتسجيلك في CafeMS Demo.\n"
                "لإكمال عملية التسجيل وتفعيل حسابك، الرجاء الضغط على الرابط التالي:\n\n"
                f"{verify_url}\n\n"
                "إذا لم تقم بالتسجيل في موقعنا، يمكنك تجاهل هذه الرسالة.\n\n"
                "مع تحيات فريق CafeMS Demo."
            )
            safe_send_mail(subject, message, [user.email])

        return user



class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ["id", "label", "details", "is_default", "created_at"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        # لو هذا العنوان افتراضي، اجعل الباقي False
        if validated_data.get("is_default", False):
            Address.objects.filter(user=user).update(is_default=False)
        return Address.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        user = self.context["request"].user
        if validated_data.get("is_default", False):
            Address.objects.filter(user=user).update(is_default=False)
        return super().update(instance, validated_data)

class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = [
            "id",
            "role",
            "can_view_dashboard",
            "can_manage_orders",
            "can_manage_products",
            "can_manage_categories",
            "can_manage_subcategories",
            "can_access_cashier",
            "can_manage_tables",
            "can_manage_inventory",
            "can_view_activity_log",
            "can_manage_support",
            "can_manage_contact_messages",
            "can_manage_users",
            "can_view_user_activity",
            "can_manage_store_settings",
            "can_manage_loyalty",
            "can_view_hr_dashboard",
            "can_manage_employees",
            "can_manage_attendance",
            "can_manage_hr_leaves",
            "can_manage_hr_payroll",
            "can_manage_hr_documents",
            "can_manage_hr_reports",
            "can_manage_hr_work_reports",
            "can_view_hr_performance",
        ]

class UserActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    role = serializers.CharField(source="user.role", read_only=True)
    order_id = serializers.SerializerMethodField()

    class Meta:
        model = UserActivity
        fields = [
            "id",
            "user",
            "user_name",
            "role",

            "path",
            "method",
            "status_code",

            "ip_address",
            "device_type",
            "browser",
            "os",
            "country",
            "city",
            "user_agent",

            "action",
            "order_id",
            "order_status",
            "table_label",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at", "status_code"]

    def get_user_name(self, obj):
        if obj.user:
            # لو عندك first_name/last_name:
            full = obj.user.get_full_name()
            return full or obj.user.username
        return None

    def get_order_id(self, obj):
        return obj.order_id
