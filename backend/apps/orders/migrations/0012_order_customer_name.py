from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0011_orderitemaddon"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="customer_name",
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
    ]
