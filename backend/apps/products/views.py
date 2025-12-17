# backend/apps/products/views.py
from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser

from apps.accounts.permissions import CanManageProducts, CanManageCategories, CanManageSubCategories
from .models import Product, Category, SubCategory, ProductAddon
from .serializers import ProductSerializer, CategorySerializer, SubCategorySerializer, ProductAddonSerializer


class ProductViewSet(viewsets.ModelViewSet):
  queryset = Product.objects.all().select_related("category", "subcategory").prefetch_related("addons")
  serializer_class = ProductSerializer
  parser_classes = [MultiPartParser, FormParser]

  def get_permissions(self):
      # قراءة المنتجات متاحة للجميع (واجهة القائمة)
      if self.request.method in permissions.SAFE_METHODS:
          return [permissions.AllowAny()]
      # إنشاء/تعديل/حذف تحتاج صلاحية can_manage_products
      return [CanManageProducts()]


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
