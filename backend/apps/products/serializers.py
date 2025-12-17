from django.utils.text import slugify
from rest_framework import serializers

from .models import Category, Product, SubCategory, ProductAddon


class ProductSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name"]


class CategorySerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "image"]
        read_only_fields = ["slug"]

    def create(self, validated_data):
        if not validated_data.get("slug"):
            validated_data["slug"] = slugify(validated_data.get("name", ""))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get("slug") and "name" in validated_data:
            validated_data["slug"] = slugify(validated_data["name"])
        return super().update(instance, validated_data)


class SubCategorySerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True
    )

    class Meta:
        model = SubCategory
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "image",
            "category",
            "category_id",
        ]
        read_only_fields = ["slug"]

    def create(self, validated_data):
        if not validated_data.get("slug"):
            base = f"{validated_data['category'].name}-{validated_data.get('name', '')}"
            validated_data["slug"] = slugify(base)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get("slug") and "name" in validated_data:
            category = validated_data.get("category", instance.category)
            base = f"{category.name}-{validated_data['name']}"
            validated_data["slug"] = slugify(base)
        return super().update(instance, validated_data)


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
    )
    subcategory = SubCategorySerializer(read_only=True)
    subcategory_id = serializers.PrimaryKeyRelatedField(
        queryset=SubCategory.objects.all(),
        source="subcategory",
        write_only=True,
        required=False,
        allow_null=True,
    )
    addons = serializers.SerializerMethodField()

    def get_addons(self, obj):
        addons_qs = obj.addons.all()
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            role = getattr(request.user, "role", "")
            if role in ("manager", "supervisor", "staff"):
                return ProductAddonSerializer(addons_qs, many=True).data
        return ProductAddonSerializer(addons_qs.filter(is_active=True), many=True).data

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "stock",
            "track_inventory",
            "minimum_stock",
            "available",
            "image",
            "category",
            "category_id",
            "subcategory",
            "subcategory_id",
            "addons",
        ]


class ProductAddonSerializer(serializers.ModelSerializer):
    product = ProductSummarySerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="product",
        write_only=True,
    )

    class Meta:
        model = ProductAddon
        fields = [
            "id",
            "name",
            "price_delta",
            "is_active",
            "sort_order",
            "product",
            "product_id",
        ]
