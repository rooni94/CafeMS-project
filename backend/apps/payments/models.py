# backend/apps/payments/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.orders.models import Order

from apps.orders.models import Order  # عدّل المسار لو اسم تطبيق الطلبات مختلف


class PaymentMethod(models.Model):
    """
    طرق الدفع المتاحة في النظام.
    المدير يقدر يضيف/يوقف/يرتب هذه الطرق من لوحة التحكم.
    """

    class Code(models.TextChoices):
        CASH = "cash", _("Cash / نقدًا")
        CARD = "card", _("Card (Visa/Master/Mada)")
        TABBY = "tabby", _("Tabby")
        TAMARA = "tamara", _("Tamara")
        APPLE_PAY = "apple_pay", _("Apple Pay")
        GOOGLE_PAY = "google_pay", _("Google Pay")
        MADA = "mada", _("Mada")

    name = models.CharField(max_length=100)
    code = models.CharField(
        max_length=50,
        choices=Code.choices,
        help_text=_("كود ثابت يُستخدم في التكامل مع بوابات الدفع (تابي/تمارا/مدى...)."),
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(
        default=True,
        help_text=_("هل تظهر طريقة الدفع هذه للعملاء؟"),
    )
    is_online = models.BooleanField(
        default=False,
        help_text=_("طرق الدفع التي تحتاج تكامل API (تابي/تمارا/Apple Pay/Google Pay...)."),
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text=_("لترتيب طرق الدفع في واجهة المستخدم."),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]
        unique_together = ("code", "name")

    def __str__(self):
        return self.name


class PaymentTransaction(models.Model):
    """
    سجل عمليات الدفع (سكينه جاهزة للتكامل مع بوابات الدفع).
    حالياً يمكن استخدامها مستقبلاً عند ربط Tabby/Tamara/ApplePay/Mada APIs.
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        AUTHORIZED = "authorized", _("Authorized")
        CAPTURED = "captured", _("Captured")
        FAILED = "failed", _("Failed")
        CANCELED = "canceled", _("Canceled")
        REFUNDED = "refunded", _("Refunded")

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="SAR")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    provider_reference = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("رقم العملية في بوابة الدفع (تابي/تمارا/مدى/ApplePay...)."),
    )
    provider_raw_response = models.JSONField(
        blank=True,
        null=True,
        help_text=_("الاستجابة الخام من بوابة الدفع للاطلاع فقط."),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order_id} – {self.method.code} – {self.status}"
