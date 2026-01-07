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
            "tier_one_max",
            "tier_two_max",
            "qr_prefix",
            "pass_primary_color",
            "pass_secondary_color",
            "pass_label_color",
            "pass_logo_url",
        ]


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(read_only=True)

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
    tier = serializers.SerializerMethodField()

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
            "tier",
        ]
        read_only_fields = fields

    def get_tier(self, obj):
        settings_obj = LoyaltySettings.load()
        points = obj.points_balance or 0
        tier_one_max = settings_obj.tier_one_max or 0
        tier_two_max = settings_obj.tier_two_max or tier_one_max
        if points <= tier_one_max:
            return "tier_1"
        if points <= tier_two_max:
            return "tier_2"
        return "tier_3"

    def get_user_name(self, obj):
        try:
            full = obj.user.get_full_name()
            return full or getattr(obj.user, "username", "") or "User"
        except Exception:
            return "User"

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
