from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Invoice
from .serializers import InvoiceSerializer
from apps.orders.models import Order


class IsOwnerOrManagerInvoice(permissions.BasePermission):
    """
    المدير يرى كل الفواتير، المستخدم يرى فواتيره فقط
    """

    def has_object_permission(self, request, view, obj: Invoice):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "role", "") == "manager":
            return True
        if obj.order.user == user:
        # لو الطلب بدون user أصلاً، نمنع
            return obj.order.user == user
        return False

    def has_permission(self, request, view):
        # للـ list: نفس منطق الـ orders
        if view.action in ["list", "retrieve"]:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    عرض الفواتير (للمدير أو صاحب الطلب فقط)
    """

    serializer_class = InvoiceSerializer
    permission_classes = [IsOwnerOrManagerInvoice]

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related("order").all().order_by("-created_at")
        if getattr(user, "role", "") == "manager":
            return qs
        return qs.filter(order__user=user)


class GenerateInvoiceView(APIView):
    """
    إنشاء فاتورة لطلب معيّن. لو كانت موجودة يرجعها كما هي.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        if not order_id:
            return Response(
                {"detail": "الرجاء تمرير order_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response(
                {"detail": "الطلب غير موجود"},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user
        if not (
            getattr(user, "role", "") == "manager"
            or (order.user and order.user == user)
        ):
            return Response(
                {"detail": "لا تملك صلاحية إنشاء فاتورة لهذا الطلب"},
                status=status.HTTP_403_FORBIDDEN,
            )

        invoice, created = Invoice.objects.get_or_create(order=order)
        serializer = InvoiceSerializer(invoice, context={"request": request})
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PublicInvoiceByOrderView(APIView):
    """
    Endpoint عام لجلب الفاتورة برقم الطلب (يُستخدم من صفحة تتبع الطلب).
    لو لم توجد فاتورة يقوم بإنشائها ثم يرجع رابط PDF.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response(
                {"detail": "الطلب غير موجود"},
                status=status.HTTP_404_NOT_FOUND,
            )

        invoice, _ = Invoice.objects.get_or_create(order=order)
        serializer = InvoiceSerializer(invoice, context={"request": request})
        return Response(serializer.data)
