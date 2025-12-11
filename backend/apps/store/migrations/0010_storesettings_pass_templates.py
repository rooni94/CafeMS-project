from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0009_storesettings_wallet_pass_base_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="storesettings",
            name="apple_pass_template",
            field=models.TextField(
                blank=True,
                default="",
                help_text="محتوى pass.json أو البيانات الإضافية المطلوبة من Apple Wallet.",
            ),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="google_wallet_jwt_template",
            field=models.TextField(
                blank=True,
                default="",
                help_text="قالب JWT المستخدم لإنشاء بطاقة Google Wallet.",
            ),
        ),
    ]

