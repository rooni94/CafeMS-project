from decimal import Decimal
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class AccountingPeriod(models.Model):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("open", "Open"),
        ("closed", "Closed"),
        ("locked", "Locked"),
    )

    name_ar = models.CharField(max_length=120)
    name_en = models.CharField(max_length=120, blank=True, default="")
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    base_currency = models.CharField(max_length=4, default="SAR")
    is_default = models.BooleanField(default=False)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]
        verbose_name = "Accounting Period"
        verbose_name_plural = "Accounting Periods"

    def clean(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Start date must be before end date.")

    def save(self, *args, **kwargs):
        if self.is_default:
            AccountingPeriod.objects.exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name_ar} ({self.start_date} - {self.end_date})"


class ChartOfAccount(models.Model):
    ACCOUNT_TYPES = (
        ("asset", "Asset"),
        ("liability", "Liability"),
        ("equity", "Equity"),
        ("revenue", "Revenue"),
        ("expense", "Expense"),
        ("contra_asset", "Contra Asset"),
        ("contra_liability", "Contra Liability"),
        ("contra_revenue", "Contra Revenue"),
    )

    code = models.CharField(max_length=32, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True, default="")
    type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    parent = models.ForeignKey(
        "self", null=True, blank=True, related_name="children", on_delete=models.SET_NULL
    )
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    allow_manual_entries = models.BooleanField(default=True)
    currency = models.CharField(max_length=4, default="SAR")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "Chart of Account"
        verbose_name_plural = "Chart of Accounts"

    def __str__(self):
        return f"{self.code} - {self.name_ar}"

    @property
    def level(self) -> int:
        if not self.parent:
            return 1
        return (self.parent.level or 0) + 1


class JournalEntry(models.Model):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("posted", "Posted"),
        ("voided", "Voided"),
    )

    period = models.ForeignKey(
        AccountingPeriod,
        related_name="journal_entries",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    date = models.DateField(default=timezone.now)
    reference = models.CharField(max_length=64, blank=True, default="")
    memo = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    auto_created = models.BooleanField(
        default=False,
        help_text="True when generated automatically from sales/purchases/stock.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_journal_entries",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="approved_journal_entries",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    source_content_type = models.ForeignKey(
        ContentType, on_delete=models.SET_NULL, null=True, blank=True
    )
    source_object_id = models.PositiveIntegerField(null=True, blank=True)
    source_object = GenericForeignKey("source_content_type", "source_object_id")
    currency = models.CharField(max_length=4, default="SAR")
    exchange_rate = models.DecimalField(
        max_digits=12, decimal_places=6, default=Decimal("1.0")
    )
    total_debit = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    total_credit = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"JournalEntry #{self.id} {self.reference or ''}".strip()

    @property
    def is_balanced(self) -> bool:
        return (self.total_debit or Decimal("0")) == (self.total_credit or Decimal("0"))

    def recalc_totals(self, save: bool = True):
        totals = self.lines.aggregate(
            debit=models.Sum("debit"), credit=models.Sum("credit")
        )
        self.total_debit = totals.get("debit") or Decimal("0.00")
        self.total_credit = totals.get("credit") or Decimal("0.00")
        if save:
            self.save(update_fields=["total_debit", "total_credit", "updated_at"])


class JournalEntryLine(models.Model):
    entry = models.ForeignKey(
        JournalEntry, related_name="lines", on_delete=models.CASCADE
    )
    account = models.ForeignKey(
        ChartOfAccount, related_name="journal_lines", on_delete=models.PROTECT
    )
    description = models.CharField(max_length=255, blank=True, default="")
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=4, default="SAR")
    exchange_rate = models.DecimalField(
        max_digits=12, decimal_places=6, default=Decimal("1.0")
    )
    amount_base = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    product = models.ForeignKey(
        "products.Product",
        related_name="journal_lines",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    order = models.ForeignKey(
        "orders.Order",
        related_name="journal_lines",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    inventory_item = models.ForeignKey(
        "accounting.InventoryItem",
        related_name="journal_lines",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    source_content_type = models.ForeignKey(
        ContentType, on_delete=models.SET_NULL, null=True, blank=True
    )
    source_object_id = models.PositiveIntegerField(null=True, blank=True)
    source_object = GenericForeignKey("source_content_type", "source_object_id")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["entry_id", "id"]

    def __str__(self):
        return f"{self.account.code} - D:{self.debit} C:{self.credit}"

    def clean(self):
        if self.debit and self.credit and self.debit > 0 and self.credit > 0:
            raise ValidationError("A line cannot have both debit and credit amounts.")

    def save(self, *args, **kwargs):
        base_amount = (self.debit or Decimal("0.0")) - (self.credit or Decimal("0.0"))
        rate = self.exchange_rate or Decimal("1.0")
        try:
            self.amount_base = (base_amount or Decimal("0.0")) * rate
        except Exception:
            self.amount_base = base_amount or Decimal("0.0")
        super().save(*args, **kwargs)
        # Keep parent totals in sync.
        if self.entry_id:
            self.entry.recalc_totals(save=True)


class Supplier(models.Model):
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True, default="")
    contact_name = models.CharField(max_length=200, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    tax_number = models.CharField(max_length=100, blank=True, default="")
    payment_terms = models.CharField(max_length=120, blank=True, default="Net 30")
    credit_limit = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    currency = models.CharField(max_length=4, default="SAR")
    address = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name_ar"]

    def __str__(self):
        return self.name_ar


class BankAccount(models.Model):
    ACCOUNT_TYPES = (
        ("cash", "Cash"),
        ("bank", "Bank"),
        ("wallet", "Wallet"),
    )

    name = models.CharField(max_length=120)
    account_number = models.CharField(max_length=120, blank=True, default="")
    iban = models.CharField(max_length=120, blank=True, default="")
    bank_name = models.CharField(max_length=120, blank=True, default="")
    type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default="cash")
    currency = models.CharField(max_length=4, default="SAR")
    current_balance = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.currency})"


class Expense(models.Model):
    CATEGORY_CHOICES = (
        ("operational", "Operational"),
        ("payroll", "Payroll"),
        ("utilities", "Utilities"),
        ("marketing", "Marketing"),
        ("tax", "Tax"),
        ("other", "Other"),
    )
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("approved", "Approved"),
        ("paid", "Paid"),
        ("partial", "Partial"),
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default="operational"
    )
    amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.00")
    )
    tax_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    total_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    currency = models.CharField(max_length=4, default="SAR")
    expense_date = models.DateField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    supplier = models.ForeignKey(
        Supplier,
        related_name="expenses",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    attachment = models.FileField(upload_to="expenses/", null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_expenses",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-expense_date", "-id"]

    def __str__(self):
        return self.title


class PurchaseOrder(models.Model):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("approved", "Approved"),
        ("sent", "Sent"),
        ("received", "Received"),
        ("closed", "Closed"),
        ("cancelled", "Cancelled"),
    )

    supplier = models.ForeignKey(
        Supplier, related_name="purchase_orders", on_delete=models.PROTECT
    )
    reference = models.CharField(max_length=64, blank=True, default="")
    expected_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    currency = models.CharField(max_length=4, default="SAR")
    tax_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    total_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    note = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_purchase_orders",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="approved_purchase_orders",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    received_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"PO-{self.id}"


class AccountingInvoice(models.Model):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("unpaid", "Unpaid"),
        ("partial", "Partial"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
        ("cancelled", "Cancelled"),
    )

    invoice = models.OneToOneField(
        "invoices.Invoice",
        related_name="accounting_extension",
        on_delete=models.CASCADE,
    )
    order = models.ForeignKey(
        "orders.Order",
        related_name="accounting_invoices",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="accounting_invoices",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="unpaid")
    currency = models.CharField(max_length=4, default="SAR")
    total_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    tax_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    discount_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    paid_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-issue_date", "-id"]

    def __str__(self):
        return f"AccountingInvoice #{self.invoice_id}"

    @property
    def balance_due(self) -> Decimal:
        return (self.total_amount or Decimal("0.00")) - (self.paid_amount or Decimal("0.00"))


class Payment(models.Model):
    DIRECTION_CHOICES = (("incoming", "Incoming"), ("outgoing", "Outgoing"))
    METHOD_CHOICES = (
        ("cash", "Cash"),
        ("card", "Card"),
        ("bank_transfer", "Bank Transfer"),
        ("wallet", "Wallet"),
    )
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
        ("reconciled", "Reconciled"),
    )

    direction = models.CharField(
        max_length=20, choices=DIRECTION_CHOICES, default="incoming"
    )
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default="cash")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    currency = models.CharField(max_length=4, default="SAR")
    exchange_rate = models.DecimalField(
        max_digits=12, decimal_places=6, default=Decimal("1.0")
    )
    paid_at = models.DateTimeField(default=timezone.now)
    reference = models.CharField(max_length=120, blank=True, default="")
    note = models.TextField(blank=True, default="")
    invoice = models.ForeignKey(
        AccountingInvoice,
        related_name="payments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    expense = models.ForeignKey(
        Expense,
        related_name="payments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    order = models.ForeignKey(
        "orders.Order",
        related_name="accounting_payments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    bank_account = models.ForeignKey(
        BankAccount,
        related_name="payments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    supplier = models.ForeignKey(
        Supplier,
        related_name="payments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="received_payments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_payments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    journal_entry = models.OneToOneField(
        JournalEntry,
        related_name="payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-paid_at", "-id"]

    def __str__(self):
        return f"Payment {self.id} - {self.amount} {self.currency}"


class Asset(models.Model):
    DEPRECIATION_METHODS = (
        ("straight_line", "Straight line"),
        ("double_declining", "Double declining"),
        ("none", "None"),
    )

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=120, blank=True, default="")
    acquisition_date = models.DateField(default=timezone.now)
    acquisition_cost = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    salvage_value = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    useful_life_months = models.PositiveIntegerField(default=36)
    depreciation_method = models.CharField(
        max_length=32, choices=DEPRECIATION_METHODS, default="straight_line"
    )
    last_depreciation_date = models.DateField(null=True, blank=True)
    next_depreciation_date = models.DateField(null=True, blank=True)
    depreciation_expense_account = models.ForeignKey(
        ChartOfAccount,
        related_name="asset_depreciation_expense",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    accumulated_depreciation_account = models.ForeignKey(
        ChartOfAccount,
        related_name="asset_accumulated_depreciation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    current_book_value = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
