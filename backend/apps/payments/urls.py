# backend/apps/payments/urls.py
from rest_framework.routers import DefaultRouter
from .views import PaymentMethodViewSet

router = DefaultRouter()
router.register(r"methods", PaymentMethodViewSet, basename="payment-method")

urlpatterns = router.urls
