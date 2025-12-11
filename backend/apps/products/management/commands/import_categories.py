import os
import csv
import json
from django.core.management.base import BaseCommand, CommandError
from apps.products.models import Category


class Command(BaseCommand):
    help = "استيراد التصنيفات من CSV أو JSON"

    def add_arguments(self, parser):
        parser.add_argument("--file", "-f", type=str, required=True)
        parser.add_argument(
            "--format", "-t", type=str, choices=["json", "csv"], default=None
        )

    def handle(self, *args, **options):
        file_path = options["file"]
        fmt = options["format"]

        if not os.path.exists(file_path):
            raise CommandError(f"الملف غير موجود: {file_path}")

        if not fmt:
            ext = os.path.splitext(file_path)[1].lower()
            fmt = "json" if ext == ".json" else "csv"

        if fmt == "json":
            categories = self._load_json(file_path)
        else:
            categories = self._load_csv(file_path)

        created = 0
        skipped = 0

        for name in categories:
            name = name.strip()
            if not name:
                continue
            obj, created_flag = Category.objects.get_or_create(name=name)
            if created_flag:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"تم إنشاء التصنيف: {name}"))
            else:
                skipped += 1
                self.stdout.write(self.style.WARNING(f"تم تخطيه (موجود): {name}"))

        self.stdout.write(self.style.SUCCESS(
            f"\nتم إنشاء {created} تصنيف، وتم تخطي {skipped}."
        ))

    def _load_json(self, path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, dict) and "categories" in data:
            return data["categories"]
        if isinstance(data, list):
            return data
        raise CommandError("صيغة JSON غير صحيحة")

    def _load_csv(self, path):
        categories = []
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            for row in reader:
                if row:
                    categories.append(row[0])
        return categories
