from rest_framework import serializers
from .models import LoyaltyProfile, LoyaltyTransaction, LoyaltySettings
from apps.store.models import StoreSettings


class LoyaltySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltySettings
        fields = [
            "earn_rate",
            "auto_reward_threshold",
            "auto_reward_message",
            "reward_discount_percent",
            "qr_prefix",
            "pass_primary_color",
            "pass_secondary_color",
            "pass_label_color",
            "pass_logo_url",
        ]


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order_id", read_only=True)

    class Meta:
        model = LoyaltyTransaction
        fields = [
            "id",
            "source",
            "points_delta",
            "note",
            "order_id",
            "created_at",
        ]
        read_only_fields = fields


class LoyaltyProfileSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    apple_wallet_pass_url = serializers.SerializerMethodField()
    google_wallet_pass_url = serializers.SerializerMethodField()

    class Meta:
        model = LoyaltyProfile
        fields = [
            "membership_id",
            "qr_token",
            "points_balance",
            "last_reward_at",
            "apple_wallet_pass_id",
            "google_wallet_pass_id",
            "user_name",
            "apple_wallet_pass_url",
            "google_wallet_pass_url",
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        full = obj.user.get_full_name()
        return full or obj.user.username

    def _wallet_base_url(self):
        if not hasattr(self, "_wallet_base_cache"):
            settings = StoreSettings.objects.first()
            base = (
                settings.wallet_pass_base_url
                if settings and settings.wallet_pass_base_url
                else "https://example.invalid"
            )
            self._wallet_base_cache = base.rstrip("/")
        return self._wallet_base_cache

    def get_apple_wallet_pass_url(self, obj):
        return f"{self._wallet_base_url()}/passes/apple/{obj.membership_id}.pkpass"

    def get_google_wallet_pass_url(self, obj):
        return f"{self._wallet_base_url()}/passes/google/{obj.membership_id}.pkpass"
