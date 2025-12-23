# backend/apps/support/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Conversation, SupportMessage, SupportStaffActivity

User = get_user_model()

_PLACEHOLDER_NAMES = {
    "زائر",
    "ضيف",
    "guest",
    "Guest",
    "visitor",
    "Visitor",
    # legacy/encoding variants that exist in this codebase
    "OýOOÝOñ",
    "OUSU?",
}


def _pick_display_name(*values: object) -> str | None:
    for val in values:
        if val is None:
            continue
        text = str(val).strip()
        if not text:
            continue
        if text in _PLACEHOLDER_NAMES:
            continue
        return text
    return None


class SupportMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportMessage
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_type",
            "sender_name",
            "content",
            "created_at",
            "is_read_by_customer",
            "is_read_by_support",
        ]
        read_only_fields = [
            "id",
            "sender",
            "sender_type",
            "created_at",
            "is_read_by_customer",
            "is_read_by_support",
            "conversation",
        ]

    def get_sender_name(self, obj: SupportMessage):
        if obj.sender:
            full = obj.sender.get_full_name()
            return full or obj.sender.username
        if obj.sender_type == "bot":
            return "روبوت الدعم"
        if obj.sender_type == "guest":
            return _pick_display_name(
                obj.conversation.guest_name,
                obj.conversation.customer_name,
                getattr(obj.conversation, "guest_email", None),
            ) or "زائر"
        return "مستخدم"


class ConversationSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_id = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    unread_for_support = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "customer",
            "customer_id",
            "customer_name",
            "customer_email",
            "owner_name",
            "is_guest",
            "guest_name",
            "guest_email",
            "assigned_to",
            "is_closed",
            "created_at",
            "last_message_at",
            "unread_for_support",
            "last_message",
        ]
        read_only_fields = fields

    def get_customer_name(self, obj: Conversation):
        if obj.customer:
            full = obj.customer.get_full_name()
            return full or obj.customer.username

        return _pick_display_name(obj.guest_name, obj.customer_name, obj.guest_email) or "زائر"

    def get_customer_id(self, obj: Conversation):
        return obj.customer_id if obj.customer_id else None

    def get_customer_email(self, obj: Conversation):
        if obj.customer:
            return getattr(obj.customer, "email", None) or None
        return obj.guest_email or None

    def get_owner_name(self, obj: Conversation):
        # Back-compat for older frontends/mobile expecting owner_name
        return self.get_customer_name(obj)

    def get_unread_for_support(self, obj: Conversation):
        return obj.messages.filter(is_read_by_support=False).exists()

    def get_last_message(self, obj: Conversation):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {
            "id": msg.id,
            "sender_type": msg.sender_type,
            "content": msg.content[:80],
            "created_at": msg.created_at,
        }


class SupportConversationSerializer(ConversationSerializer):
    class Meta(ConversationSerializer.Meta):
        pass


class SupportStaffActivitySerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(read_only=True)
    staff_role = serializers.CharField(read_only=True)

    class Meta:
        model = SupportStaffActivity
        fields = [
            "id",
            "staff",
            "staff_name",
            "staff_role",
            "action_type",
            "conversation",
            "target_name",
            "target_email",
            "message",
            "ip_address",
            "browser",
            "os",
            "device_type",
            "country",
            "city",
            "created_at",
        ]
        read_only_fields = fields
