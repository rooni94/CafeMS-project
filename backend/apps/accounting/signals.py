from decimal import Decimal
from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.orders.models import Order
from apps.invoices.models import Invoice
from apps.payments.models import PaymentTransaction
from apps.hr.models import Payroll
from apps.products.models import Product

from .models import (
    AccountingInvoice,
    AccountingPeriod,
    ChartOfAccount,
    JournalEntry,
    JournalEntryLine,
    Payment,
    InventoryItem,
    InventoryTransaction,
)


def _ensure_default_accounts():
    cash, _ = ChartOfAccount.objects.get_or_create(
        code="1000",
        defaults={
            "name_ar": "الصندوق / النقدية",
            "name_en": "Cash",
            "type": "asset",
            "allow_manual_entries": True,
        },
    )
    sales, _ = ChartOfAccount.objects.get_or_create(
        code="4000",
        defaults={
            "name_ar": "المبيعات",
            "name_en": "Sales",
            "type": "revenue",
            "allow_manual_entries": True,
        },
    )
    cogs, _ = ChartOfAccount.objects.get_or_create(
        code="5000",
        defaults={
            "name_ar": "تكلفة المبيعات",
            "name_en": "Cost of Goods Sold",
            "type": "expense",
            "allow_manual_entries": True,
        },
    )
    ar_account, _ = ChartOfAccount.objects.get_or_create(
        code="1200",
        defaults={
            "name_ar": "الذمم المدينة",
            "name_en": "Accounts Receivable",
            "type": "asset",
            "allow_manual_entries": True,
        },
    )
    inventory_acc, _ = ChartOfAccount.objects.get_or_create(
        code="1100",
        defaults={
            "name_ar": "المخزون",
            "name_en": "Inventory",
            "type": "asset",
            "allow_manual_entries": True,
        },
    )
    payroll_exp, _ = ChartOfAccount.objects.get_or_create(
        code="5100",
        defaults={
            "name_ar": "رواتب وأجور",
            "name_en": "Payroll Expense",
            "type": "expense",
            "allow_manual_entries": True,
        },
    )
    payroll_payable, _ = ChartOfAccount.objects.get_or_create(
        code="2100",
        defaults={
            "name_ar": "مستحقات رواتب",
            "name_en": "Payroll Payable",
            "type": "liability",
            "allow_manual_entries": True,
        },
    )
    return cash, sales, cogs, payroll_exp, payroll_payable, ar_account, inventory_acc


@receiver(post_save, sender=Invoice)
def create_accounting_invoice(sender, instance: Invoice, created: bool, **kwargs):
    if not instance:
        return
    defaults = {
        "issue_date": timezone.now().date(),
        "order": getattr(instance, "order", None),
        "customer": getattr(getattr(instance, "order", None), "user", None),
        "currency": "SAR",
        "total_amount": getattr(getattr(instance, "order", None), "total", Decimal("0.00")),
    }
    AccountingInvoice.objects.get_or_create(invoice=instance, defaults=defaults)


@receiver(post_save, sender=Order)
def create_journal_for_paid_order(sender, instance: Order, **kwargs):
    if not instance or instance.payment_status != "paid":
        return

    content_type = ContentType.objects.get_for_model(Order)
    exists = JournalEntry.objects.filter(
        source_content_type=content_type,
        source_object_id=instance.id,
    ).exists()
    if exists:
        return

    (
        cash_account,
        sales_account,
        cogs_account,
        payroll_exp,
        payroll_payable,
        ar_account,
        inventory_acc,
    ) = _ensure_default_accounts()
    period = AccountingPeriod.objects.filter(is_default=True).first()
    entry = JournalEntry.objects.create(
        period=period,
        date=timezone.now().date(),
        reference=f"SALE-{instance.id}",
        memo="Auto journal from paid order",
        status="posted",
        auto_created=True,
        currency="SAR",
        source_content_type=content_type,
        source_object_id=instance.id,
    )
    amount = getattr(instance, "total", Decimal("0.00")) or Decimal("0.00")
    has_gateway_payment = PaymentTransaction.objects.filter(
        order_id=instance.id, status__in=["captured", "authorized", "paid"]
    ).exists()
    debit_account = ar_account if has_gateway_payment else cash_account
    JournalEntryLine.objects.create(
        entry=entry,
        account=debit_account,
        debit=amount,
        order=instance,
    )
    JournalEntryLine.objects.create(
        entry=entry,
        account=sales_account,
        credit=amount,
        order=instance,
    )
    # خفض المخزون وإنشاء قيد تكلفة المبيعات إذا وجد InventoryItem مرتبط بالمنتج
    for item in instance.items.select_related("product"):
        inv_item = InventoryItem.objects.filter(product=item.product).first()
        if not inv_item:
            continue
        InventoryTransaction.objects.create(
            item=inv_item,
            transaction_type="out",
            quantity=item.quantity,
            unit_cost=inv_item.last_purchase_price,
            order=instance,
            reference=f"SALE-{instance.id}",
        )
        cost_total = (inv_item.last_purchase_price or Decimal("0.00")) * Decimal(item.quantity)
        if cost_total > 0:
            JournalEntryLine.objects.create(
                entry=entry,
                account=cogs_account,
                debit=cost_total,
                order=instance,
                inventory_item=inv_item,
            )
            JournalEntryLine.objects.create(
                entry=entry,
                account=inventory_acc,
                credit=cost_total,
                order=instance,
                inventory_item=inv_item,
            )


@receiver(post_save, sender=PaymentTransaction)
def sync_payment_transaction(sender, instance: PaymentTransaction, **kwargs):
    if instance.status not in ("captured", "authorized", "paid"):
        return
    if Payment.objects.filter(reference=str(instance.id), order_id=instance.order_id).exists():
        return
    (
        cash_account,
        sales_account,
        cogs_account,
        payroll_exp,
        payroll_payable,
        ar_account,
        inventory_acc,
    ) = _ensure_default_accounts()
    acc_payment = Payment.objects.create(
        direction="incoming",
        method="card" if instance.method.is_online else "cash",
        status="completed",
        amount=instance.amount,
        currency=instance.currency,
        paid_at=timezone.now(),
        reference=str(instance.id),
        order_id=instance.order_id,
    )
    period = AccountingPeriod.objects.filter(is_default=True).first()
    entry = JournalEntry.objects.create(
        period=period,
        date=timezone.now().date(),
        reference=f"PAY-{instance.order_id}-{instance.id}",
        memo="Auto journal from payment transaction",
        status="posted",
        auto_created=True,
        currency=instance.currency,
        source_content_type=ContentType.objects.get_for_model(PaymentTransaction),
        source_object_id=instance.id,
    )
    acc_payment.journal_entry = entry
    acc_payment.save(update_fields=["journal_entry"])
    JournalEntryLine.objects.create(entry=entry, account=cash_account, debit=instance.amount)
    if instance.order_id:
        JournalEntryLine.objects.create(entry=entry, account=ar_account, credit=instance.amount)
    else:
        JournalEntryLine.objects.create(entry=entry, account=sales_account, credit=instance.amount)


@receiver(post_save, sender=Payroll)
def sync_payroll_to_accounting(sender, instance: Payroll, created: bool, **kwargs):
    if instance.payment_status != "paid":
        return
    (
        cash_account,
        sales_account,
        cogs_account,
        payroll_exp,
        payroll_payable,
        ar_account,
        inventory_acc,
    ) = _ensure_default_accounts()
    if Payment.objects.filter(reference=f"PAYROLL-{instance.id}", direction="outgoing").exists():
        return
    period = AccountingPeriod.objects.filter(is_default=True).first()
    entry = JournalEntry.objects.create(
        period=period,
        date=timezone.now().date(),
        reference=f"PAYROLL-{instance.id}",
        memo="قيد رواتب تلقائي",
        status="posted",
        auto_created=True,
        currency="SAR",
        source_content_type=ContentType.objects.get_for_model(Payroll),
        source_object_id=instance.id,
    )
    net = instance.net_salary or Decimal("0.00")
    JournalEntryLine.objects.create(
        entry=entry,
        account=payroll_exp,
        debit=net,
        description="تكلفة رواتب",
    )
    JournalEntryLine.objects.create(
        entry=entry,
        account=cash_account,
        credit=net,
        description="سداد رواتب",
    )
    Payment.objects.create(
        direction="outgoing",
        method="bank_transfer",
        status="completed",
        amount=net,
        currency="SAR",
        paid_at=timezone.now(),
        reference=f"PAYROLL-{instance.id}",
        journal_entry=entry,
    )


@receiver(post_save, sender=Product)
def ensure_inventory_item(sender, instance: Product, created: bool, **kwargs):
    """
    إنشاء سجل مخزون لكل منتج تلقائياً لظهور الأصناف في قسم المحاسبة/المخزون.
    """
    if not instance:
        return
    sku = f"SKU-{instance.id}"
    InventoryItem.objects.get_or_create(
        product=instance,
        defaults={
            "name_ar": getattr(instance, "name", "") or sku,
            "name_en": getattr(instance, "name", "") or sku,
            "sku": sku,
            "barcode": "",
            "quantity_on_hand": instance.stock or 0,
            "reorder_level": getattr(instance, "minimum_stock", 0) or 0,
            "valuation_method": "fifo",
            "default_purchase_price": 0,
            "last_purchase_price": 0,
            "last_sale_price": instance.price or 0,
        },
    )
