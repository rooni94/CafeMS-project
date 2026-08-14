import json
import os
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.products.models import Category, Product, ProductAddon


class Command(BaseCommand):
    help = "Import the trusted CafeMS Demo menu manifest and archive products outside it."

    def add_arguments(self, parser):
        parser.add_argument("--manifest", required=True, help="Trusted CafeMS Demo JSON manifest.")
        parser.add_argument("--images-dir", required=True, help="Directory containing the verified source images.")
        parser.add_argument("--dry-run", action="store_true", help="Validate and report without writing database or media.")
        parser.add_argument("--apply", action="store_true", help="Apply the import in one database transaction.")
        parser.add_argument(
            "--archive-existing",
            action="store_true",
            help="Disable every currently available product not present in the manifest.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        apply_changes = options["apply"]
        archive_existing = options["archive_existing"]

        if dry_run == apply_changes:
            raise CommandError("Choose exactly one of --dry-run or --apply.")
        if apply_changes and not archive_existing:
            raise CommandError("--apply requires --archive-existing so legacy products cannot remain public.")

        manifest_path = Path(options["manifest"]).expanduser().resolve()
        images_root = Path(options["images_dir"]).expanduser().resolve()
        manifest = self._load_manifest(manifest_path)
        entries = self._validate_manifest(manifest, images_root)

        if dry_run:
            self._report_dry_run(entries, manifest)
            return

        created = 0
        updated = 0
        created_categories = 0
        addon_count = 0
        archived = 0
        managed_ids = set()
        newly_saved_media = []

        try:
            with transaction.atomic():
                category_cache = {}
                for entry in entries:
                    category_name = entry["category_name"]
                    category = category_cache.get(category_name)
                    if category is None:
                        category, category_created = Category.objects.get_or_create(name=category_name)
                        category_cache[category_name] = category
                        if category_created:
                            created_categories += 1

                    product = (
                        Product.objects.filter(category=category, name=entry["name"])
                        .order_by("id")
                        .first()
                    )
                    if product is None:
                        product = Product(category=category, name=entry["name"])
                        created += 1
                    else:
                        updated += 1

                    product.description = entry["description"]
                    product.price = entry["price"]
                    product.stock = entry["stock"]
                    product.track_inventory = entry["track_inventory"]
                    product.minimum_stock = entry["minimum_stock"]
                    product.available = True
                    product.subcategory = None
                    self._attach_image(product, entry, newly_saved_media)
                    product.save()
                    managed_ids.add(product.pk)

                    wanted_addons = set()
                    for sort_order, addon_data in enumerate(entry["addons"]):
                        addon_name = addon_data["name"]
                        wanted_addons.add(addon_name)
                        addon, _ = ProductAddon.objects.get_or_create(
                            product=product,
                            name=addon_name,
                        )
                        addon.price_delta = addon_data["price_delta"]
                        addon.is_active = True
                        addon.sort_order = sort_order
                        addon.save(update_fields=["price_delta", "is_active", "sort_order"])
                        addon_count += 1

                    # Preserve manually-created historical add-ons, but do not expose
                    # stale add-ons from an older version of this managed item.
                    product.addons.exclude(name__in=wanted_addons).update(is_active=False)

                if archive_existing:
                    archived = (
                        Product.objects.filter(available=True)
                        .exclude(pk__in=managed_ids)
                        .update(available=False)
                    )
        except Exception:
            for storage_name in newly_saved_media:
                try:
                    Product._meta.get_field("image").storage.delete(storage_name)
                except Exception:
                    pass
            raise

        self.stdout.write(
            self.style.SUCCESS(
                json.dumps(
                    {
                        "status": "applied",
                        "categories_created": created_categories,
                        "products_created": created,
                        "products_updated": updated,
                        "products_archived": archived,
                        "product_addons_upserted": addon_count,
                        "products_managed": len(managed_ids),
                        "images_attached": len(entries),
                        "currency": manifest.get("currency", "SAR"),
                    },
                    ensure_ascii=True,
                    indent=2,
                )
            )
        )

    def _load_manifest(self, manifest_path):
        if not manifest_path.is_file():
            raise CommandError(f"Manifest not found: {manifest_path}")
        try:
            with manifest_path.open("r", encoding="utf-8") as handle:
                manifest = json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            raise CommandError(f"Cannot read manifest: {exc}") from exc
        if not isinstance(manifest, dict) or not isinstance(manifest.get("categories"), list):
            raise CommandError("Manifest must be an object with a categories list.")
        return manifest

    def _validate_manifest(self, manifest, images_root):
        if not images_root.is_dir():
            raise CommandError(f"Images directory not found: {images_root}")

        entries = []
        seen_keys = set()
        seen_ids = set()
        for category in manifest["categories"]:
            if not isinstance(category, dict):
                raise CommandError("Each manifest category must be an object.")
            category_name = str(category.get("name", "")).strip()
            if not category_name:
                raise CommandError("Manifest category name cannot be empty.")
            items = category.get("items")
            if not isinstance(items, list) or not items:
                raise CommandError(f"Category {category_name!r} has no items.")

            for item in items:
                if not isinstance(item, dict):
                    raise CommandError(f"Invalid item in category {category_name!r}.")
                source_item_id = str(item.get("source_item_id", "")).strip()
                name = str(item.get("name", "")).strip()
                description = str(item.get("description", "")).strip()
                image_name = str(item.get("image", "")).strip()
                if not source_item_id or not name or not image_name:
                    raise CommandError(f"Item in {category_name!r} needs source_item_id, name, and image.")
                key = (category_name, name)
                if key in seen_keys:
                    raise CommandError(f"Duplicate manifest item: {category_name} / {name}")
                if source_item_id in seen_ids:
                    raise CommandError(f"Duplicate source_item_id: {source_item_id}")
                seen_keys.add(key)
                seen_ids.add(source_item_id)

                try:
                    price = Decimal(str(item["price"])).quantize(Decimal("0.01"))
                except (KeyError, InvalidOperation, TypeError, ValueError) as exc:
                    raise CommandError(f"Invalid price for {name!r}.") from exc
                if price < 0:
                    raise CommandError(f"Price cannot be negative for {name!r}.")

                relative_image = image_name.replace("\\", "/")
                relative_path = Path(relative_image)
                if relative_path.is_absolute() or ".." in relative_path.parts or ":" in relative_image:
                    raise CommandError(f"Unsafe image path for {name!r}: {image_name}")
                image_path = (images_root / relative_path).resolve()
                if os.path.commonpath([str(images_root), str(image_path)]) != str(images_root):
                    raise CommandError(f"Image path escapes images directory: {image_name}")
                if not image_path.is_file():
                    raise CommandError(f"Image not found for {name!r}: {image_path}")

                addons = []
                for addon in item.get("addons", []):
                    if not isinstance(addon, dict) or not str(addon.get("name", "")).strip():
                        raise CommandError(f"Invalid add-on for {name!r}.")
                    try:
                        price_delta = Decimal(str(addon.get("price_delta", 0))).quantize(Decimal("0.01"))
                    except (InvalidOperation, TypeError, ValueError) as exc:
                        raise CommandError(f"Invalid add-on price for {name!r}.") from exc
                    if price_delta < 0:
                        raise CommandError(f"Add-on price cannot be negative for {name!r}.")
                    addons.append({"name": str(addon["name"]).strip(), "price_delta": price_delta})

                entries.append(
                    {
                        "category_name": category_name,
                        "source_item_id": source_item_id,
                        "name": name,
                        "description": description,
                        "price": price,
                        "image_path": image_path,
                        "image_name": image_name,
                        "addons": addons,
                        "stock": int(item.get("stock", 0)),
                        "track_inventory": bool(item.get("track_inventory", False)),
                        "minimum_stock": int(item.get("minimum_stock", 0)),
                    }
                )
        if not entries:
            raise CommandError("Manifest has no products.")
        return entries

    def _attach_image(self, product, entry, newly_saved_media):
        suffix = entry["image_path"].suffix.lower() or ".jpg"
        stable_id = re.sub(r"[^A-Za-z0-9_-]+", "-", entry["source_item_id"]).strip("-") or "item"
        relative_target = f"lk_menu/{stable_id}{suffix}"
        storage_name = f"products/{relative_target}"
        image_field = Product._meta.get_field("image")
        if product.image.name == storage_name and image_field.storage.exists(storage_name):
            return
        if image_field.storage.exists(storage_name):
            product.image.name = storage_name
            return
        with entry["image_path"].open("rb") as handle:
            product.image.save(relative_target, File(handle), save=False)
        newly_saved_media.append(product.image.name)

    def _report_dry_run(self, entries, manifest):
        existing_by_key = {
            (product.category.name, product.name): product
            for product in Product.objects.select_related("category").all()
            if product.category_id
        }
        active_products = Product.objects.filter(available=True).count()
        matched = sum((entry["category_name"], entry["name"]) in existing_by_key for entry in entries)
        addon_count = sum(len(entry["addons"]) for entry in entries)
        self.stdout.write(
            json.dumps(
                {
                    "status": "dry-run",
                    "currency": manifest.get("currency", "SAR"),
                    "products_in_manifest": len(entries),
                    "images_validated": len(entries),
                    "add-ons_in_manifest": addon_count,
                    "existing_products_to_update": matched,
                    "new_products_to_create": len(entries) - matched,
                    "currently_available_products_to_archive": max(active_products - matched, 0),
                    "categories": sorted({entry["category_name"] for entry in entries}),
                },
                ensure_ascii=True,
                indent=2,
            )
        )
