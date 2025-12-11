# backend/apps/contact/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContactView, ContactMessageViewSet

router = DefaultRouter()
router.register("messages", ContactMessageViewSet, basename="contact-messages")

urlpatterns = [
    path("", ContactView.as_view(), name="contact"),  # POST /api/contact/
    path("", include(router.urls)),                  # GET /api/contact/messages/
   
]
