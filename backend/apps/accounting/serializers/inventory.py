from rest_framework import serializers

from ..models import InventoryItem, InventoryTransaction


class InventoryItemSerializer(serializers.ModelSerializer):
    below_reorder = serializers.BooleanField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "product",
            "name_ar",
            "name_en",
            "sku",
            "barcode",
            "unit",
            "valuation_method",
            "quantity_on_hand",
            "reorder_level",
            "reorder_quantity",
            "default_purchase_price",
            "last_purchase_price",
            "last_sale_price",
            "currency",
            "location",
            "category",
            "is_active",
            "below_reorder",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class InventoryTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryTransaction
        fields = [
            "id",
            "item",
            "transaction_type",
            "quantity",
            "unit_cost",
            "total_cost",
            "currency",
            "reference",
            "note",
            "order",
            "purchase_order",
            "journal_entry",
            "performed_by",
            "created_at",
        ]
        read_only_fields = ["total_cost", "performed_by", "created_at"]

    def create(self, validated_data):
        validated_data["performed_by"] = (
            self.context["request"].user if self.context.get("request") else None
        )
        return super().create(validated_data)
