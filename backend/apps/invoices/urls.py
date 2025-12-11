from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import InvoiceViewSet, GenerateInvoiceView, PublicInvoiceByOrderView

router = DefaultRouter()
router.register("", InvoiceViewSet, basename="invoice")

urlpatterns = [
    path("", include(router.urls)),
    path("generate/", GenerateInvoiceView.as_view(), name="generate-invoice"),
    path(
        "public/by-order/<int:order_id>/",
        PublicInvoiceByOrderView.as_view(),
        name="public-invoice-by-order",
    ),
]
