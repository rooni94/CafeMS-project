# backend/apps/orders/serializers.py
from decimal import Decimal, ROUND_HALF_UP
from rest_framework import serializers
from apps.products.models import Product, ProductAddon
from apps.products.serializers import ProductSerializer
from .models import (
    Order,
    OrderItem,
    OrderItemAddon,
    OrderActivityLog,
    Table,
    InventoryAdjustment,
)


class TableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Table
        fields = [
            "id",
            "label",
            "number",
            "capacity",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class OrderItemAddonSerializer(serializers.ModelSerializer):
    addon_id = serializers.IntegerField(source="addon.id", read_only=True)

    class Meta:
        model = OrderItemAddon
        fields = ["id", "addon_id", "name", "price_delta"]
        read_only_fields = ["id", "addon_id", "name", "price_delta"]


class OrderItemSerializer(serializers.ModelSerializer):
    # product_id للكتابة، product للعرض
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="product",
        write_only=True,
    )
    product = ProductSerializer(read_only=True)
    addon_ids = serializers.PrimaryKeyRelatedField(
        queryset=ProductAddon.objects.all(),
        source="addons",
        many=True,
        write_only=True,
        required=False,
    )
    addons = OrderItemAddonSerializer(many=True, read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_id", "quantity", "price", "addon_ids", "addons"]
        read_only_fields = ["id", "product", "price"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    table = TableSerializer(read_only=True)
    table_id = serializers.PrimaryKeyRelatedField(
        queryset=Table.objects.all(),
        source="table",
        write_only=True,
        required=False,
        allow_null=True,
    )
    served_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "status",
            "status_display",
            "payment_method",
            "payment_status",
            "paid",
            "total",
            "order_type",
            "delivery",
            "delivery_address",
            "delivery_fee",
            "table",
            "table_id",
            "discount_type",
            "discount_value",
            "discount_amount",
            "note",
            "served_by",
            "served_by_name",
            "created_at",
            "items",
        ]
        read_only_fields = [
            "id",
            "user",
            "paid",
            "total",
            "created_at",
            "payment_status",
            "discount_amount",
            "served_by",
            "served_by_name",
        ]

    def get_served_by_name(self, obj):
        if obj.served_by:
            full = obj.served_by.get_full_name()
            return full or obj.served_by.username
        return None

    def create(self, validated_data):
        # نفصل بيانات العناصر
        items_data = validated_data.pop("items", [])

        # لو جا user من serializer.save(user=...) نحذفه من validated_data
        user_from_kwargs = validated_data.pop("user", None)

        # نحاول نأخذ المستخدم من الـ request (لو مسجّل)
        request = self.context.get("request")
        user = None
        if request and request.user.is_authenticated:
            user = request.user
        elif user_from_kwargs is not None:
            user = user_from_kwargs

        # إنشاء الطلب نفسه بحالة pending
        served_by = None
        if request and request.user.is_authenticated:
            role = getattr(request.user, "role", "")
            if role in ("manager", "supervisor", "staff"):
                served_by = request.user

        order = Order.objects.create(
            user=user,
            status="pending",
            # payment_status يبقى "pending" افتراضياً
            served_by=served_by,
            **validated_data,
        )

        subtotal = Decimal("0.00")

        for item_data in items_data:
            product = item_data["product"]
            quantity = item_data.get("quantity", 1)
            addons = item_data.get("addons", [])
            invalid_addons = [
                addon
                for addon in addons
                if addon.product_id != product.id or not addon.is_active
            ]
            if invalid_addons:
                raise serializers.ValidationError(
                    {"items": "Invalid addons for product."}
                )

            addons_total = sum(
                (addon.price_delta for addon in addons), Decimal("0.00")
            )
            price = (product.price + addons_total).quantize(Decimal("0.01"))

            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                price=price,
            )

            for addon in addons:
                OrderItemAddon.objects.create(
                    order_item=order_item,
                    addon=addon,
                    name=addon.name,
                    price_delta=addon.price_delta,
                )

            subtotal += (price * quantity).quantize(Decimal("0.01"))

            # اختياري: إنقاص المخزون لو عندك حقل stock
            if hasattr(product, "stock"):
                product.stock = max(0, product.stock - quantity)
                product.save()
                InventoryAdjustment.objects.create(
                    product=product,
                    order=order,
                    delta=-quantity,
                    reason="sale",
                    created_by=served_by,
                    note="POS sale" if served_by else "Online order",
                )

        discount_type = order.discount_type
        discount_value = validated_data.get("discount_value", Decimal("0")) or Decimal(
            "0"
        )
        if not isinstance(discount_value, Decimal):
            discount_value = Decimal(str(discount_value))
        discount_amount = Decimal("0.00")
        if discount_type == "amount":
            discount_amount = min(subtotal, discount_value)
        elif discount_type == "percent":
            discount_amount = (
                subtotal * (discount_value / Decimal("100"))
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        total = max(Decimal("0.00"), subtotal - discount_amount)
        order.discount_value = discount_value
        order.discount_amount = discount_amount
        order.total = total

        order.save(update_fields=["total", "discount_value", "discount_amount"])

        if order.table and order.order_type == "dine_in":
            order.table.status = "occupied"
            order.table.save(update_fields=["status"])

        return order


class PublicOrderTrackingSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = Order
        fields = ["id", "status", "status_display", "total", "created_at"]


class OrderActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderActivityLog
        fields = [
            "id",
            "user",
            "user_name",

            "order",
            "action",
            "old_status",
            "new_status",
            "event_type",

            "ip_address",
            "device_type",
            "browser",
            "os",
            "country",
            "city",
            "user_agent",

            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_user_name(self, obj):
        if obj.user:
            full = obj.user.get_full_name()
            return full or obj.user.username
        return None
