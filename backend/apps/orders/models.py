# backend/apps/orders/models.py
from django.db import models
from django.conf import settings
from apps.products.models import Product


class Table(models.Model):
    STATUS_CHOICES = (
        ("available", "Available"),
        ("occupied", "Occupied"),
        ("reserved", "Reserved"),
        ("maintenance", "Maintenance"),
    )

    label = models.CharField(max_length=60)
    number = models.PositiveIntegerField(null=True, blank=True)
    capacity = models.PositiveIntegerField(default=2)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="available"
    )
    notes = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["number", "label"]

    def __str__(self):
        return self.label or f"Table {self.number or ''}".strip()


class Order(models.Model):
    # حالات الطلب (حياة الطلب نفسه)
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("preparing", "Preparing"),
        ("ready", "Ready"),
        # 👇 هذه الحالات القديمة نُبقيها كما هي حتى لا نكسر أي بيانات/كود قديم
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    )

    # نوع الطلب (أكل بالمحل / سفري / توصيل)
    ORDER_TYPE_CHOICES = (
        ("dine_in", "Dine in"),
        ("takeaway", "Takeaway"),
        ("delivery", "Delivery"),
    )

    # حالة الدفع منفصلة عن حالة الطلب نفسها
    PAYMENT_STATUS_CHOICES = (
        ("pending", "Pending"),    # لم يُدفَع بعد
        ("paid", "Paid"),          # تم الدفع بنجاح
        ("failed", "Failed"),      # دفع فشل
        ("refunded", "Refunded"),  # تم رد المبلغ
    )

    DISCOUNT_CHOICES = (
        ("none", "No discount"),
        ("amount", "Amount"),
        ("percent", "Percent"),
    )

    # طريقة الدفع
    PAYMENT_METHOD_CHOICES = (
        ("cash", "Cash"),
        ("online", "Online"),
        ("card_pos", "Card / POS"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="orders",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )

    # 👇 طريقة الدفع (كاش / أونلاين / جهاز نقاط بيع)
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default="cash",
    )

    # 👇 حالة الدفع (بانك/بوابة دفع)
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="pending",
    )

    # حقل قديم نُبقيه كما هو (ممكن مستقبلاً تعتمده على payment_status == "paid")
    paid = models.BooleanField(default=False)

    # إجمالي الطلب (بدون رسوم التوصيل غالبًا)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # نوع الطلب (أكل بالمحل/سفري/توصيل)
    order_type = models.CharField(
        max_length=20,
        choices=ORDER_TYPE_CHOICES,
        default="takeaway",
    )
    table = models.ForeignKey(
        Table,
        related_name="orders",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    # إعدادات التوصيل الحالية التي عندك – نُبقيها كما هي
    delivery = models.BooleanField(default=False)  # False = استلام من المتجر
    delivery_address = models.TextField(blank=True, null=True)

    # 👇 إضافة رسوم توصيل مستقلة
    delivery_fee = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
    )

    discount_type = models.CharField(
        max_length=20,
        choices=DISCOUNT_CHOICES,
        default="none",
    )
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    note = models.TextField(blank=True, default="")
    served_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="served_orders",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        related_name="items",
        on_delete=models.CASCADE,
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    # السعر وقت الطلب
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"


class OrderActivityLog(models.Model):
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,  
        null=True,
        blank=True,
        related_name="activity_logs",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_activities",
    )
    action = models.CharField(max_length=200)

    old_status = models.CharField(max_length=20, null=True, blank=True)
    new_status = models.CharField(max_length=20, null=True, blank=True)

    # نوع الحدث (تغيير حالة، إنشاء، إلغاء..)
    event_type = models.CharField(max_length=50, null=True, blank=True)

    # الشبكة والجهاز
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    browser = models.CharField(max_length=100, null=True, blank=True)
    os = models.CharField(max_length=100, null=True, blank=True)
    device_type = models.CharField(max_length=100, null=True, blank=True)

    # الموقع الجغرافي
    country = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.order_id} - {self.action}"


class InventoryAdjustment(models.Model):
    REASON_CHOICES = (
        ("manual", "Manual"),
        ("restock", "Restock"),
        ("correction", "Correction"),
        ("sale", "Sale"),
    )

    product = models.ForeignKey(
        Product, related_name="inventory_adjustments", on_delete=models.CASCADE
    )
    order = models.ForeignKey(
        "orders.Order",
        related_name="inventory_adjustments",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    delta = models.IntegerField()
    reason = models.CharField(
        max_length=20, choices=REASON_CHOICES, default="manual"
    )
    note = models.CharField(max_length=255, blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="inventory_adjustments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product} ({self.delta})"
