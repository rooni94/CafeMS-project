import json
import os
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.core.files.storage import default_storage

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
        parser.add_argument(
            "--prune-unmanaged-categories",
            action="store_true",
            help="Delete categories outside the manifest after their products are no longer available.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        apply_changes = options["apply"]
        archive_existing = options["archive_existing"]
        prune_unmanaged_categories = options["prune_unmanaged_categories"]

        if dry_run == apply_changes:
            raise CommandError("Choose exactly one of --dry-run or --apply.")
        if apply_changes and not archive_existing:
            raise CommandError("--apply requires --archive-existing so legacy products cannot remain public.")

        manifest_path = Path(options["manifest"]).expanduser().resolve()
        images_root = Path(options["images_dir"]).expanduser().resolve()
        manifest = self._load_manifest(manifest_path)
        entries, category_specs, asset_specs = self._validate_manifest(manifest, images_root)

        if dry_run:
            self._report_dry_run(entries, category_specs, asset_specs, manifest)
            return

        created = 0
        updated = 0
        created_categories = 0
        addon_count = 0
        archived = 0
        pruned_categories = 0
        category_images_attached = 0
        assets_saved = 0
        managed_ids = set()
        newly_saved_media = []

        try:
            with transaction.atomic():
                category_cache = {}
                for category_spec in category_specs:
                    category_name = category_spec["name"]
                    category = Category.objects.filter(name=category_name).first()
                    if category is None:
                        category = Category(name=category_name)
                        category.save()
                        created_categories += 1
                    category.description = category_spec["description"]
                    category.save(update_fields=["description"])
                    self._attach_category_image(category, category_spec, newly_saved_media)
                    category_images_attached += 1
                    category_cache[category_name] = category

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
                        # Keep the existing product/order history when a menu item
                        # is reorganized into one of the managed categories.
                        product = (
                            Product.objects.filter(name=entry["name"], available=True)
                            .order_by("id")
                            .first()
                        )
                        if product is not None:
                            product.category = category
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

                for asset_spec in asset_specs:
                    if self._save_asset(asset_spec):
                        assets_saved += 1
                        newly_saved_media.append((default_storage, asset_spec["storage_name"]))

                if archive_existing:
                    archived = (
                        Product.objects.filter(available=True)
                        .exclude(pk__in=managed_ids)
                        .update(available=False)
                    )
                if prune_unmanaged_categories:
                    managed_category_ids = [category.pk for category in category_cache.values()]
                    deleted_categories, _ = (
                        Category.objects.exclude(pk__in=managed_category_ids)
                        .exclude(products__available=True)
                        .delete()
                    )
                    pruned_categories = deleted_categories
        except Exception:
            for storage, storage_name in newly_saved_media:
                try:
                    storage.delete(storage_name)
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
                        "categories_pruned": pruned_categories,
                        "product_addons_upserted": addon_count,
                        "products_managed": len(managed_ids),
                        "images_attached": len(entries),
                        "category_images_attached": category_images_attached,
                        "assets_saved": assets_saved,
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
        category_specs = []
        asset_specs = []
        seen_keys = set()
        seen_ids = set()
        seen_category_names = set()
        for category in manifest["categories"]:
            if not isinstance(category, dict):
                raise CommandError("Each manifest category must be an object.")
            category_name = str(category.get("name", "")).strip()
            if not category_name:
                raise CommandError("Manifest category name cannot be empty.")
            if category_name in seen_category_names:
                raise CommandError(f"Duplicate manifest category: {category_name}")
            seen_category_names.add(category_name)
            category_image_path = None
            category_image_name = str(category.get("image", "")).strip()
            if category_image_name:
                category_image_path = self._resolve_image_path(
                    images_root,
                    category_image_name,
                    f"category {category_name!r}",
                )
            category_specs.append(
                {
                    "name": category_name,
                    "description": str(category.get("description", "")).strip(),
                    "source_category_id": str(
                        category.get("source_category_id", category_name)
                    ).strip(),
                    "image_name": category_image_name,
                    "image_path": category_image_path,
                }
            )
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

                image_path = self._resolve_image_path(images_root, image_name, f"item {name!r}")

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
        for asset in manifest.get("assets", []):
            if not isinstance(asset, dict):
                raise CommandError("Each manifest asset must be an object.")
            source_asset_id = str(asset.get("source_asset_id", "")).strip()
            image_name = str(asset.get("image", "")).strip()
            if not source_asset_id or not image_name:
                raise CommandError("Each manifest asset needs source_asset_id and image.")
            image_path = self._resolve_image_path(images_root, image_name, f"asset {source_asset_id!r}")
            stable_id = re.sub(r"[^A-Za-z0-9_-]+", "-", source_asset_id).strip("-") or "asset"
            suffix = image_path.suffix.lower() or ".jpg"
            asset_specs.append(
                {
                    "source_asset_id": source_asset_id,
                    "image_path": image_path,
                    "storage_name": f"products/lk_menu/assets/{stable_id}{suffix}",
                }
            )
        if not entries:
            raise CommandError("Manifest has no products.")
        return entries, category_specs, asset_specs

    def _resolve_image_path(self, images_root, image_name, label):
        relative_image = image_name.replace("\\", "/")
        relative_path = Path(relative_image)
        if relative_path.is_absolute() or ".." in relative_path.parts or ":" in relative_image:
            raise CommandError(f"Unsafe image path for {label}: {image_name}")
        image_path = (images_root / relative_path).resolve()
        if os.path.commonpath([str(images_root), str(image_path)]) != str(images_root):
            raise CommandError(f"Image path escapes images directory: {image_name}")
        if not image_path.is_file():
            raise CommandError(f"Image not found for {label}: {image_path}")
        return image_path

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
        newly_saved_media.append((image_field.storage, product.image.name))

    def _attach_category_image(self, category, spec, newly_saved_media):
        image_path = spec.get("image_path")
        if not image_path:
            return
        suffix = image_path.suffix.lower() or ".jpg"
        stable_id = re.sub(r"[^A-Za-z0-9_-]+", "-", spec["source_category_id"]).strip("-") or "category"
        relative_target = f"lk_menu/{stable_id}{suffix}"
        storage_name = f"categories/{relative_target}"
        image_field = Category._meta.get_field("image")
        if category.image.name == storage_name and image_field.storage.exists(storage_name):
            return
        if image_field.storage.exists(storage_name):
            category.image.name = storage_name
            category.save(update_fields=["image"])
            return
        with image_path.open("rb") as handle:
            category.image.save(relative_target, File(handle), save=True)
        newly_saved_media.append((image_field.storage, category.image.name))

    def _save_asset(self, asset_spec):
        storage = default_storage
        storage_name = asset_spec["storage_name"]
        if storage.exists(storage_name):
            return False
        with asset_spec["image_path"].open("rb") as handle:
            storage.save(storage_name, File(handle))
        return True

    def _report_dry_run(self, entries, category_specs, asset_specs, manifest):
        existing_by_key = {
            (product.category.name, product.name): product
            for product in Product.objects.select_related("category").all()
            if product.category_id
        }
        existing_available_names = set(
            Product.objects.filter(available=True).values_list("name", flat=True)
        )
        active_products = Product.objects.filter(available=True).count()
        matched = sum(
            (entry["category_name"], entry["name"]) in existing_by_key
            or entry["name"] in existing_available_names
            for entry in entries
        )
        addon_count = sum(len(entry["addons"]) for entry in entries)
        self.stdout.write(
            json.dumps(
                {
                    "status": "dry-run",
                    "currency": manifest.get("currency", "SAR"),
                    "products_in_manifest": len(entries),
                    "images_validated": len(entries),
                    "category_images_validated": sum(
                        1 for spec in category_specs if spec["image_path"]
                    ),
                    "assets_validated": len(asset_specs),
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
