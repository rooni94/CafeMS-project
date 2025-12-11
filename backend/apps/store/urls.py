from django.urls import path
from .views import StoreSettingsView, PublicStoreSettingsView


urlpatterns = [
    path("settings/", StoreSettingsView.as_view(), name="store-settings"),
    path(
        "settings/public/",
        PublicStoreSettingsView.as_view(),
        name="public-store-settings",
    ),
]
