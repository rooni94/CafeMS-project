from django.apps import AppConfig


class LoyaltyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.loyalty"
    verbose_name = "Loyalty & Rewards"

    def ready(self):
        # Optional import for signals (safe import so migrations/tests do not fail)
        try:
            import apps.loyalty.signals  # noqa: F401
        except Exception:
            pass
