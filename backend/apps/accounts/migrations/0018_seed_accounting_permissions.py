from django.db import migrations


def seed_accounting_perms(apps, schema_editor):
    RolePermission = apps.get_model("accounts", "RolePermission")
    manager, _ = RolePermission.objects.get_or_create(role="manager")
    # Ensure managers can see/manage accounting by default
    for field in [
        "can_view_accounting",
        "can_manage_accounting",
        "can_manage_financial_reports",
        "can_manage_payments",
        "can_manage_suppliers",
    ]:
        setattr(manager, field, True)
    manager.save()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0017_rolepermission_can_manage_accounting_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_accounting_perms, migrations.RunPython.noop),
    ]
