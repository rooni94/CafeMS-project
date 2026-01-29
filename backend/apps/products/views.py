# backend/apps/products/views.py
import json

from django.db import transaction
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

  def _normalize_bool(self, value, default=False):
      if value is None:
          return default
      if isinstance(value, bool):
          return value
      if isinstance(value, (int, float)):
          return bool(value)
      if isinstance(value, str):
          return value.strip().lower() in ("1", "true", "yes", "y")
      return bool(value)

  def _extract_records(self, request):
      uploaded_file = request.FILES.get("file")
      if uploaded_file:
          try:
              raw = uploaded_file.read().decode("utf-8")
          except UnicodeDecodeError:
              raw = uploaded_file.read().decode("utf-8-sig")
          data = json.loads(raw)
      else:
          data = request.data

      if isinstance(data, dict) and "products" in data and isinstance(data["products"], list):
          return data["products"]
      if isinstance(data, list):
          return data
      raise ValueError("صيغة JSON غير مدعومة. يجب إرسال قائمة منتجات أو مفتاح products.")

  def get_permissions(self):
      # قراءة المنتجات متاحة للجميع (واجهة القائمة)
      if self.request.method in permissions.SAFE_METHODS:
          return [permissions.AllowAny()]
      # إنشاء/تعديل/حذف تحتاج صلاحية can_manage_products
      return [CanManageProducts()]

  @action(
      detail=False,
      methods=["post"],
      url_path="bulk-upload",
      parser_classes=[JSONParser, MultiPartParser, FormParser],
  )
  def bulk_upload(self, request):
      update_value = None
      if hasattr(request.data, "get"):
          update_value = request.data.get("update")
      if update_value is None:
          update_value = request.query_params.get("update")
      update_existing = self._normalize_bool(update_value, default=False)

      try:
          records = self._extract_records(request)
      except (ValueError, json.JSONDecodeError) as exc:
          return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

      if not records:
          return Response(
              {"detail": "لا توجد سجلات في الملف."},
              status=status.HTTP_400_BAD_REQUEST,
          )

      created_count = 0
      updated_count = 0
      skipped_count = 0
      errors = []

      for idx, data in enumerate(records, start=1):
          with transaction.atomic():
              try:
                  name = str(data.get("name", "")).strip()
                  if not name:
                      skipped_count += 1
                      errors.append({
                          "row": idx,
                          "name": data.get("name"),
                          "error": "لا يوجد حقل name.",
                      })
                      continue

                  price_raw = data.get("price", 0)
                  try:
                      price = float(price_raw)
                  except (TypeError, ValueError):
                      skipped_count += 1
                      errors.append({
                          "row": idx,
                          "name": name,
                          "error": f"تعذر تحويل السعر '{price_raw}' إلى رقم.",
                      })
                      continue

                  description = data.get("description") or ""
                  stock_raw = data.get("stock", 0)
                  try:
                      stock = int(stock_raw)
                  except (TypeError, ValueError):
                      stock = 0

                  available = self._normalize_bool(data.get("available", True), default=True)
                  track_inventory = self._normalize_bool(
                      data.get("track_inventory", True),
                      default=True,
                  )
                  minimum_stock_raw = data.get("minimum_stock", 5)
                  try:
                      minimum_stock = int(minimum_stock_raw)
                  except (TypeError, ValueError):
                      minimum_stock = 5

                  image = data.get("image") or ""

                  category_obj = None
                  category_id = data.get("category_id")
                  category_name = data.get("category_name") or data.get("category")
                  if category_id:
                      category_obj = Category.objects.filter(pk=category_id).first()
                  elif category_name:
                      category_name = str(category_name).strip()
                      if category_name:
                          category_obj, _ = Category.objects.get_or_create(name=category_name)

                  subcategory_obj = None
                  subcategory_id = data.get("subcategory_id")
                  subcategory_name = data.get("subcategory_name") or data.get("subcategory")
                  if subcategory_id:
                      subcategory_obj = SubCategory.objects.filter(pk=subcategory_id).first()
                  elif subcategory_name:
                      subcategory_name = str(subcategory_name).strip()
                      if subcategory_name:
                          if not category_obj:
                              raise ValueError("لا يمكن إنشاء التصنيف الفرعي بدون تحديد الفئة.")
                          subcategory_obj, _ = SubCategory.objects.get_or_create(
                              category=category_obj,
                              name=subcategory_name,
                          )

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
                          product.track_inventory = track_inventory
                          product.minimum_stock = minimum_stock
                          product.category = category_obj
                          product.subcategory = subcategory_obj
                          if image:
                              product.image = image
                          product.save()
                          updated_count += 1
                      else:
                          skipped_count += 1
                          errors.append({
                              "row": idx,
                              "name": name,
                              "error": "المنتج موجود مسبقًا وتم تخطيه.",
                          })
                  else:
                      Product.objects.create(
                          name=name,
                          price=price,
                          description=description,
                          stock=stock,
                          available=available,
                          track_inventory=track_inventory,
                          minimum_stock=minimum_stock,
                          category=category_obj,
                          subcategory=subcategory_obj,
                          image=image if image else None,
                      )
                      created_count += 1

              except Exception as exc:
                  skipped_count += 1
                  errors.append({
                      "row": idx,
                      "name": data.get("name"),
                      "error": str(exc),
                  })

      return Response(
          {
              "created": created_count,
              "updated": updated_count,
              "skipped": skipped_count,
              "errors": errors,
          },
          status=status.HTTP_200_OK,
      )

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
