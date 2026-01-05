from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone


class InventoryItem(models.Model):
    VALUATION_METHODS = (
        ("fifo", "FIFO"),
        ("lifo", "LIFO"),
        ("average", "Average Cost"),
        ("standard", "Standard"),
    )

    product = models.ForeignKey(
        "products.Product",
        related_name="inventory_items",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True, default="")
    sku = models.CharField(max_length=64, unique=True)
    barcode = models.CharField(max_length=120, blank=True, default="")
    unit = models.CharField(max_length=50, default="unit")
    valuation_method = models.CharField(
        max_length=20, choices=VALUATION_METHODS, default="fifo"
    )
    quantity_on_hand = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal("0.000")
    )
    reorder_level = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal("0.000")
    )
    reorder_quantity = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal("0.000")
    )
    default_purchase_price = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    last_purchase_price = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    last_sale_price = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    currency = models.CharField(max_length=4, default="SAR")
    location = models.CharField(max_length=120, blank=True, default="")
    category = models.CharField(max_length=120, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sku"]

    def __str__(self):
        return f"{self.sku} - {self.name_ar}"

    @property
    def below_reorder(self) -> bool:
        return self.reorder_level and self.quantity_on_hand <= self.reorder_level


class InventoryTransaction(models.Model):
    TRANSACTION_TYPES = (
        ("in", "Stock In"),
        ("out", "Stock Out"),
        ("adjustment", "Adjustment"),
        ("transfer", "Transfer"),
    )

    item = models.ForeignKey(
        InventoryItem, related_name="transactions", on_delete=models.CASCADE
    )
    transaction_type = models.CharField(
        max_length=20, choices=TRANSACTION_TYPES, default="in"
    )
    quantity = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal("0.000")
    )
    unit_cost = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    total_cost = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    currency = models.CharField(max_length=4, default="SAR")
    reference = models.CharField(max_length=120, blank=True, default="")
    note = models.TextField(blank=True, default="")
    order = models.ForeignKey(
        "orders.Order",
        related_name="inventory_transactions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    purchase_order = models.ForeignKey(
        "accounting.PurchaseOrder",
        related_name="inventory_transactions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    journal_entry = models.ForeignKey(
        "accounting.JournalEntry",
        related_name="inventory_transactions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="inventory_transactions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.item.sku} - {self.transaction_type} ({self.quantity})"

    def save(self, *args, **kwargs):
        # Keep total_cost in sync
        self.total_cost = (self.unit_cost or Decimal("0.00")) * (
            self.quantity or Decimal("0.000")
        )
        super().save(*args, **kwargs)
        # Simple inventory movement update; heavy logic belongs in services.
        if self.item_id:
            qty = self.quantity or Decimal("0.000")
            current = self.item.quantity_on_hand or Decimal("0.000")
            if self.transaction_type == "in":
                self.item.quantity_on_hand = current + qty
            elif self.transaction_type == "out":
                self.item.quantity_on_hand = current - qty
            elif self.transaction_type == "adjustment":
                self.item.quantity_on_hand = qty
            self.item.last_purchase_price = self.unit_cost or self.item.last_purchase_price
            self.item.save(update_fields=["quantity_on_hand", "last_purchase_price", "updated_at"])
