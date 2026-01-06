# backend/apps/accounts/admin.py
from django.contrib import admin
from .models import User, Address, RolePermission, PushToken  # 👈

admin.site.register(User)
admin.site.register(Address)
admin.site.register(RolePermission)  # 👈
admin.site.register(PushToken)
