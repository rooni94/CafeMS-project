# backend/apps/loyalty/migrations/0004_update_loyalty_pass_colors.py
from django.db import migrations


OLD_PRIMARY = "#f59e0b"
OLD_SECONDARY = "#4c1d95"
OLD_LABEL = "#ffffff"

NEW_PRIMARY = "#0b0f19"
NEW_SECONDARY = "#f8fafc"
NEW_LABEL = "#f59e0b"


def update_loyalty_colors(apps, schema_editor):
    LoyaltySettings = apps.get_model("loyalty", "LoyaltySettings")
    for row in LoyaltySettings.objects.all():
        if (
            row.pass_primary_color == OLD_PRIMARY
            and row.pass_secondary_color == OLD_SECONDARY
            and row.pass_label_color == OLD_LABEL
        ):
            row.pass_primary_color = NEW_PRIMARY
            row.pass_secondary_color = NEW_SECONDARY
            row.pass_label_color = NEW_LABEL
            row.save(
                update_fields=[
                    "pass_primary_color",
                    "pass_secondary_color",
                    "pass_label_color",
                ]
            )


class Migration(migrations.Migration):
    dependencies = [
        ("loyalty", "0003_loyaltyprofile_apple_wallet_auth_token_and_registration"),
    ]

    operations = [
        migrations.RunPython(update_loyalty_colors, migrations.RunPython.noop),
    ]
