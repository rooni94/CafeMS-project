from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import (
    CanAccessCashier,
    HasFeaturePermission,
    get_role_permission,
)

from .models import LoyaltySettings, LoyaltyTransaction
from .serializers import (
    LoyaltyProfileSerializer,
    LoyaltySettingsSerializer,
    LoyaltyTransactionSerializer,
)
from .services import (
    get_or_create_profile,
    adjust_points_by_membership,
)
from apps.store.models import StoreSettings


class CanManageLoyalty(HasFeaturePermission):
    feature_name = "can_manage_loyalty"


class MyLoyaltyProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        serializer = LoyaltyProfileSerializer(profile)
        settings_serializer = LoyaltySettingsSerializer(LoyaltySettings.load())
        return Response(
            {
                "profile": serializer.data,
                "settings": settings_serializer.data,
            }
        )


class LoyaltyTransactionsView(generics.ListAPIView):
    serializer_class = LoyaltyTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        membership_id = self.request.query_params.get("membership_id")
        rp = get_role_permission(user)
        if membership_id and rp and getattr(rp, "can_manage_loyalty", False):
            return LoyaltyTransaction.objects.filter(
                profile__membership_id=membership_id
            )
        profile = get_or_create_profile(user)
        return profile.transactions.all()


class LoyaltySettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = LoyaltySettingsSerializer
    permission_classes = [IsAuthenticated, CanManageLoyalty]

    def get_object(self):
        return LoyaltySettings.load()


class LoyaltyScanView(APIView):
    permission_classes = [IsAuthenticated, CanAccessCashier]

    def post(self, request):
        membership_id = request.data.get("membership_id")
        try:
            delta = int(request.data.get("points_delta", 0))
        except (TypeError, ValueError):
            delta = 0
        note = request.data.get("note", "")

        if not membership_id or delta == 0:
            return Response(
                {"detail": "membership_id و points_delta مطلوبة."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = adjust_points_by_membership(membership_id, delta, note=note)
        if not result:
            return Response(
                {"detail": "لم يتم العثور على هذا العميل."},
                status=status.HTTP_404_NOT_FOUND,
            )
        profile, txn = result
        return Response(
            {
                "profile": LoyaltyProfileSerializer(profile).data,
                "transaction": LoyaltyTransactionSerializer(txn).data,
            }
        )


class LoyaltyPassView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, platform: str):
        profile = get_or_create_profile(request.user)
        if platform not in ("apple", "google"):
            return Response(
                {"detail": "منصة غير مدعومة."}, status=status.HTTP_400_BAD_REQUEST
            )
        settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
        base_url = (
            settings_obj.wallet_pass_base_url
            if settings_obj.wallet_pass_base_url
            else "https://example.invalid"
        )
        base_url = base_url.rstrip("/")
        fake_url = f"{base_url}/passes/{platform}/{profile.membership_id}.pkpass"
        field = (
            "apple_wallet_pass_id"
            if platform == "apple"
            else "google_wallet_pass_id"
        )
        setattr(profile, field, fake_url)
        profile.save(update_fields=[field, "updated_at"])
        return Response(
            {
                "detail": "تم إنشاء البطاقة بشكل تجريبي. قم بربط شهادات Apple/Google لاحقاً.",
                "pass_url": fake_url,
            }
        )
