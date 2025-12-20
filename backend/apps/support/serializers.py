# backend/apps/support/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, SupportMessage, SupportStaffActivity

User = get_user_model()


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

    def get_sender_name(self, obj):
        if obj.sender:
            return obj.sender.username
        if obj.sender_type == "bot":
            return "دعم آلي"
        return "مستخدم"


class ConversationSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "customer",
            "customer_name",
            "assigned_to",
            "is_closed",
            "created_at",
            "last_message_at",
            "last_message",
        ]
        read_only_fields = [
            "id",
            "customer",
            "created_at",
            "last_message_at",
            "last_message",
        ]

    def get_customer_name(self, obj):
        return obj.customer.username if obj.customer else "زائر"

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {
            "id": msg.id,
            "sender_type": msg.sender_type,
            "content": msg.content[:80],
            "created_at": msg.created_at,
        }

# في أسفل apps/support/serializers.py

class SupportConversationSerializer(ConversationSerializer):
    """
    Serializer خاص بلوحة الدعم.
    حالياً نفس ConversationSerializer تماماً،
    لكن نفصله بالاسم لو حاب نضيف حقول خاصة بالداشبورد مستقبلاً.
    """
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

    def get_staff_name(self, obj):
        if not obj.staff:
            return None
        return obj.staff.get_full_name() or obj.staff.username
