# backend/apps/contact/admin.py
from django.contrib import admin
from .models import ContactMessage

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = (       'name',
        'email',
        'phone',
        'created_at',
        'is_read',
        'replied_at',
        'replied_by',)
    search_fields = ('name', 'email', 'phone', 'message')
    list_filter = ('created_at', 'is_read')
