# backend/apps/payments/views.py
from rest_framework import viewsets
from apps.accounts.permissions import IsManager
from .models import PaymentMethod
from .serializers import PaymentMethodSerializer


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    إدارة طرق الدفع من لوحة تحكم المدير:

    - GET  /api/payments/methods/          -> قائمة الطرق
    - POST /api/payments/methods/          -> إضافة طريقة جديدة (تابي، تمارا، ApplePay...)
    - PATCH/PUT /api/payments/methods/<id>/ -> تعديل
    - DELETE /api/payments/methods/<id>/    -> حذف
    """

    queryset = PaymentMethod.objects.all().order_by("sort_order", "id")
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsManager]
