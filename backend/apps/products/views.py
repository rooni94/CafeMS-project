# backend/apps/products/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from apps.accounts.permissions import CanManageProducts, CanManageCategories, CanManageSubCategories
from .models import Product, Category, SubCategory, ProductAddon
from .serializers import ProductSerializer, CategorySerializer, SubCategorySerializer, ProductAddonSerializer


class ProductViewSet(viewsets.ModelViewSet):
  queryset = Product.objects.all().select_related("category", "subcategory").prefetch_related("addons")
  serializer_class = ProductSerializer
  parser_classes = [JSONParser, MultiPartParser, FormParser]

  def get_permissions(self):
      # قراءة المنتجات متاحة للجميع (واجهة القائمة)
      if self.request.method in permissions.SAFE_METHODS:
          return [permissions.AllowAny()]
      # إنشاء/تعديل/حذف تحتاج صلاحية can_manage_products
      return [CanManageProducts()]

  @action(detail=True, methods=["get", "post"], url_path="addons", parser_classes=[JSONParser, MultiPartParser, FormParser])
  def addons(self, request, pk=None):
      product = self.get_object()

      if request.method == "GET":
          addons_qs = product.addons.all().select_related("product")
          serializer = ProductAddonSerializer(addons_qs, many=True, context={"request": request})
          return Response(serializer.data)

      serializer = ProductAddonSerializer(
          data={
              **request.data,
              "product_id": str(product.id),
          },
          context={"request": request},
      )
      serializer.is_valid(raise_exception=True)
      serializer.save()
      return Response(serializer.data, status=status.HTTP_201_CREATED)

  @action(
      detail=True,
      methods=["patch", "delete"],
      url_path=r"addons/(?P<addon_id>[^/.]+)",
      parser_classes=[JSONParser, MultiPartParser, FormParser],
  )
  def addon_detail(self, request, pk=None, addon_id=None):
      product = self.get_object()
      try:
          addon = product.addons.get(pk=addon_id)
      except ProductAddon.DoesNotExist:
          return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

      if request.method == "DELETE":
          addon.delete()
          return Response(status=status.HTTP_204_NO_CONTENT)

      serializer = ProductAddonSerializer(addon, data=request.data, partial=True, context={"request": request})
      serializer.is_valid(raise_exception=True)
      serializer.save()
      return Response(serializer.data, status=status.HTTP_200_OK)


class CategoryViewSet(viewsets.ModelViewSet):
  queryset = Category.objects.all()
  serializer_class = CategorySerializer
  parser_classes = [MultiPartParser, FormParser]

  def get_permissions(self):
      # قراءة الفئات متاحة للجميع
      if self.request.method in permissions.SAFE_METHODS:
          return [permissions.AllowAny()]
      # باقي العمليات تحتاج صلاحية can_manage_categories
      return [CanManageCategories()]


class SubCategoryViewSet(viewsets.ModelViewSet):
  queryset = SubCategory.objects.select_related("category").all()
  serializer_class = SubCategorySerializer
  parser_classes = [MultiPartParser, FormParser]

  def get_permissions(self):
      if self.request.method in permissions.SAFE_METHODS:
          return [permissions.AllowAny()]
      return [CanManageSubCategories()]


class ProductAddonViewSet(viewsets.ModelViewSet):
  serializer_class = ProductAddonSerializer

  def get_queryset(self):
      qs = ProductAddon.objects.select_related("product").all()
      product_id = self.request.query_params.get("product")
      if product_id:
          qs = qs.filter(product_id=product_id)
      return qs

  def get_permissions(self):
      if self.request.method in permissions.SAFE_METHODS:
          return [permissions.AllowAny()]
      return [CanManageProducts()]
