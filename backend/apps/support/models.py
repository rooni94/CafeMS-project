from django.db import models
from django.conf import settings
from django.utils import timezone
import datetime

User = settings.AUTH_USER_MODEL


class Conversation(models.Model):
    """
    محادثة دعم بين عميل أو ضيف والدعم.
    - لو العميل مسجّل: نخزن في customer.
    - لو ضيف: نخزن الاسم/الإيميل في حقول guest_* ونضع is_guest = True.
    """
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="support_conversations",
        null=True,
        blank=True,
    )

    # اسم العميل كما يظهر في سجل المحادثات (اختياري)
    customer_name = models.CharField(max_length=100, null=True, blank=True)

    # بيانات الضيف:
    is_guest = models.BooleanField(default=False)
    guest_name = models.CharField(max_length=100, null=True, blank=True)
    guest_email = models.EmailField(null=True, blank=True)

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="assigned_conversations",
        null=True,
        blank=True,
    )

    is_closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now=True)

    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="closed_support_conversations",
    )

    # حذف منطقي (soft delete)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deleted_support_conversations",
    )

    # فلاغ لإيقاف الرد الآلي بعد طلب موظف:
    bot_disabled = models.BooleanField(default=False)

    def __str__(self):
        label = self.customer or self.guest_email or "Guest"
        return f"Conversation #{self.id} - {label}"


class SupportMessage(models.Model):
    SENDER_TYPES = (
        ("customer", "عميل"),
        ("staff", "موظف"),
        ("supervisor", "مشرف"),
        ("manager", "مدير"),
        ("bot", "رد آلي"),
        ("guest", "ضيف"),
    )

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_messages",
    )
    sender_type = models.CharField(max_length=20, choices=SENDER_TYPES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read_by_customer = models.BooleanField(default=False)
    is_read_by_support = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender_type} @ Conv {self.conversation_id}: {self.content[:30]}"


class GuestEmailVerification(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def is_expired(self):
        # صلاحية 15 دقيقة
        return self.created_at < timezone.now() - datetime.timedelta(minutes=15)

    def __str__(self):
        return f"{self.email} - {self.code}"


class SupportStaffActivity(models.Model):
    """
    سجل نشاط موظفي الدعم:
    - reply               → رد على محادثة دعم
    - delete_conversation → حذف محادثة دعم
    """

    ACTION_CHOICES = (
        ("reply", "رد على محادثة دعم"),
        ("delete_conversation", "حذف محادثة دعم"),
    )

    staff = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_activities",
        verbose_name="الموظف",
    )

    # لتسهيل العرض بدون join
    staff_name = models.CharField(max_length=150, null=True, blank=True)
    staff_role = models.CharField(max_length=50, null=True, blank=True)

    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES)

    # نخليها SET_NULL عشان السجل يبقى حتى لو المحادثة انحذفت
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities",
    )

    # الشخص الذي تم الرد عليه (عميل / ضيف)
    target_name = models.CharField(max_length=150, null=True, blank=True)
    target_email = models.EmailField(null=True, blank=True)

    # معلومات تقنية (اختيارية)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    browser = models.CharField(max_length=100, null=True, blank=True)
    os = models.CharField(max_length=100, null=True, blank=True)
    device_type = models.CharField(max_length=50, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)

    # محتوى الرد أو ملاحظة عن النشاط (اختياري)
    message = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        staff_name = self.staff_name or (getattr(self.staff, "username", None)) or "مجهول"
        return f"{self.get_action_type_display()} – {staff_name} – {self.created_at:%Y-%m-%d %H:%M}"
