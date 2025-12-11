# backend/apps/payments/serializers.py
from rest_framework import serializers
from .models import PaymentMethod


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "is_online",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
