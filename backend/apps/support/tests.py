from django.test import TestCase

from apps.products.models import Category, Product
from .bot import _best_product, generate_bot_reply


class MenuAwareBotTests(TestCase):
    def setUp(self):
        category = Category.objects.create(
            name="المشروبات الساخنة",
            description="قهوة ومشروبات دافئة.",
        )
        Product.objects.create(
            category=category,
            name="قهوة V60",
            description="قهوة مقطرة يدوياً.",
            price="24.00",
            available=True,
        )
        Product.objects.create(
            category=category,
            name="ساندويتش دجاج مشوي",
            description="ساندويتش دجاج مشوي.",
            price="28.00",
            available=True,
        )

    def test_menu_reply_reads_current_catalog(self):
        reply = generate_bot_reply(None, "وش عندكم")

        self.assertIn("المشروبات الساخنة", reply)
        self.assertIn("قهوة V60", reply)
        self.assertNotIn("بطاطس", reply)
        self.assertNotIn("صحن", reply)

    def test_order_prompt_uses_current_menu_example(self):
        reply = generate_bot_reply(None, "ابغى اطلب")

        self.assertIn("قهوة V60 1", reply)
        self.assertNotIn("بطاطس", reply)

    def test_v60_alias_resolves_to_available_product(self):
        product = _best_product("أبغى v60")

        self.assertIsNotNone(product)
        self.assertEqual(product.name, "قهوة V60")
