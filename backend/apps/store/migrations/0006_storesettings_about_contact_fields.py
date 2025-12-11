from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0005_storesettings_smtp_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="storesettings",
            name="about_description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="about_highlights",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="about_subtitle",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="about_title",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="contact_address",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="contact_description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="contact_hours",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="contact_map_embed",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="contact_subtitle",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="contact_title",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="storesettings",
            name="contact_whatsapp",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
    ]
