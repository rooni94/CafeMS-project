from django.urls import path
from .views import (
    LoyaltyPassView,
    LoyaltyScanView,
    LoyaltySettingsView,
    LoyaltyTransactionsView,
    MyLoyaltyProfileView,
    PassKitDevicePassesView,
    PassKitLatestPassView,
    PassKitRegistrationView,
)

urlpatterns = [
    path("profile/", MyLoyaltyProfileView.as_view(), name="loyalty-profile"),
    path("transactions/", LoyaltyTransactionsView.as_view(), name="loyalty-transactions"),
    path("settings/", LoyaltySettingsView.as_view(), name="loyalty-settings"),
    path("scan/", LoyaltyScanView.as_view(), name="loyalty-scan"),
    path("pass/<str:platform>/", LoyaltyPassView.as_view(), name="loyalty-pass"),
    path(
        "passkit/v1/devices/<str:device_library_identifier>/registrations/<str:pass_type_identifier>",
        PassKitDevicePassesView.as_view(),
        name="passkit-device-passes",
    ),
    path(
        "passkit/v1/devices/<str:device_library_identifier>/registrations/<str:pass_type_identifier>/<str:serial_number>",
        PassKitRegistrationView.as_view(),
        name="passkit-registration",
    ),
    path(
        "passkit/v1/passes/<str:pass_type_identifier>/<str:serial_number>",
        PassKitLatestPassView.as_view(),
        name="passkit-latest",
    ),
]
