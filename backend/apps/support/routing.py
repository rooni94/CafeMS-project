# backend/apps/support/routing.py
from django.urls import re_path
from .consumers import SupportChatConsumer

websocket_urlpatterns = [
    # ws://localhost:8000/ws/support/<conversation_id>/?token=<JWT>
    re_path(r"ws/support/(?P<conversation_id>\d+)/$", SupportChatConsumer.as_asgi()),
]
