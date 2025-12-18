from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import CanManageProducts
from .models import ProductAddon, Product
from .serializers import ProductAddonSerializer


def _addons_queryset_for_request(product: Product, request):
    qs = product.addons.all().select_related("product").order_by("sort_order", "id")
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        role = getattr(user, "role", "")
        if role in ("manager", "supervisor", "staff"):
            return qs
    return qs.filter(is_active=True)


class ProductAddonsView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [CanManageProducts()]

    def get(self, request, product_id: int):
        product = get_object_or_404(Product.objects.prefetch_related("addons"), pk=product_id)
        addons_qs = _addons_queryset_for_request(product, request)
        serializer = ProductAddonSerializer(addons_qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, product_id: int):
        get_object_or_404(Product.objects.only("id"), pk=product_id)
        serializer = ProductAddonSerializer(
            data={**request.data, "product_id": str(product_id)},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProductAddonDetailView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [CanManageProducts()]

    def patch(self, request, product_id: int, addon_id: int):
        addon = get_object_or_404(
            ProductAddon.objects.select_related("product"),
            pk=addon_id,
            product_id=product_id,
        )
        serializer = ProductAddonSerializer(addon, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, product_id: int, addon_id: int):
        addon = get_object_or_404(ProductAddon.objects.all(), pk=addon_id, product_id=product_id)
        addon.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
