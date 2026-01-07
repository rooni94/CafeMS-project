from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("loyalty", "0002_loyaltysettings_tiers"),
    ]

    operations = [
        migrations.AddField(
            model_name="loyaltyprofile",
            name="apple_wallet_auth_token",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.CreateModel(
            name="LoyaltyPassRegistration",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("device_library_id", models.CharField(max_length=64)),
                ("pass_type_identifier", models.CharField(max_length=120)),
                ("push_token", models.CharField(max_length=255)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pass_registrations",
                        to="loyalty.loyaltyprofile",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["device_library_id", "pass_type_identifier"],
                        name="loyalty_loy_device__b8c4c4_idx",
                    )
                ],
                "unique_together": {("profile", "device_library_id", "pass_type_identifier")},
            },
        ),
    ]
