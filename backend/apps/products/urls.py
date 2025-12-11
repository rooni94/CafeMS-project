from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CategoryViewSet, SubCategoryViewSet

router = DefaultRouter()
router.register('items', ProductViewSet, basename='product')
router.register('categories', CategoryViewSet, basename='category')
router.register('subcategories', SubCategoryViewSet, basename='subcategory')

urlpatterns = router.urls
