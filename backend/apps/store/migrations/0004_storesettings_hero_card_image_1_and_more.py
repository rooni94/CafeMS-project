from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0003_alter_storesettings_hero_cards"),
    ]

    operations = [
        migrations.AddField(
            model_name="storesettings",
            name="hero_card_image_1",
            field=models.ImageField(
                blank=True, null=True, upload_to="store/hero_cards/"
            ),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="hero_card_image_2",
            field=models.ImageField(
                blank=True, null=True, upload_to="store/hero_cards/"
            ),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="hero_card_image_3",
            field=models.ImageField(
                blank=True, null=True, upload_to="store/hero_cards/"
            ),
        ),
    ]
