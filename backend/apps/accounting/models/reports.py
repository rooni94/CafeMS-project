from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone

from .journal import AccountingPeriod


class FinancialReport(models.Model):
    REPORT_TYPES = (
        ("profit_loss", "Profit & Loss"),
        ("balance_sheet", "Balance Sheet"),
        ("cash_flow", "Cash Flow"),
        ("aged_receivables", "Aged Receivables"),
        ("aged_payables", "Aged Payables"),
        ("inventory_valuation", "Inventory Valuation"),
        ("tax", "Tax"),
        ("custom", "Custom"),
    )

    name = models.CharField(max_length=200)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    period_start = models.DateField()
    period_end = models.DateField()
    filters = models.JSONField(default=dict, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="generated_reports",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    generated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-generated_at"]

    def __str__(self):
        return f"{self.get_report_type_display()} {self.period_start} - {self.period_end}"


class TaxRecord(models.Model):
    TAX_TYPES = (
        ("vat", "VAT"),
        ("sales", "Sales Tax"),
        ("withholding", "Withholding"),
    )
    FILING_STATUSES = (
        ("draft", "Draft"),
        ("filed", "Filed"),
        ("paid", "Paid"),
    )

    period = models.ForeignKey(
        AccountingPeriod,
        related_name="tax_records",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    tax_type = models.CharField(max_length=32, choices=TAX_TYPES, default="vat")
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.00")
    )
    taxable_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    tax_due = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    tax_paid = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    filing_status = models.CharField(
        max_length=20, choices=FILING_STATUSES, default="draft"
    )
    filed_at = models.DateField(null=True, blank=True)
    reference = models.CharField(max_length=120, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_tax_type_display()} - {self.tax_due} ({self.filing_status})"
