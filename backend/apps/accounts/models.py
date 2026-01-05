# backend/apps/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class User(AbstractUser):
    ROLE_CHOICES = (
        ('customer', 'Customer'),
        ('staff', 'Staff'),
        ('supervisor', 'Supervisor'),
        ('manager', 'Manager'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=32, blank=True, null=True)
    is_phone_verified = models.BooleanField(default=False)
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    phone_otp_sent_at = models.DateTimeField(null=True, blank=True)

    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)

    HR_ROLE_CHOICES = (
        ("none", "None"),
        ("staff", "HR Staff"),
        ("supervisor", "HR Supervisor"),
        ("manager", "HR Manager"),
    )
    hr_role = models.CharField(max_length=20, choices=HR_ROLE_CHOICES, default="none")

    def __str__(self):
        return self.username
class Address(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="addresses",
    )
    label = models.CharField(max_length=100)  # مثل: المنزل، العمل
    details = models.TextField()
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.label} - {self.user.username}"


class RolePermission(models.Model):
    ROLE_CHOICES = (
        ("manager", "Manager"),
        ("supervisor", "Supervisor"),
        ("staff", "Staff"),
        ("customer", "Customer"),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, unique=True)
    can_view_dashboard = models.BooleanField(default=False)
    can_manage_orders = models.BooleanField(default=False)
    can_manage_products = models.BooleanField(default=False)
    can_manage_categories = models.BooleanField(default=False)
    can_manage_subcategories = models.BooleanField(default=False)
    can_access_cashier = models.BooleanField(default=False)
    can_manage_tables = models.BooleanField(default=False)
    can_manage_inventory = models.BooleanField(default=False)
    can_view_activity_log = models.BooleanField(default=False)
    can_manage_support = models.BooleanField(default=False)
    can_manage_contact_messages = models.BooleanField(default=False)
    can_manage_users = models.BooleanField(default=False)
    can_view_user_activity = models.BooleanField(default=False)
    can_manage_store_settings = models.BooleanField(default=False)
    can_manage_loyalty = models.BooleanField(default=False)
    can_view_hr_dashboard = models.BooleanField(default=False)
    can_manage_employees = models.BooleanField(default=False)
    can_manage_attendance = models.BooleanField(default=False)
    can_manage_hr_leaves = models.BooleanField(default=False)
    can_manage_hr_payroll = models.BooleanField(default=False)
    can_manage_hr_documents = models.BooleanField(default=False)
    can_manage_hr_reports = models.BooleanField(default=False)
    can_manage_hr_work_reports = models.BooleanField(default=False)
    can_view_hr_performance = models.BooleanField(default=False)
    can_view_accounting = models.BooleanField(default=False)
    can_manage_accounting = models.BooleanField(default=False)
    can_manage_financial_reports = models.BooleanField(default=False)
    can_manage_payments = models.BooleanField(default=False)
    can_manage_suppliers = models.BooleanField(default=False)

    def __str__(self):
        return self.get_role_display()
    
class UserActivity(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities",
    )

    # مسار الطلب (URL path)
    path = models.CharField(max_length=255, null=True, blank=True)

    # نوع الطلب (GET / POST ...)
    method = models.CharField(max_length=10, null=True, blank=True)

    # كود الاستجابة
    status_code = models.PositiveIntegerField(null=True, blank=True)

    # الشبكة والجهاز
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    # اسم الجهاز/نوعه (موبايل / ديسكتوب..)
    device_type = models.CharField(max_length=100, null=True, blank=True)

    browser = models.CharField(max_length=100, null=True, blank=True)
    os = models.CharField(max_length=100, null=True, blank=True)

    # الموقع (نتركها فاضية حالياً لحد ما توصلها من خدمة GeoIP)
    country = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)

    # وصف النشاط (اختياري)
    action = models.CharField(max_length=200, null=True, blank=True)
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_activity_entries",
    )
    table_label = models.CharField(max_length=120, blank=True, default="")
    order_status = models.CharField(max_length=50, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.path or self.action or ''}"
