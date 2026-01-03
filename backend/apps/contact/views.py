# backend/apps/contact/views.py
from rest_framework import generics, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils.timezone import now

from apps.accounts.permissions import CanManageContactMessages
from apps.store.email_utils import send_store_email
from .models import ContactMessage
from .serializers import ContactMessageSerializer, ContactRequestSerializer


class ContactView(generics.CreateAPIView):
    """
    endpoint استقبال رسائل التواصل من صفحة (من نحن / تواصل معنا)
    POST /api/contact/
    """
    queryset = ContactMessage.objects.all()
    serializer_class = ContactRequestSerializer
    permission_classes = [permissions.AllowAny]


class ContactMessageViewSet(viewsets.ModelViewSet):
    """
    إدارة رسائل التواصل من لوحة التحكم:

    - GET  /api/contact/messages/          -> قائمة الرسائل
    - GET  /api/contact/messages/{id}/     -> تفاصيل رسالة
    - PATCH /api/contact/messages/{id}/    -> تحديث is_read
    - DELETE /api/contact/messages/{id}/   -> حذف الرسالة
    - POST /api/contact/messages/{id}/reply/ -> إرسال رد على الإيميل + تخزينه
    """

    queryset = ContactMessage.objects.all().order_by("-created_at")
    serializer_class = ContactMessageSerializer
    permission_classes = [CanManageContactMessages]

    def partial_update(self, request, *args, **kwargs):
        """
        نسمح بتحديث is_read فقط من الـ PATCH
        """
        instance = self.get_object()
        is_read = request.data.get("is_read", None)

        if is_read is not None:
            instance.is_read = bool(is_read)
            instance.save(update_fields=["is_read"])

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        """
        إرسال رد للعميل عبر البريد + حفظ الرد في قاعدة البيانات
        """
        instance = self.get_object()
        reply_text = (request.data.get("reply") or "").strip()

        if not reply_text:
            return Response(
                {"detail": "الرجاء إدخال نص الرد."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject = "رد على رسالتك – CafeMS Demo"
        message = reply_text
        try:
            send_store_email(
                subject,
                message,
                [instance.email],
                kind="support",
                fail_silently=False,
            )
        except Exception as exc:
            return Response(
                {"detail": f"تعذر إرسال البريد الإلكتروني: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        instance.is_read = True
        instance.reply_text = reply_text
        instance.replied_at = now()
        if request.user.is_authenticated:
            instance.replied_by = request.user
        instance.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

