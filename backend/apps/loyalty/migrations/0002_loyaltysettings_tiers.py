from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("loyalty", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="loyaltysettings",
            name="tier_one_max",
            field=models.PositiveIntegerField(default=299, help_text="Tier 1 max points threshold."),
        ),
        migrations.AddField(
            model_name="loyaltysettings",
            name="tier_two_max",
            field=models.PositiveIntegerField(default=699, help_text="Tier 2 max points threshold."),
        ),
    ]
