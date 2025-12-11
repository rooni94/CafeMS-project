# backend/apps/contact/serializers.py
from rest_framework import serializers
from .models import ContactMessage


class ContactRequestSerializer(serializers.Serializer):
    """
    يُستخدم من الواجهة العامة /api/contact/ عندما يرسل الزبون رسالة من الصفحة
    """
    name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    email = serializers.EmailField()
    message = serializers.CharField()

    def create(self, validated_data):
        return ContactMessage.objects.create(**validated_data)


class ContactMessageSerializer(serializers.ModelSerializer):
    replied_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ContactMessage
        fields = [
            'id',
            'name',
            'phone',
            'email',
            'message',
            'created_at',
            'is_read',
            'reply_text',
            'replied_at',
            'replied_by_name',
        ]
        read_only_fields = ['id', 'created_at', 'replied_at', 'replied_by_name', 'reply_text']

    def get_replied_by_name(self, obj):
        if obj.replied_by:
            return obj.replied_by.get_username()
        return None
