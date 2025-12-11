from django.urls import path
from .views import (
    LoyaltyPassView,
    LoyaltyScanView,
    LoyaltySettingsView,
    LoyaltyTransactionsView,
    MyLoyaltyProfileView,
)

urlpatterns = [
    path("profile/", MyLoyaltyProfileView.as_view(), name="loyalty-profile"),
    path("transactions/", LoyaltyTransactionsView.as_view(), name="loyalty-transactions"),
    path("settings/", LoyaltySettingsView.as_view(), name="loyalty-settings"),
    path("scan/", LoyaltyScanView.as_view(), name="loyalty-scan"),
    path("pass/<str:platform>/", LoyaltyPassView.as_view(), name="loyalty-pass"),
]
