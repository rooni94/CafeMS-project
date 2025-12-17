from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CategoryViewSet, SubCategoryViewSet, ProductAddonViewSet

router = DefaultRouter()
router.register('items', ProductViewSet, basename='product')
router.register('categories', CategoryViewSet, basename='category')
router.register('subcategories', SubCategoryViewSet, basename='subcategory')
router.register('addons', ProductAddonViewSet, basename='product-addon')

urlpatterns = router.urls
