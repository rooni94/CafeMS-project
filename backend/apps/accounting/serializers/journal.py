from decimal import Decimal
from typing import List

from rest_framework import serializers

from apps.accounting.utils.accounting_calculations import (
    JournalLinePayload,
    calculate_vat,
    validate_double_entry,
)
from ..models import (
    AccountingInvoice,
    AccountingPeriod,
    Asset,
    BankAccount,
    ChartOfAccount,
    Expense,
    JournalEntry,
    JournalEntryLine,
    Payment,
    PurchaseOrder,
    Supplier,
)


class AccountingPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountingPeriod
        fields = [
            "id",
            "name_ar",
            "name_en",
            "start_date",
            "end_date",
            "status",
            "base_currency",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ChartOfAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartOfAccount
        fields = [
            "id",
            "code",
            "name_ar",
            "name_en",
            "type",
            "parent",
            "description",
            "is_active",
            "allow_manual_entries",
            "currency",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class JournalEntryLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntryLine
        fields = [
            "id",
            "account",
            "description",
            "debit",
            "credit",
            "currency",
            "exchange_rate",
            "amount_base",
            "product",
            "order",
            "inventory_item",
        ]
        read_only_fields = ["id", "amount_base"]


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True)

    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "period",
            "date",
            "reference",
            "memo",
            "status",
            "auto_created",
            "currency",
            "exchange_rate",
            "total_debit",
            "total_credit",
            "created_at",
            "updated_at",
            "lines",
        ]
        read_only_fields = [
            "id",
            "auto_created",
            "total_debit",
            "total_credit",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        lines_data = self.initial_data.get("lines") or []
        payloads: List[JournalLinePayload] = []
        for line in lines_data:
            payloads.append(
                JournalLinePayload(
                    account_id=line.get("account"),
                    debit=Decimal(str(line.get("debit") or 0)),
                    credit=Decimal(str(line.get("credit") or 0)),
                    description=line.get("description") or "",
                )
            )
        if payloads:
            validate_double_entry(payloads)
        return super().validate(attrs)

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        user = self.context["request"].user if self.context.get("request") else None
        entry = JournalEntry.objects.create(created_by=user, **validated_data)
        for line in lines_data:
            JournalEntryLine.objects.create(entry=entry, **line)
        entry.recalc_totals(save=True)
        return entry

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines_data is not None:
            instance.lines.all().delete()
            for line in lines_data:
                JournalEntryLine.objects.create(entry=instance, **line)
        instance.recalc_totals(save=True)
        return instance


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "name_ar",
            "name_en",
            "contact_name",
            "email",
            "phone",
            "tax_number",
            "payment_terms",
            "credit_limit",
            "balance",
            "currency",
            "address",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = [
            "id",
            "name",
            "account_number",
            "iban",
            "bank_name",
            "type",
            "currency",
            "current_balance",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "id",
            "title",
            "description",
            "category",
            "amount",
            "tax_rate",
            "tax_amount",
            "total_amount",
            "currency",
            "expense_date",
            "due_date",
            "paid_at",
            "status",
            "supplier",
            "attachment",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "tax_amount", "total_amount", "created_at", "updated_at"]

    def validate(self, attrs):
        amount = Decimal(str(attrs.get("amount") or 0))
        tax_rate = Decimal(str(attrs.get("tax_rate") or 0))
        tax_amount = calculate_vat(amount, tax_rate)
        attrs["tax_amount"] = tax_amount
        attrs["total_amount"] = amount + tax_amount
        return super().validate(attrs)

    def create(self, validated_data):
        validated_data["created_by"] = (
            self.context["request"].user if self.context.get("request") else None
        )
        return super().create(validated_data)


class PurchaseOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "supplier",
            "reference",
            "expected_date",
            "status",
            "currency",
            "tax_amount",
            "total_amount",
            "note",
            "created_by",
            "approved_by",
            "received_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["created_by"] = (
            self.context["request"].user if self.context.get("request") else None
        )
        return super().create(validated_data)


class AccountingInvoiceSerializer(serializers.ModelSerializer):
    balance_due = serializers.SerializerMethodField()

    class Meta:
        model = AccountingInvoice
        fields = [
            "id",
            "invoice",
            "order",
            "customer",
            "issue_date",
            "due_date",
            "status",
            "currency",
            "total_amount",
            "tax_amount",
            "discount_amount",
            "paid_amount",
            "balance_due",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_balance_due(self, obj: AccountingInvoice):
        return obj.balance_due


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "direction",
            "method",
            "status",
            "amount",
            "currency",
            "exchange_rate",
            "paid_at",
            "reference",
            "note",
            "invoice",
            "expense",
            "order",
            "bank_account",
            "supplier",
            "customer",
            "created_by",
            "journal_entry",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "journal_entry", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["created_by"] = (
            self.context["request"].user if self.context.get("request") else None
        )
        return super().create(validated_data)


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = [
            "id",
            "name",
            "category",
            "acquisition_date",
            "acquisition_cost",
            "salvage_value",
            "useful_life_months",
            "depreciation_method",
            "last_depreciation_date",
            "next_depreciation_date",
            "depreciation_expense_account",
            "accumulated_depreciation_account",
            "current_book_value",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
