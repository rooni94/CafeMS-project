from django.contrib import admin
from .models import Order, OrderItem, Table, InventoryAdjustment, OrderItemAddon

admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(OrderItemAddon)
admin.site.register(Table)
admin.site.register(InventoryAdjustment)
