from urllib.parse import parse_qs

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from .models import Conversation, SupportMessage, SupportStaffActivity
from .serializers import SupportMessageSerializer
from .bot import generate_bot_reply, should_handover_to_human


class SupportChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket /ws/support/<conversation_id>/
    - يستقبل {type: "message", content: "..."}
    - ينشئ SupportMessage في قاعدة البيانات
    - يبث نفس الرسالة لكل المتصلين بهذه المحادثة (عميل، ضيف، دعم)
    """

    async def connect(self):
        self.conversation_id = int(
            self.scope["url_route"]["kwargs"]["conversation_id"]
        )
        self.group_name = f"support_{self.conversation_id}"

        # تحديد الضيف من query string (?guest=1)
        qs = parse_qs(self.scope.get("query_string", b"").decode())
        if "guest" in qs:
            self.scope["is_guest"] = True

        # تأكد أن المحادثة موجودة وغير محذوفة
        exists = await self.conversation_exists()
        if not exists:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    @database_sync_to_async
    def conversation_exists(self) -> bool:
        return Conversation.objects.filter(
            pk=self.conversation_id, is_deleted=False
        ).exists()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")
        if msg_type != "message":
            return

        text = (content.get("content") or "").strip()
        if not text:
            return

        user = self.scope.get("user")
        is_guest = self.scope.get("is_guest", False)
        is_authenticated = bool(
            user and not isinstance(user, AnonymousUser) and user.is_authenticated
        )

        # 1) إنشاء رسالة المرسل (عميل / ضيف / موظف)
        message_data, sender_type = await self.create_message(
            text, is_authenticated, is_guest, user
        )

        # بث رسالة المرسل
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "message": message_data,
            },
        )

        # 2) رد البوت: للعميل أو الضيف
        #    - لو المستخدم مسجّل: نمرّر الـ user
        #    - لو ضيف: نمرّر None، و generate_bot_reply يتصرف على هذا الأساس
        if sender_type in ("customer", "guest"):
            bot_data = await self.create_bot_message(
                text,
                user if is_authenticated else None,
            )
            if bot_data:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "chat.message",
                        "message": bot_data,
                    },
                )

    @database_sync_to_async
    def create_message(self, text: str, is_authenticated: bool, is_guest: bool, user):
        conv = Conversation.objects.get(pk=self.conversation_id)

        if is_guest or not is_authenticated:
            sender_type = "guest"
            msg = SupportMessage.objects.create(
                conversation=conv,
                sender=None,
                sender_type=sender_type,
                content=text,
                is_read_by_customer=True,
                is_read_by_support=False,
            )
        else:
            # مستخدم مسجّل
            if conv.customer_id == user.id and not conv.is_guest:
                sender_type = "customer"
            else:
                role = getattr(user, "role", "staff")
                if role in ("manager", "supervisor"):
                    sender_type = "manager"
                else:
                    sender_type = "staff"

            msg = SupportMessage.objects.create(
                conversation=conv,
                sender=user,
                sender_type=sender_type,
                content=text,
                is_read_by_customer=sender_type not in ("customer", "guest"),
                is_read_by_support=sender_type in ("customer", "guest"),
            )

        conv.last_message_at = timezone.now()
        conv.save(update_fields=["last_message_at"])

        # ✅ لو المرسل من فريق الدعم → سجّل نشاطه (reply)
        if (
            is_authenticated
            and not is_guest
            and sender_type in ("staff", "manager", "supervisor")
        ):
            target_name = (
                conv.customer_name
                or conv.guest_name
                or (conv.customer.username if conv.customer else None)
            )
            target_email = conv.guest_email

            # IP من الـ scope إن وجد
            client = self.scope.get("client")
            ip_addr = None
            if client and isinstance(client, (list, tuple)) and len(client) >= 1:
                ip_addr = client[0]

            SupportStaffActivity.objects.create(
                staff=user,
                staff_name=user.username,
                staff_role=getattr(user, "role", None),
                action_type="reply",
                conversation=conv,
                target_name=target_name,
                target_email=target_email,
                message=text[:200],
                ip_address=ip_addr,
            )

        return SupportMessageSerializer(msg).data, sender_type

    @database_sync_to_async
    def create_bot_message(self, text: str, user):
        """
        ينشئ رسالة البوت (للعميل أو للضيف).
        - لو user=None → يعتبر الضيف، ويمنع فقط الاستعلام عن حالة الطلب.
        """
        conv = Conversation.objects.get(pk=self.conversation_id)

        # لو المحادثة محذوفة، لا نرد
        if conv.is_deleted:
            return None

        reply_text: str | None = None

        # طلب التحويل لموظف
        if should_handover_to_human(text):
            if not conv.bot_disabled:
                conv.bot_disabled = True
                reply_text = (
                    "شكرًا لتواصلك 🤍\n"
                    "حوّلنا محادثتك لأحد موظفي الدعم.\n"
                    "الرد بيكون بأقرب وقت حسب ضغط الطلبات، نقدّر صبرك 🌿"
                )
            else:
                reply_text = None

        # منطق الرد الآلي العادي إن لم يكن البوت معطّل
        elif not conv.bot_disabled:
            reply_text = generate_bot_reply(user, text)

        if not reply_text:
            conv.save(update_fields=["bot_disabled", "last_message_at"])
            return None

        msg = SupportMessage.objects.create(
            conversation=conv,
            sender=None,
            sender_type="bot",
            content=reply_text,
            is_read_by_customer=True,
            is_read_by_support=False,
        )
        conv.last_message_at = timezone.now()
        conv.save(update_fields=["last_message_at", "bot_disabled"])

        return SupportMessageSerializer(msg).data

    async def chat_message(self, event):
        """
        يتنفّذ عند group_send(type="chat.message", ...)
        """
        await self.send_json(event["message"])
