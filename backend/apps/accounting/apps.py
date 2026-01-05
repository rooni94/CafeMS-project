from django.apps import AppConfig


class AccountingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounting"
    verbose_name = "Accounting & Inventory"

    def ready(self):
        # Import signals on startup to wire automatic journal entries.
        from . import signals  # noqa: F401
