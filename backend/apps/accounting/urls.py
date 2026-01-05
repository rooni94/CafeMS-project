from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AccountingDashboardStatsView,
    AccountingInvoiceViewSet,
    AccountingPeriodViewSet,
    AssetViewSet,
    BankAccountViewSet,
    CashFlowPreviewView,
    ChartOfAccountViewSet,
    ExpenseViewSet,
    FinancialReportRunView,
    FinancialReportViewSet,
    InventoryDashboardView,
    InventoryItemViewSet,
    InventoryTransactionViewSet,
    JournalEntryViewSet,
    PaymentViewSet,
    PurchaseOrderViewSet,
    SupplierViewSet,
    TaxRecordViewSet,
    ReportExportView,
    ReceiptOcrView,
)

router = DefaultRouter()
router.register("periods", AccountingPeriodViewSet, basename="accounting-period")
router.register("chart-of-accounts", ChartOfAccountViewSet, basename="chart-of-accounts")
router.register("journal-entries", JournalEntryViewSet, basename="journal-entry")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("invoices", AccountingInvoiceViewSet, basename="accounting-invoice")
router.register("payments", PaymentViewSet, basename="accounting-payment")
router.register("inventory/items", InventoryItemViewSet, basename="inventory-item")
router.register(
    "inventory/transactions", InventoryTransactionViewSet, basename="inventory-transaction"
)
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("purchase-orders", PurchaseOrderViewSet, basename="purchase-order")
router.register("bank-accounts", BankAccountViewSet, basename="bank-account")
router.register("assets", AssetViewSet, basename="asset")
router.register("reports", FinancialReportViewSet, basename="financial-report")
router.register("tax-records", TaxRecordViewSet, basename="tax-record")

urlpatterns = [
    path("dashboard-stats/", AccountingDashboardStatsView.as_view(), name="accounting-dashboard-stats"),
    path("inventory/", InventoryDashboardView.as_view(), name="accounting-inventory-summary"),
    path("cashflow/preview/", CashFlowPreviewView.as_view(), name="accounting-cashflow-preview"),
    path("reports/run/", FinancialReportRunView.as_view(), name="accounting-report-run"),
    path("reports/export/", ReportExportView.as_view(), name="accounting-report-export"),
    path("ocr/receipt/", ReceiptOcrView.as_view(), name="accounting-receipt-ocr"),
    path("", include(router.urls)),
]
