from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ProductAddonViewSet, ProductViewSet, SubCategoryViewSet
from .views_addons import ProductAddonsView, ProductAddonDetailView

router = DefaultRouter()
router.register('items', ProductViewSet, basename='product')
router.register('categories', CategoryViewSet, basename='category')
router.register('subcategories', SubCategoryViewSet, basename='subcategory')
router.register('addons', ProductAddonViewSet, basename='product-addon')

urlpatterns = [
    # Explicit nested add-ons endpoints (stable even if router/actions change)
    path("items/<int:product_id>/addons/", ProductAddonsView.as_view(), name="product-addons"),
    path("items/<int:product_id>/addons/<int:addon_id>/", ProductAddonDetailView.as_view(), name="product-addon-detail"),
    *router.urls,
]
