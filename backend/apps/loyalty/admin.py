from django.contrib import admin
from .models import LoyaltyProfile, LoyaltySettings, LoyaltyTransaction


@admin.register(LoyaltySettings)
class LoyaltySettingsAdmin(admin.ModelAdmin):
    list_display = ["id", "earn_rate", "auto_reward_threshold", "updated_at"]
    readonly_fields = ["updated_at"]


@admin.register(LoyaltyProfile)
class LoyaltyProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "membership_id", "points_balance", "created_at"]
    search_fields = ["user__username", "membership_id"]
    readonly_fields = [
        "membership_id",
        "qr_token",
        "points_balance",
        "created_at",
        "updated_at",
    ]


@admin.register(LoyaltyTransaction)
class LoyaltyTransactionAdmin(admin.ModelAdmin):
    list_display = ["profile", "points_delta", "source", "created_at"]
    list_filter = ["source"]
    search_fields = ["profile__user__username", "note"]
