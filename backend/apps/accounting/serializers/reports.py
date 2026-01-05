from rest_framework import serializers

from ..models import FinancialReport, TaxRecord


class FinancialReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialReport
        fields = [
            "id",
            "name",
            "report_type",
            "period_start",
            "period_end",
            "filters",
            "payload",
            "generated_by",
            "generated_at",
        ]
        read_only_fields = ["generated_by", "generated_at"]

    def create(self, validated_data):
        validated_data["generated_by"] = (
            self.context["request"].user if self.context.get("request") else None
        )
        return super().create(validated_data)


class TaxRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRecord
        fields = [
            "id",
            "period",
            "tax_type",
            "tax_rate",
            "taxable_amount",
            "tax_due",
            "tax_paid",
            "filing_status",
            "filed_at",
            "reference",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
