# backend/apps/orders/services.py (يفضل نخلي منطق الطلب في service)
from django.db import transaction
from apps.products.models import Product
from .models import Order, OrderItem  # حسب اسم الموديلات عندك

@transaction.atomic
def create_order_from_cart(user, items_data, **extra_fields):
    """
    items_data: قائمة من {product_id, quantity}
    """
    order = Order.objects.create(user=user, **extra_fields)

    for item in items_data:
        product = Product.objects.select_for_update().get(pk=item["product_id"])
        qty = int(item["quantity"])

        if not product.available:
          raise ValueError(f"Product is unavailable: {product.name}")

        if product.track_inventory and product.stock < qty:
          raise ValueError(f"الكمية غير متوفرة للمنتج {product.name}")

        # إنشاء OrderItem
        OrderItem.objects.create(
            order=order,
            product=product,
            quantity=qty,
            unit_price=product.price,
            line_total=product.price * qty,
        )

        # خصم من المخزون
        if product.track_inventory:
            product.stock -= qty
            if product.stock <= 0:
                product.stock = 0
                product.available = False
            product.save()

    # إعادة حساب إجمالي الطلب
    order.total = sum(i.line_total for i in order.items.all())
    order.save()
    return order
