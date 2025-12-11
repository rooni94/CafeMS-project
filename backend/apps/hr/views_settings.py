# backend/apps/hr/views_settings.py
from rest_framework.views import APIView
from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import HRSettings, LeaveType
from .serializers import HRSettingsSerializer, LeaveTypeSerializer
from apps.accounts.permissions import IsManager  # عندك جاهزة

class HRSettingsView(APIView):
    permission_classes = [IsManager]

    def get_object(self):
        obj, _ = HRSettings.objects.get_or_create(pk=1)
        return obj

    def get(self, request):
        serializer = HRSettingsSerializer(self.get_object())
        return Response(serializer.data)

    def put(self, request):
        obj = self.get_object()
        serializer = HRSettingsSerializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class LeaveTypeViewSet(generics.ListCreateAPIView, generics.DestroyAPIView):
    queryset = LeaveType.objects.all().order_by("id")
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsManager]
