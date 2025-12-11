# backend/apps/orders/urls.py

from django.urls import path
from .views import (
    OrderViewSet,
    MyOrdersView,
    PublicOrderTrackingView,
    DashboardStatsView,
    OrderActivityLogView,
    TableViewSet,
    InventorySummaryView,
    InventoryAdjustView,
    POSCashierOrderView,
)

order_list = OrderViewSet.as_view({
    "get": "list",
    "post": "create",
})

order_detail = OrderViewSet.as_view({
    "get": "retrieve",
    "patch": "partial_update",
    "put": "update",
    "delete": "destroy",
})

table_list = TableViewSet.as_view({
    "get": "list",
    "post": "create",
})

table_detail = TableViewSet.as_view({
    "get": "retrieve",
    "patch": "partial_update",
    "put": "update",
    "delete": "destroy",
})

urlpatterns = [
    path("", order_list, name="orders-list"),

    path("<int:pk>/", order_detail, name="orders-detail"),

    path("my-orders/", MyOrdersView.as_view(), name="my-orders"),

    path("public/<int:pk>/", PublicOrderTrackingView.as_view(), name="public-order"),

    path("dashboard-stats/", DashboardStatsView.as_view(), name="dashboard-stats"),

    path("activity-log/", OrderActivityLogView.as_view(), name="orders-activity-log"),

    path("pos/tables/", table_list, name="pos-tables"),
    path("pos/tables/<int:pk>/", table_detail, name="pos-tables-detail"),
    path("pos/inventory/summary/", InventorySummaryView.as_view(), name="inventory-summary"),
    path("pos/inventory/adjust/", InventoryAdjustView.as_view(), name="inventory-adjust"),
    path("pos/cashier/orders/", POSCashierOrderView.as_view(), name="pos-cashier-orders"),
]
