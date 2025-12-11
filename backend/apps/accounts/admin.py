# backend/apps/accounts/admin.py
from django.contrib import admin
from .models import User, Address, RolePermission  # 👈

admin.site.register(User)
admin.site.register(Address)
admin.site.register(RolePermission)  # 👈
