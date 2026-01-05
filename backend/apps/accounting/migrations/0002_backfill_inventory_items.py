from django.db import migrations


def backfill_inventory_items(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    InventoryItem = apps.get_model("accounting", "InventoryItem")
    for product in Product.objects.all():
        sku = f"SKU-{product.id}"
        InventoryItem.objects.get_or_create(
            product=product,
            defaults={
                "name_ar": getattr(product, "name", "") or sku,
                "name_en": getattr(product, "name", "") or sku,
                "sku": sku,
                "barcode": "",
                "quantity_on_hand": product.stock or 0,
                "reorder_level": getattr(product, "minimum_stock", 0) or 0,
                "valuation_method": "fifo",
                "default_purchase_price": 0,
                "last_purchase_price": 0,
                "last_sale_price": product.price or 0,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounting", "0001_initial"),
        ("products", "0004_productaddon"),
    ]

    operations = [
        migrations.RunPython(backfill_inventory_items, migrations.RunPython.noop),
    ]
