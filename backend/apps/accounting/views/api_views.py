from datetime import datetime
from django.db import models
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.accounts.permissions import (
    CanManageAccounting,
    CanManageFinancialReports,
    CanManageInventory,
    CanManagePayments,
    CanManageSuppliers,
    CanViewAccounting,
)
from ..models import (
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
    Payment,
    JournalEntryLine,
    PurchaseOrder,
    Supplier,
    TaxRecord,
)
from ..serializers import (
    AccountingInvoiceSerializer,
    AccountingPeriodSerializer,
    AssetSerializer,
    BankAccountSerializer,
    ChartOfAccountSerializer,
    ExpenseSerializer,
    FinancialReportSerializer,
    InventoryItemSerializer,
    InventoryTransactionSerializer,
    JournalEntrySerializer,
    PaymentSerializer,
    PurchaseOrderSerializer,
    SupplierSerializer,
    TaxRecordSerializer,
)


class AccountingPeriodViewSet(viewsets.ModelViewSet):
    queryset = AccountingPeriod.objects.all().order_by("-start_date")
    serializer_class = AccountingPeriodSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageAccounting]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name_ar", "name_en"]
    ordering_fields = ["start_date", "end_date"]


class ChartOfAccountViewSet(viewsets.ModelViewSet):
    queryset = ChartOfAccount.objects.all().order_by("code")
    serializer_class = ChartOfAccountSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageAccounting]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["code", "name_ar", "name_en", "type"]
    ordering_fields = ["code", "name_ar", "type"]


class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = (
        JournalEntry.objects.select_related("period")
        .prefetch_related("lines__account")
        .order_by("-date", "-id")
    )
    serializer_class = JournalEntrySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["reference", "memo", "lines__account__code"]
    ordering_fields = ["date", "created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            perms = [permissions.IsAuthenticated(), CanViewAccounting()]
        else:
            perms = [permissions.IsAuthenticated(), CanManageAccounting()]
        return perms

    def perform_create(self, serializer):
        serializer.save()


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by("name_ar")
    serializer_class = SupplierSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name_ar", "name_en", "email", "phone"]
    ordering_fields = ["name_ar", "created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated(), CanViewAccounting()]
        return [permissions.IsAuthenticated(), CanManageSuppliers()]


class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.all().order_by("name")
    serializer_class = BankAccountSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "account_number", "iban", "bank_name"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated(), CanViewAccounting()]
        return [permissions.IsAuthenticated(), CanManagePayments()]


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related("supplier").all().order_by("-expense_date")
    serializer_class = ExpenseSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description", "category", "supplier__name_ar"]
    ordering_fields = ["expense_date", "amount"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated(), CanViewAccounting()]
        return [permissions.IsAuthenticated(), CanManageAccounting()]


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related("supplier").all().order_by("-created_at")
    serializer_class = PurchaseOrderSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["reference", "supplier__name_ar", "status"]
    ordering_fields = ["created_at", "expected_date", "status"]
    permission_classes = [permissions.IsAuthenticated, CanManageAccounting]


class AccountingInvoiceViewSet(viewsets.ModelViewSet):
    queryset = AccountingInvoice.objects.select_related("invoice", "order", "customer").all()
    serializer_class = AccountingInvoiceSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["invoice__number", "order__id", "customer__username", "status"]
    ordering_fields = ["issue_date", "due_date", "total_amount"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated(), CanViewAccounting()]
        return [permissions.IsAuthenticated(), CanManageAccounting()]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related(
        "invoice", "bank_account", "supplier", "customer"
    ).all()
    serializer_class = PaymentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["reference", "method", "direction", "status"]
    ordering_fields = ["paid_at", "amount"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated(), CanViewAccounting()]
        return [permissions.IsAuthenticated(), CanManagePayments()]


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by("sku")
    serializer_class = InventoryItemSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["sku", "name_ar", "name_en", "barcode"]
    ordering_fields = ["sku", "quantity_on_hand", "reorder_level"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated(), CanViewAccounting()]
        return [permissions.IsAuthenticated(), CanManageInventory()]

    def _ensure_seeded(self):
        """
        Seed inventory items from existing products if migrations/signals have not created them yet.
        This prevents empty dropdowns on first load without running the backfill.
        """
        if InventoryItem.objects.exists():
            return
        try:
            from apps.products.models import Product
        except Exception:
            return
        for product in Product.objects.all():
            sku = f"SKU-{product.id}"
            InventoryItem.objects.get_or_create(
                product=product,
                defaults={
                    "name_ar": getattr(product, "name", "") or sku,
                    "name_en": getattr(product, "name", "") or sku,
                    "sku": sku,
                    "barcode": getattr(product, "barcode", "") or "",
                    "quantity_on_hand": getattr(product, "stock", 0) or 0,
                    "reorder_level": getattr(product, "minimum_stock", 0) or 0,
                    "valuation_method": "fifo",
                    "default_purchase_price": 0,
                    "last_purchase_price": 0,
                    "last_sale_price": getattr(product, "price", 0) or 0,
                },
            )

    def list(self, request, *args, **kwargs):
        self._ensure_seeded()
        return super().list(request, *args, **kwargs)


class InventoryTransactionViewSet(viewsets.ModelViewSet):
    queryset = (
        InventoryTransaction.objects.select_related("item", "order", "purchase_order")
        .all()
        .order_by("-created_at")
    )
    serializer_class = InventoryTransactionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["reference", "transaction_type", "item__sku"]
    ordering_fields = ["created_at", "quantity"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated(), CanViewAccounting()]
        return [permissions.IsAuthenticated(), CanManageInventory()]


class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related(
        "depreciation_expense_account", "accumulated_depreciation_account"
    ).all()
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageAccounting]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "category"]
    ordering_fields = ["name", "acquisition_date", "current_book_value"]


class FinancialReportViewSet(viewsets.ModelViewSet):
    queryset = FinancialReport.objects.all().order_by("-generated_at")
    serializer_class = FinancialReportSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinancialReports]


class TaxRecordViewSet(viewsets.ModelViewSet):
    queryset = TaxRecord.objects.select_related("period").all().order_by("-created_at")
    serializer_class = TaxRecordSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinancialReports]


class AccountingDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewAccounting]

    def get(self, request, *args, **kwargs):
        today = timezone.now().date()
        month_start = today.replace(day=1)

        incoming_qs = Payment.objects.filter(direction="incoming", status__in=["completed", "reconciled"])
        outgoing_qs = Payment.objects.filter(direction="outgoing", status__in=["completed", "reconciled"])

        revenue_today = incoming_qs.filter(paid_at__date=today).aggregate(total=Sum("amount"))["total"] or 0
        revenue_month = incoming_qs.filter(paid_at__date__gte=month_start).aggregate(total=Sum("amount"))["total"] or 0
        expenses_month = outgoing_qs.filter(paid_at__date__gte=month_start).aggregate(total=Sum("amount"))["total"] or 0
        payroll_month = Payment.objects.filter(reference__startswith="PAYROLL-", paid_at__date__gte=month_start).aggregate(total=Sum("amount"))["total"] or 0

        unpaid_invoices = AccountingInvoice.objects.filter(status__in=["unpaid", "partial", "overdue"]).count()
        low_stock_items = InventoryItem.objects.filter(
            Q(reorder_level__gt=0) & Q(quantity_on_hand__lte=models.F("reorder_level"))
        ).count()
        cash_balance = BankAccount.objects.aggregate(total=Sum("current_balance"))["total"] or 0

        data = {
            "revenue_today": revenue_today,
            "revenue_month": revenue_month,
            "expenses_month": expenses_month,
            "payroll_month": payroll_month,
            "cash_balance": cash_balance,
            "unpaid_invoices": unpaid_invoices,
            "low_stock_items": low_stock_items,
        }
        return Response(data)


class InventoryDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewAccounting]

    def get(self, request, *args, **kwargs):
        items = InventoryItem.objects.all()
        summary = {
            "total_items": items.count(),
            "low_stock_items": items.filter(
                Q(reorder_level__gt=0) & Q(quantity_on_hand__lte=models.F("reorder_level"))
            ).count(),
            "out_of_stock": items.filter(quantity_on_hand__lte=0).count(),
        }
        return Response(summary)


class CashFlowPreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewAccounting]

    def get(self, request, *args, **kwargs):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        qs = Payment.objects.filter(status__in=["completed", "reconciled"])
        if start_date:
            qs = qs.filter(paid_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(paid_at__date__lte=end_date)

        incoming = qs.filter(direction="incoming").aggregate(total=Sum("amount"))["total"] or 0
        outgoing = qs.filter(direction="outgoing").aggregate(total=Sum("amount"))["total"] or 0
        return Response({"incoming": incoming, "outgoing": outgoing, "net": (incoming or 0) - (outgoing or 0)})


class FinancialReportRunView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageFinancialReports]

    def post(self, request, *args, **kwargs):
        report_type = request.data.get("report_type", "profit_loss")
        start_date = request.data.get("period_start")
        end_date = request.data.get("period_end")

        try:
            start = datetime.fromisoformat(start_date).date() if start_date else timezone.now().date().replace(day=1)
            end = datetime.fromisoformat(end_date).date() if end_date else timezone.now().date()
        except Exception:
            return Response({"detail": "Invalid period dates."}, status=400)

        lines = (
            JournalEntryLine.objects.filter(entry__date__range=[start, end])
            .select_related("account")
            .values("account__type")
            .annotate(total_debit=Sum("debit"), total_credit=Sum("credit"))
        )
        payload = {
            "period_start": str(start),
            "period_end": str(end),
            "lines": list(lines),
        }
        report = FinancialReport.objects.create(
            name=f"{report_type} {start} - {end}",
            report_type=report_type,
            period_start=start,
            period_end=end,
            payload=payload,
            generated_by=request.user,
        )
        data = FinancialReportSerializer(report).data
        return Response(data, status=201)


class ReportExportView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageFinancialReports]

    def _handle(self, report_type: str, fmt: str):
        if fmt not in ("pdf", "excel", "csv"):
            return Response({"detail": "Unsupported format."}, status=status.HTTP_400_BAD_REQUEST)
        export_path = f"/media/exports/{report_type}-{timezone.now().strftime('%Y%m%d%H%M%S')}.{ 'pdf' if fmt=='pdf' else 'xlsx' if fmt=='excel' else 'csv' }"
        return Response({"status": "queued", "export_url": export_path})

    def post(self, request, *args, **kwargs):
        report_type = request.data.get("report_type", "profit_loss")
        fmt = (request.data.get("format") or "pdf").lower()
        return self._handle(report_type, fmt)

    def get(self, request, *args, **kwargs):
        report_type = request.query_params.get("report_type", "profit_loss")
        fmt = (request.query_params.get("format") or "pdf").lower()
        return self._handle(report_type, fmt)


class ReceiptOcrView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageAccounting]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"detail": "يرجى رفع صورة الإيصال."}, status=status.HTTP_400_BAD_REQUEST)
        # Placeholder OCR response; integrate real OCR later.
        text_preview = f"OCR text extracted from {file_obj.name}"
        return Response({"text": text_preview, "amount": None, "currency": "SAR"})
