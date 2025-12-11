import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class LoyaltySettings(models.Model):
    """
    Singleton settings row that controls earn rate, thresholds, and wallet branding.
    """

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    earn_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=1,
        help_text="عدد النقاط لكل 1 ريال يتم إنفاقه.",
    )
    auto_reward_threshold = models.PositiveIntegerField(
        default=100, help_text="الحد الأدنى للنقاط قبل منح مكافأة تلقائية."
    )
    auto_reward_message = models.CharField(
        max_length=255,
        blank=True,
        default="مبروك! تم منحك مكافأة الولاء.",
    )
    reward_discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=5,
        help_text="نسبة الخصم التلقائي عند بلوغ الحد.",
    )
    qr_prefix = models.CharField(
        max_length=20, default="CAFLOY", help_text="بادئة QR/ID لجميع الأعضاء."
    )
    pass_primary_color = models.CharField(max_length=7, default="#f59e0b")
    pass_secondary_color = models.CharField(max_length=7, default="#4c1d95")
    pass_label_color = models.CharField(max_length=7, default="#ffffff")
    pass_logo_url = models.URLField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Loyalty Settings"
        verbose_name_plural = "Loyalty Settings"

    def __str__(self):
        return "Loyalty Settings"

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj


class LoyaltyProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="loyalty_profile",
    )
    membership_id = models.CharField(max_length=32, unique=True, db_index=True)
    qr_token = models.CharField(max_length=64, unique=True)
    points_balance = models.PositiveIntegerField(default=0)
    last_reward_at = models.DateTimeField(null=True, blank=True)
    apple_wallet_pass_id = models.CharField(max_length=120, blank=True, default="")
    google_wallet_pass_id = models.CharField(max_length=120, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"LoyaltyProfile<{self.user}>"

    def ensure_ids(self):
        updated = False
        if not self.membership_id:
            self.membership_id = generate_membership_id()
            updated = True
        if not self.qr_token:
            self.qr_token = uuid.uuid4().hex
            updated = True
        if updated:
            self.save(update_fields=["membership_id", "qr_token"])


class LoyaltyTransaction(models.Model):
    SOURCE_CHOICES = (
        ("order", "Order"),
        ("reward", "Reward"),
        ("manual", "Manual"),
        ("scan", "QR Scan"),
    )
    profile = models.ForeignKey(
        LoyaltyProfile, related_name="transactions", on_delete=models.CASCADE
    )
    order = models.ForeignKey(
        "orders.Order",
        related_name="loyalty_transactions",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="order")
    points_delta = models.IntegerField()
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.profile} ({self.points_delta})"


def generate_membership_id():
    settings_obj = LoyaltySettings.load()
    prefix = settings_obj.qr_prefix or "LOYAL"
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"
