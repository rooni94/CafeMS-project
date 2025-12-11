# cafe_backend/asgi.py
import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cafe_backend.settings")

django_asgi_app = get_asgi_application()

from apps.support.routing import websocket_urlpatterns
from apps.support.jwt_middleware import JwtAuthMiddlewareStack


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JwtAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        ),
    }
)
