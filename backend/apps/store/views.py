from django.http import QueryDict
from rest_framework import permissions, status
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import CanManageStoreSettings
from .models import StoreSettings
from .serializers import StoreSettingsSerializer, PublicStoreSettingsSerializer


class StoreSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageStoreSettings]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        obj, _ = StoreSettings.objects.get_or_create(id=1)
        return obj

    def get(self, request, *args, **kwargs):
        serializer = StoreSettingsSerializer(
            self.get_object(), context={"request": request}
        )
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        if isinstance(data, QueryDict):
            data = data.copy()
        elif hasattr(data, "copy"):
            data = data.copy()
        else:
            data = QueryDict("", mutable=True)

        def pop_flag(key: str):
            if isinstance(data, QueryDict):
                values = data.pop(key, None)
                if isinstance(values, list):
                    return values[0] if values else None
                return values
            return data.pop(key, None)

        clear_logo = pop_flag("clear_logo")
        clear_favicon = pop_flag("clear_favicon")
        clear_hero = pop_flag("clear_hero_image")

        serializer = StoreSettingsSerializer(
            instance, data=data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        def should_clear(value):
            if value is None:
                return False
            value = str(value).lower()
            return value in {"1", "true", "yes", "on"}

        instance = serializer.instance
        updated = []

        if should_clear(clear_logo) and instance.logo:
            instance.logo.delete(save=False)
            instance.logo = None
            updated.append("logo")
        if should_clear(clear_favicon) and instance.favicon:
            instance.favicon.delete(save=False)
            instance.favicon = None
            updated.append("favicon")
        if should_clear(clear_hero) and instance.hero_image:
            instance.hero_image.delete(save=False)
            instance.hero_image = None
            updated.append("hero_image")

        if updated:
            instance.save(update_fields=updated + ["updated_at"])

        return Response(
            StoreSettingsSerializer(instance, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class PublicStoreSettingsView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        obj, _ = StoreSettings.objects.get_or_create(id=1)
        return obj

    def get(self, request, *args, **kwargs):
        serializer = PublicStoreSettingsSerializer(
            self.get_object(), context={"request": request}
        )
        return Response(serializer.data)
