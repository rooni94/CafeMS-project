from django.contrib import admin

from .models import (
    AccountingInvoice,
    AccountingPeriod,
    Asset,
    BankAccount,
    ChartOfAccount,
    Expense,
    FinancialReport,
    InventoryItem,
    InventoryTransaction,
    JournalEntry,
    JournalEntryLine,
    Payment,
    PurchaseOrder,
    Supplier,
    TaxRecord,
)


@admin.register(ChartOfAccount)
class ChartOfAccountAdmin(admin.ModelAdmin):
    list_display = ("code", "name_ar", "type", "currency", "is_active")
    search_fields = ("code", "name_ar", "name_en")
    list_filter = ("type", "currency", "is_active")


class JournalEntryLineInline(admin.TabularInline):
    model = JournalEntryLine
    extra = 0


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "reference", "date", "status", "total_debit", "total_credit")
    list_filter = ("status", "currency")
    search_fields = ("reference", "memo")
    inlines = [JournalEntryLineInline]


@admin.register(AccountingPeriod)
class AccountingPeriodAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "start_date", "end_date", "status", "is_default")
    list_filter = ("status",)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "phone", "email", "payment_terms", "is_active")
    search_fields = ("name_ar", "phone", "email")


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "currency", "current_balance", "is_default")


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "amount", "tax_amount", "status", "expense_date")
    list_filter = ("category", "status")
    search_fields = ("title", "description")


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "supplier", "status", "total_amount", "expected_date")
    list_filter = ("status",)


@admin.register(AccountingInvoice)
class AccountingInvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice", "status", "total_amount", "paid_amount", "currency")
    list_filter = ("status",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "direction", "method", "status", "amount", "currency", "paid_at")
    list_filter = ("direction", "status", "method")
    search_fields = ("reference",)


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ("sku", "name_ar", "quantity_on_hand", "reorder_level", "valuation_method")
    search_fields = ("sku", "name_ar", "name_en")


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ("item", "transaction_type", "quantity", "unit_cost", "created_at")
    list_filter = ("transaction_type",)


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "acquisition_date", "current_book_value")


@admin.register(FinancialReport)
class FinancialReportAdmin(admin.ModelAdmin):
    list_display = ("name", "report_type", "period_start", "period_end", "generated_at")


@admin.register(TaxRecord)
class TaxRecordAdmin(admin.ModelAdmin):
    list_display = ("tax_type", "tax_due", "filing_status", "filed_at")
    list_filter = ("tax_type", "filing_status")
