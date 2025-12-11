import os
import csv
import json

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.products.models import Product, Category


class Command(BaseCommand):
    help = "استيراد المنتجات من ملف JSON أو CSV وإنشاء الفئات تلقائيًا إن لم تكن موجودة."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            "-f",
            type=str,
            required=True,
            help="مسار ملف المنتجات (JSON أو CSV)",
        )
        parser.add_argument(
            "--format",
            "-t",
            type=str,
            choices=["json", "csv"],
            help="نوع الملف (json أو csv). إذا لم يُحدّد سيتم الاستنتاج من الامتداد.",
        )
        parser.add_argument(
            "--update",
            action="store_true",
            help="لو مفعّل: يتم تحديث المنتج إن وجد نفس الاسم، بدل تخطيه.",
        )

    def handle(self, *args, **options):
        file_path = options["file"]
        fmt = options.get("format")
        update_existing = options["update"]

        if not os.path.exists(file_path):
            raise CommandError(f"الملف غير موجود: {file_path}")

        # استنتاج نوع الملف من الامتداد إن لم يُحدّد
        if not fmt:
            ext = os.path.splitext(file_path)[1].lower()
            if ext == ".json":
                fmt = "json"
            elif ext == ".csv":
                fmt = "csv"
            else:
                raise CommandError(
                    "تعذر استنتاج نوع الملف من الامتداد. استخدم الخيار --format=csv أو --format=json."
                )

        self.stdout.write(self.style.NOTICE(f"استيراد المنتجات من {file_path} (نوع: {fmt})"))

        if fmt == "json":
            records = self._load_json(file_path)
        else:
            records = self._load_csv(file_path)

        if not records:
            self.stdout.write(self.style.WARNING("لا توجد سجلات في الملف."))
            return

        created_count = 0
        updated_count = 0
        skipped_count = 0

        # نلف على البيانات داخل transaction لزيادة الأمان
        with transaction.atomic():
            for idx, data in enumerate(records, start=1):
                try:
                    name = str(data.get("name", "")).strip()
                    if not name:
                        self.stdout.write(
                            self.style.WARNING(f"[سطر {idx}] تم تخطيه: لا يوجد حقل name.")
                        )
                        skipped_count += 1
                        continue

                    price_raw = data.get("price", 0)
                    try:
                        price = float(price_raw)
                    except (TypeError, ValueError):
                        self.stdout.write(
                            self.style.WARNING(
                                f"[{name}] تعذر تحويل السعر '{price_raw}' إلى رقم. تم التخطي."
                            )
                        )
                        skipped_count += 1
                        continue

                    description = data.get("description") or ""
                    stock_raw = data.get("stock", 0)
                    try:
                        stock = int(stock_raw)
                    except (TypeError, ValueError):
                        stock = 0

                    available_raw = data.get("available", True)
                    if isinstance(available_raw, str):
                        available = available_raw.strip().lower() in ("1", "true", "yes", "y")
                    else:
                        available = bool(available_raw)

                    image = data.get("image") or ""

                    # 🔹 الفئة: نفضّل وجود "category" أو "category_name" نصية
                    category_name = data.get("category_name") or data.get("category")
                    category_obj = None
                    if category_name:
                        category_name = str(category_name).strip()
                        if category_name:
                            category_obj, _ = Category.objects.get_or_create(
                                name=category_name
                            )

                    # 🔹 نحاول نبحث عن المنتج بالاسم (وربما بالفئة)
                    lookup = {"name": name}
                    if category_obj:
                        lookup["category"] = category_obj

                    product_qs = Product.objects.filter(**lookup)

                    if product_qs.exists():
                        product = product_qs.first()
                        if update_existing:
                            product.price = price
                            product.description = description
                            product.stock = stock
                            product.available = available
                            if image:
                                product.image = image
                            product.save()
                            updated_count += 1
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"✅ تم تحديث المنتج: {product.name}"
                                )
                            )
                        else:
                            skipped_count += 1
                            self.stdout.write(
                                self.style.WARNING(
                                    f"⚠ المنتج موجود مسبقًا وتم تخطيه: {product.name}"
                                )
                            )
                    else:
                        product = Product.objects.create(
                            name=name,
                            price=price,
                            description=description,
                            stock=stock,
                            available=available,
                            category=category_obj,
                            image=image if image else None,
                        )
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f"➕ تم إنشاء المنتج الجديد: {product.name}")
                        )

                except Exception as e:
                    skipped_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"❌ خطأ أثناء استيراد السطر {idx} (المنتج: {data.get('name')}): {e}"
                        )
                    )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("انتهى الاستيراد بنجاح."))
        self.stdout.write(
            self.style.SUCCESS(
                f"تم إنشاء {created_count} منتج، تحديث {updated_count}، وتخطي {skipped_count}."
            )
        )

    def _load_json(self, file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            # لو الملف عبارة عن {"products": [...]} نأخذ القائمة الداخلية
            if "products" in data and isinstance(data["products"], list):
                return data["products"]
            else:
                raise CommandError(
                    "صيغة JSON غير مدعومة. يُرجى تمرير قائمة من العناصر أو مفتاح 'products'."
                )
        if isinstance(data, list):
            return data
        raise CommandError("صيغة JSON غير صحيحة. يجب أن تكون قائمة من المنتجات.")

    def _load_csv(self, file_path):
        rows = []
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
        return rows
