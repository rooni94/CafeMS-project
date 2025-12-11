from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0004_storesettings_hero_card_image_1_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="storesettings",
            name="smtp_host",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Ø®Ø§Ø¯Ù… SMTP Ø§Ù„Ù…Ø³Ø¦ÙˆÙ„ Ø¹Ù† Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯.",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="smtp_password",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="smtp_port",
            field=models.PositiveIntegerField(default=587),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="smtp_use_ssl",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="smtp_use_tls",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="smtp_username",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
