# backend/apps/support/views.py
import logging
from django.utils import timezone
from django.db import transaction
from django.utils.crypto import get_random_string

from rest_framework import generics, views, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import get_user_model

from apps.accounts.emails import safe_send_mail
from .models import (
    Conversation,
    SupportMessage,
    GuestEmailVerification,
    SupportStaffActivity,
)
from .serializers import (
    ConversationSerializer,
    SupportMessageSerializer,
    SupportStaffActivitySerializer,
)
from .permissions import IsEmployeeOrManager
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .bot import generate_bot_reply, should_handover_to_human
from .voice import (
    VoiceProcessingError,
    encode_audio_base64,
    text_to_speech,
    transcribe_audio,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def _broadcast_message(conversation_id: int, message_data: dict | None):
    if not message_data:
        return
    layer = get_channel_layer()
    if not layer:
        return
    try:
        async_to_sync(layer.group_send)(
            f"support_{conversation_id}",
            {"type": "chat.message", "message": message_data},
        )
    except Exception:
        logger.exception("Failed to broadcast support message to WS")


def _get_or_create_user_conversation(user):
    conv = (
        Conversation.objects.filter(
            customer=user, is_closed=False, is_deleted=False
        )
        .order_by("-created_at")
        .first()
    )
    if not conv:
        conv = Conversation.objects.create(customer=user, is_guest=False)
    return conv


class MyConversationView(views.APIView):
    """
    GET /api/support/my-conversation/
      - يرجّع المحادثة المفتوحة للعميل + إذا ما فيه، ينشئ جديدة مع رسالة بوت ترحيبية
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        conv = (
            Conversation.objects
            .filter(customer=user, is_closed=False, is_deleted=False)
            .order_by("-created_at")
            .first()
        )

        created = False
        if not conv:
            with transaction.atomic():
                conv = Conversation.objects.create(customer=user, is_guest=False)
                SupportMessage.objects.create(
                    conversation=conv,
                    sender=None,
                    sender_type="bot",
                    content="مرحباً 👋 كيف نقدر نساعدك اليوم؟ اكتب سؤالك وسنرد عليك بأقرب وقت.",
                    is_read_by_customer=True,
                )
                created = True

        data = ConversationSerializer(conv).data
        return Response({"conversation": data, "created": created})


class MyMessagesView(views.APIView):
    """
    GET  /api/support/my-messages/
      -> كل رسائل محادثتي المفتوحة
    POST /api/support/my-messages/
      body: { "content": "..." }
      -> يضيف رسالة من العميل + رد آلي من البوت
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self, user):
        return (
            Conversation.objects
            .filter(customer=user, is_closed=False, is_deleted=False)
            .order_by("-created_at")
            .first()
        )

    def get(self, request, *args, **kwargs):
        conv = self.get_conversation(request.user)
        if not conv:
            return Response({"messages": []})
        msgs = conv.messages.all()
        return Response(SupportMessageSerializer(msgs, many=True).data)

    def post(self, request, *args, **kwargs):
        user = request.user
        content = request.data.get("content", "").strip()
        if not content:
            return Response(
                {"detail": "الرجاء كتابة رسالة."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conv = self.get_conversation(user)
        if not conv:
            conv = Conversation.objects.create(customer=user, is_guest=False)

        # رسالة العميل
        msg = SupportMessage.objects.create(
            conversation=conv,
            sender=user,
            sender_type="customer",
            content=content,
            is_read_by_support=False,
            is_read_by_customer=True,
        )
        conv.last_message_at = timezone.now()
        conv.save(update_fields=["last_message_at"])

        auto_text: str | None = None

        # 1) لو طلب موظف → فعّل التحويل، وأوقف الردود الآلية بعد ذلك
        if should_handover_to_human(content):
            if not conv.bot_disabled:
                conv.bot_disabled = True
                conv.save(update_fields=["bot_disabled"])
                auto_text = (
                    "شكرًا لتواصلك 🤍\n"
                    "تم الآن تحويل محادثتك لأحد موظفي الدعم البشري.\n"
                    "قد يستغرق الرد بضع لحظات حسب ضغط المحادثات، نشكر لك صبرك 🌿"
                )
            else:
                auto_text = None

        # 2) لو لم يتم تعطيل البوت → استخدم generate_bot_reply
        elif not conv.bot_disabled:
            auto_text = generate_bot_reply(user, content)

        # 3) إنشاء رسالة البوت (لو فيه نص)
        auto_reply_data = None
        if auto_text:
            auto_reply = SupportMessage.objects.create(
                conversation=conv,
                sender=None,
                sender_type="bot",
                content=auto_text,
                is_read_by_customer=False,
                is_read_by_support=True,
            )
            conv.last_message_at = timezone.now()
            conv.save(update_fields=["last_message_at"])
            auto_reply_data = SupportMessageSerializer(auto_reply).data

        return Response(
            {
                "customer_message": SupportMessageSerializer(msg).data,
                "bot_reply": auto_reply_data,
            },
            status=status.HTTP_201_CREATED,
        )


class MyVoiceMessageView(views.APIView):
    """
    POST /api/support/my-voice/
      body: multipart/form-data { audio: <file> }
      -> STT -> create customer message -> bot reply -> TTS audio (base64) + broadcast to WS
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        audio_file = request.FILES.get("audio")
        if not audio_file:
            return Response(
                {"detail": "Audio file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conv = _get_or_create_user_conversation(request.user)

        try:
            transcript = transcribe_audio(audio_file)
        except VoiceProcessingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Unexpected voice transcription error")
            return Response(
                {"detail": "Voice transcription failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        msg = SupportMessage.objects.create(
            conversation=conv,
            sender=request.user,
            sender_type="customer",
            content=transcript,
            is_read_by_support=False,
            is_read_by_customer=True,
        )
        conv.last_message_at = timezone.now()
        conv.save(update_fields=["last_message_at"])

        customer_data = SupportMessageSerializer(msg).data
        _broadcast_message(conv.id, customer_data)

        auto_text: str | None = None
        if should_handover_to_human(transcript):
            if not conv.bot_disabled:
                conv.bot_disabled = True
                conv.save(update_fields=["bot_disabled"])
                auto_text = (
                    "سيتم تحويلك إلى موظف دعم بشري.\n"
                    "تم إيقاف الرد الآلي وسيتم متابعة المحادثة من فريق الدعم."
                )
        elif not conv.bot_disabled:
            auto_text = generate_bot_reply(request.user, transcript)

        auto_reply_data = None
        bot_audio_b64 = None
        bot_audio_mime = None

        if auto_text:
            auto_reply = SupportMessage.objects.create(
                conversation=conv,
                sender=None,
                sender_type="bot",
                content=auto_text,
                is_read_by_customer=False,
                is_read_by_support=True,
            )
            conv.last_message_at = timezone.now()
            conv.save(update_fields=["last_message_at"])
            auto_reply_data = SupportMessageSerializer(auto_reply).data

            _broadcast_message(conv.id, auto_reply_data)

            try:
                audio_bytes, audio_mime = text_to_speech(auto_text)
                bot_audio_b64 = encode_audio_base64(audio_bytes)
                bot_audio_mime = audio_mime
            except VoiceProcessingError as exc:
                logger.warning("TTS failed: %s", exc)
            except Exception:
                logger.exception("TTS unexpected failure")

        return Response(
            {
                "customer_message": customer_data,
                "bot_reply": auto_reply_data,
                "transcription_text": transcript,
                "bot_audio_base64": bot_audio_b64,
                "bot_audio_mime": bot_audio_mime,
            },
            status=status.HTTP_201_CREATED,
        )


class ConversationListView(generics.ListAPIView):
    """
    GET /api/support/conversations/
      -> قائمة بكل المحادثات
    """
    serializer_class = ConversationSerializer
    permission_classes = [IsEmployeeOrManager]

    def get_queryset(self):
        qs = Conversation.objects.filter(is_deleted=False).order_by(
            "-last_message_at", "-created_at"
        )
        status_param = self.request.query_params.get("status")
        if status_param == "open":
            qs = qs.filter(is_closed=False)
        elif status_param == "closed":
            qs = qs.filter(is_closed=True)
        return qs


class ConversationDetailView(generics.RetrieveAPIView):
    """
    GET /api/support/conversations/<id>/
    """

    serializer_class = ConversationSerializer
    permission_classes = [IsEmployeeOrManager]

    def get_queryset(self):
        return Conversation.objects.filter(is_deleted=False)


class ConversationMessagesView(views.APIView):
    """
    GET  /api/support/conversations/<id>/messages/
    POST /api/support/conversations/<id>/messages/  (رد من الدعم عبر REST)
    """
    permission_classes = [IsEmployeeOrManager]

    def get_object(self, pk):
        return Conversation.objects.get(pk=pk, is_deleted=False)

    def get(self, request, pk, *args, **kwargs):
        try:
            conv = self.get_object(pk)
        except Conversation.DoesNotExist:
            return Response(
                {"detail": "المحادثة غير موجودة."},
                status=status.HTTP_404_NOT_FOUND,
            )

        msgs = conv.messages.all()
        conv.messages.filter(is_read_by_support=False).update(
            is_read_by_support=True
        )
        return Response(SupportMessageSerializer(msgs, many=True).data)

    def post(self, request, pk, *args, **kwargs):
        try:
            conv = self.get_object(pk)
        except Conversation.DoesNotExist:
            return Response(
                {"detail": "المحادثة غير موجودة."},
                status=status.HTTP_404_NOT_FOUND,
            )

        content = request.data.get("content", "").strip()
        if not content:
            return Response(
                {"detail": "الرجاء كتابة رسالة."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        role = getattr(user, "role", "staff")
        if role in ("manager", "supervisor"):
            sender_type = "manager"
        else:
            sender_type = "staff"

        msg = SupportMessage.objects.create(
            conversation=conv,
            sender=user,
            sender_type=sender_type,
            content=content,
            is_read_by_customer=False,
            is_read_by_support=True,
        )
        conv.last_message_at = timezone.now()
        if not conv.assigned_to:
            conv.assigned_to = user
        conv.save(update_fields=["last_message_at", "assigned_to"])

        # ✅ تسجيل نشاط الموظف (رد على محادثة دعم)
        target_name = (
            conv.customer_name
            or conv.guest_name
            or (conv.customer.username if conv.customer else None)
        )
        target_email = conv.guest_email

        SupportStaffActivity.objects.create(
            staff=user,
            staff_name=user.username,
            staff_role=getattr(user, "role", None),
            action_type="reply",
            conversation=conv,
            target_name=target_name,
            target_email=target_email,
            message=content[:200],
            ip_address=request.META.get("REMOTE_ADDR") or None,
            user_agent=request.META.get("HTTP_USER_AGENT") or None,
        )

        return Response(
            SupportMessageSerializer(msg).data,
            status=status.HTTP_201_CREATED,
        )


class CloseConversationView(views.APIView):
    """
    POST /api/support/conversations/<id>/close/
    """
    permission_classes = [IsEmployeeOrManager]

    def post(self, request, pk, *args, **kwargs):
        try:
            conv = Conversation.objects.get(pk=pk, is_deleted=False)
        except Conversation.DoesNotExist:
            return Response(
                {"detail": "المحادثة غير موجودة."}, status=status.HTTP_404_NOT_FOUND
            )

        conv.is_closed = True
        conv.closed_at = timezone.now()
        if not conv.closed_by:
            conv.closed_by = request.user
        conv.save(update_fields=["is_closed", "closed_at", "closed_by"])
        return Response({"detail": "تم إغلاق المحادثة."})


class MarkConversationReadView(APIView):
    """
    POST /api/support/conversations/<id>/mark-read/
    """
    permission_classes = [IsEmployeeOrManager]

    def post(self, request, pk, *args, **kwargs):
        try:
            conv = Conversation.objects.get(pk=pk, is_deleted=False)
        except Conversation.DoesNotExist:
            return Response(
                {"detail": "المحادثة غير موجودة."}, status=status.HTTP_404_NOT_FOUND
            )

        conv.messages.filter(is_read_by_support=False).update(
            is_read_by_support=True
        )
        return Response({"detail": "تم تعليم الرسائل كمقروءة."})


# ====================== منطق الضيف ======================


class GuestRequestCodeView(APIView):
    """
    POST /api/support/guest-request-code/
      body: { "name": "...", "email": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        name = request.data.get("name")
        email = request.data.get("email")
        if not name or not email:
            return Response(
                {"detail": "الاسم والبريد مطلوبان."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = get_random_string(6, allowed_chars="0123456789")

        obj = GuestEmailVerification.objects.create(
            name=name.strip(),
            email=email.strip(),
            code=code,
        )

        subject = "كود التحقق من البريد – دعم CafeMS Demo"
        message = (
            f"مرحباً {name},\n\n"
            f"كود التحقق الخاص بك هو: {code}\n"
            "صلاحيته 15 دقيقة.\n\n"
            "مع تحيات CafeMS Demo."
        )
        safe_send_mail(subject, message, [email])

        return Response(
            {"request_id": obj.id, "detail": "تم إرسال كود التحقق إلى بريدك."},
            status=status.HTTP_200_OK,
        )


class GuestVerifyCodeView(APIView):
    """
    POST /api/support/guest-verify-code/
      body: { "request_id": .., "code": "123456" }
    ينشئ محادثة دعم للضيف بعد التحقق من الكود
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        request_id = request.data.get("request_id")
        code = request.data.get("code")

        if not request_id or not code:
            return Response(
                {"detail": "بيانات غير مكتملة."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            obj = GuestEmailVerification.objects.get(id=request_id)
        except GuestEmailVerification.DoesNotExist:
            return Response(
                {"detail": "طلب غير موجود أو منتهي."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if obj.is_expired():
            return Response(
                {"detail": "انتهت صلاحية الكود، الرجاء طلب كود جديد."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if obj.code != code:
            return Response(
                {"detail": "كود التحقق غير صحيح."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj.is_verified = True
        obj.save(update_fields=["is_verified"])

        # إنشاء محادثة دعم للضيف
        with transaction.atomic():
            conv = Conversation.objects.create(
                customer=None,
                customer_name=obj.name,
                guest_name=obj.name,
                guest_email=obj.email,
                is_guest=True,
                guest_token=get_random_string(48),
            )
            # رسالة ترحيبية
            SupportMessage.objects.create(
                conversation=conv,
                sender=None,
                sender_type="bot",
                content="مرحباً 👋 تم توثيق بريدك، يمكنك الآن بدء الدردشة مع الدعم.",
                is_read_by_customer=True,
                is_read_by_support=False,
            )

        data = ConversationSerializer(conv).data
        return Response(
            {"conversation": data, "guest_token": conv.guest_token},
            status=status.HTTP_200_OK,
        )


class GuestConversationMessagesView(APIView):
    """
    GET  /api/support/guest-conversations/<id>/messages/
    POST /api/support/guest-conversations/<id>/messages/
      header: X-Guest-Token: <token>
    """

    permission_classes = [permissions.AllowAny]

    def _get_guest_token(self, request) -> str:
        return (request.headers.get("X-Guest-Token") or "").strip()

    def _get_conversation(self, pk: int, guest_token: str) -> Conversation:
        return Conversation.objects.get(
            pk=pk,
            is_guest=True,
            guest_token=guest_token,
            is_deleted=False,
        )

    def get(self, request, pk, *args, **kwargs):
        guest_token = self._get_guest_token(request)
        if not guest_token:
            return Response(
                {"detail": "Guest token required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            conv = self._get_conversation(pk, guest_token)
        except Conversation.DoesNotExist:
            return Response(
                {"detail": "Unauthorized or conversation not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        msgs = conv.messages.all()
        conv.messages.filter(is_read_by_customer=False).update(
            is_read_by_customer=True
        )
        return Response(SupportMessageSerializer(msgs, many=True).data)

    def post(self, request, pk, *args, **kwargs):
        guest_token = self._get_guest_token(request)
        if not guest_token:
            return Response(
                {"detail": "Guest token required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            conv = self._get_conversation(pk, guest_token)
        except Conversation.DoesNotExist:
            return Response(
                {"detail": "Unauthorized or conversation not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        content = (request.data.get("content") or "").strip()
        if not content:
            return Response(
                {"detail": "Message content is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        msg = SupportMessage.objects.create(
            conversation=conv,
            sender=None,
            sender_type="guest",
            content=content,
            is_read_by_customer=True,
            is_read_by_support=False,
        )
        conv.last_message_at = timezone.now()
        conv.save(update_fields=["last_message_at"])

        auto_text: str | None = None
        if should_handover_to_human(content):
            if not conv.bot_disabled:
                conv.bot_disabled = True
                conv.save(update_fields=["bot_disabled"])
                auto_text = "تم تحويل المحادثة للدعم البشري وسيتم الرد قريباً."
        elif not conv.bot_disabled:
            auto_text = generate_bot_reply(None, content)

        auto_reply_data = None
        if auto_text:
            auto_reply = SupportMessage.objects.create(
                conversation=conv,
                sender=None,
                sender_type="bot",
                content=auto_text,
                is_read_by_customer=True,
                is_read_by_support=False,
            )
            conv.last_message_at = timezone.now()
            conv.save(update_fields=["last_message_at"])
            auto_reply_data = SupportMessageSerializer(auto_reply).data

        return Response(
            {
                "guest_message": SupportMessageSerializer(msg).data,
                "bot_reply": auto_reply_data,
            },
            status=status.HTTP_201_CREATED,
        )


class GuestVoiceMessageView(APIView):
    """
    POST /api/support/guest-conversations/<id>/voice/
      header: X-Guest-Token
      body: multipart/form-data { audio: <file> }
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, pk, *args, **kwargs):
        guest_token = (request.headers.get("X-Guest-Token") or "").strip()
        if not guest_token:
            return Response(
                {"detail": "Guest token required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            conv = Conversation.objects.get(
                pk=pk,
                is_guest=True,
                guest_token=guest_token,
                is_deleted=False,
            )
        except Conversation.DoesNotExist:
            return Response(
                {"detail": "Unauthorized or conversation not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        audio_file = request.FILES.get("audio")
        if not audio_file:
            return Response(
                {"detail": "Audio file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            transcript = transcribe_audio(audio_file)
        except VoiceProcessingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Unexpected guest voice transcription error")
            return Response(
                {"detail": "Voice transcription failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        guest_msg = SupportMessage.objects.create(
            conversation=conv,
            sender=None,
            sender_type="guest",
            content=transcript,
            is_read_by_customer=True,
            is_read_by_support=False,
        )
        conv.last_message_at = timezone.now()
        conv.save(update_fields=["last_message_at"])

        guest_data = SupportMessageSerializer(guest_msg).data
        _broadcast_message(conv.id, guest_data)

        auto_text: str | None = None
        if should_handover_to_human(transcript):
            if not conv.bot_disabled:
                conv.bot_disabled = True
                conv.save(update_fields=["bot_disabled"])
                auto_text = (
                    "سيتم تحويلك إلى موظف دعم بشري.\n"
                    "تم إيقاف الرد الآلي وسيتم متابعة المحادثة من فريق الدعم."
                )
        elif not conv.bot_disabled:
            auto_text = generate_bot_reply(None, transcript)

        auto_reply_data = None
        bot_audio_b64 = None
        bot_audio_mime = None

        if auto_text:
            auto_reply = SupportMessage.objects.create(
                conversation=conv,
                sender=None,
                sender_type="bot",
                content=auto_text,
                is_read_by_customer=True,
                is_read_by_support=False,
            )
            conv.last_message_at = timezone.now()
            conv.save(update_fields=["last_message_at"])
            auto_reply_data = SupportMessageSerializer(auto_reply).data

            _broadcast_message(conv.id, auto_reply_data)

            try:
                audio_bytes, audio_mime = text_to_speech(auto_text)
                bot_audio_b64 = encode_audio_base64(audio_bytes)
                bot_audio_mime = audio_mime
            except VoiceProcessingError as exc:
                logger.warning("Guest TTS failed: %s", exc)
            except Exception:
                logger.exception("Guest TTS unexpected failure")

        return Response(
            {
                "guest_message": guest_data,
                "bot_reply": auto_reply_data,
                "transcription_text": transcript,
                "bot_audio_base64": bot_audio_b64,
                "bot_audio_mime": bot_audio_mime,
            },
            status=status.HTTP_201_CREATED,
        )


class DeleteConversationView(APIView):
    """
    DELETE /api/support/conversations/<id>/delete/
    حذف المحادثة من لوحة التحكم (للموظفين والمدراء فقط).
    """
    permission_classes = [IsEmployeeOrManager]

    def delete(self, request, pk, *args, **kwargs):
        try:
            conv = Conversation.objects.get(pk=pk, is_deleted=False)
        except Conversation.DoesNotExist:
            return Response(
                {"detail": "المحادثة غير موجودة."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user

        # نحدد اسم الشخص الذي كانت المحادثة معه
        if conv.is_guest:
            target_name = conv.guest_name or conv.customer_name or "ضيف"
            target_email = conv.guest_email
        elif conv.customer:
            target_name = getattr(conv.customer, "username", None)
            target_email = getattr(conv.customer, "email", None)
        else:
            target_name = conv.customer_name
            target_email = None

        # ✅ تسجيل نشاط: حذف محادثة
        SupportStaffActivity.objects.create(
            staff=user,
            staff_name=user.username,
            staff_role=getattr(user, "role", None),
            action_type="delete_conversation",
            conversation=conv,
            target_name=target_name,
            target_email=target_email,
            message="حذف المحادثة من لوحة الدعم.",
            ip_address=request.META.get("REMOTE_ADDR") or None,
            user_agent=request.META.get("HTTP_USER_AGENT") or None,
        )

        # حذف منطقي بدل delete كامل (لو حاب)
        conv.is_deleted = True
        conv.deleted_at = timezone.now()
        conv.deleted_by = user
        conv.save(update_fields=["is_deleted", "deleted_at", "deleted_by"])

        return Response(
            {"detail": "تم حذف المحادثة."},
            status=status.HTTP_204_NO_CONTENT,
        )


class MyCloseConversationView(APIView):
    """
    POST /api/support/my-conversation/close/
    يغلق المحادثة الحالية للعميل.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        conv = (
            Conversation.objects
            .filter(customer=user, is_closed=False, is_deleted=False)
            .order_by("-created_at")
            .first()
        )
        if not conv:
            return Response(
                {"detail": "لا توجد محادثة مفتوحة حالياً."},
                status=200,
            )

        conv.is_closed = True
        conv.closed_at = timezone.now()
        if not conv.closed_by:
            conv.closed_by = user
        conv.save(update_fields=["is_closed", "closed_at", "closed_by"])

        return Response(
            {"detail": "تم إنهاء المحادثة. يمكنك فتح محادثة جديدة في أي وقت."},
            status=200,
        )


class SupportStaffActivityListView(generics.ListAPIView):
    """
    GET /api/support/activities/
    يمكن التصفية بـ ?staff=<user_id>
    """
    permission_classes = [IsEmployeeOrManager]
    serializer_class = SupportStaffActivitySerializer

    def get_queryset(self):
        qs = SupportStaffActivity.objects.select_related("staff", "conversation")
        staff_id = self.request.query_params.get("staff")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        return qs

