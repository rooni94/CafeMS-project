from django.core.management.base import BaseCommand
from apps.products.models import Product, Category


class Command(BaseCommand):
    help = "إعادة بناء التصنيفات من المنتجات الموجودة"

    def handle(self, *args, **kwargs):
        names = set()

        for p in Product.objects.all():
            # لو المنتج يخزن الاسم نصًا
            if hasattr(p, "category_name") and p.category_name:
                names.add(p.category_name)

            # لو المنتج لديه category كـ string
            if isinstance(p.category, str):
                names.add(p.category)

        created = 0

        for name in names:
            name = name.strip()
            if not name:
                continue
            obj, flag = Category.objects.get_or_create(name=name)
            if flag:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"✔ تصنيف مُنشأ: {name}"))

        self.stdout.write(self.style.SUCCESS(f"\nتم إنشاء {created} تصنيف."))
