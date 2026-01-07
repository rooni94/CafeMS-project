from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.utils import timezone

from apps.accounts.permissions import (
    CanAccessCashier,
    HasFeaturePermission,
    get_role_permission,
)

from .models import (
    LoyaltyPassRegistration,
    LoyaltyProfile,
    LoyaltySettings,
    LoyaltyTransaction,
)
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
from .passkit import (
    PassKitConfigError,
    build_pkpass,
    build_pass_response,
    extract_auth_token,
    format_last_updated,
    get_expected_pass_type_identifier,
    is_pass_modified_since,
    parse_passes_updated_since,
    verify_auth_token,
)


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
        if platform == "apple":
            try:
                build_pkpass(profile)
            except PassKitConfigError as exc:
                return Response(
                    {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
                )
        return Response(
            {
                "detail": "تم إنشاء البطاقة بشكل تجريبي. قم بربط شهادات Apple/Google لاحقاً.",
                "pass_url": fake_url,
            }
        )


class PassDownloadView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, platform: str, serial_number: str):
        if platform != "apple":
            return Response({"detail": "Unsupported platform."}, status=404)
        profile = LoyaltyProfile.objects.filter(membership_id=serial_number).first()
        if not profile:
            return Response({"detail": "Pass not found."}, status=404)
        try:
            pkpass, last_modified = build_pkpass(profile)
        except PassKitConfigError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data, headers = build_pass_response(pkpass, last_modified)
        response = HttpResponse(data, content_type=headers["Content-Type"])
        for key, value in headers.items():
            response[key] = value
        response["Content-Disposition"] = f'attachment; filename="{serial_number}.pkpass"'
        return response


class PassKitRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(
        self,
        request,
        device_library_identifier: str,
        pass_type_identifier: str,
        serial_number: str,
    ):
        expected = get_expected_pass_type_identifier()
        if expected and pass_type_identifier != expected:
            return Response(status=404)
        profile = LoyaltyProfile.objects.filter(membership_id=serial_number).first()
        if not profile:
            return Response(status=404)
        auth_token = extract_auth_token(request.headers.get("Authorization"))
        if not verify_auth_token(profile, auth_token):
            return Response(status=401)
        push_token = request.data.get("pushToken")
        if not push_token:
            return Response(
                {"detail": "pushToken is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        registration, created = LoyaltyPassRegistration.objects.update_or_create(
            profile=profile,
            device_library_id=device_library_identifier,
            pass_type_identifier=pass_type_identifier,
            defaults={"push_token": push_token},
        )
        return Response(status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(
        self,
        request,
        device_library_identifier: str,
        pass_type_identifier: str,
        serial_number: str,
    ):
        expected = get_expected_pass_type_identifier()
        if expected and pass_type_identifier != expected:
            return Response(status=404)
        profile = LoyaltyProfile.objects.filter(membership_id=serial_number).first()
        if not profile:
            return Response(status=404)
        auth_token = extract_auth_token(request.headers.get("Authorization"))
        if not verify_auth_token(profile, auth_token):
            return Response(status=401)
        deleted, _ = LoyaltyPassRegistration.objects.filter(
            profile=profile,
            device_library_id=device_library_identifier,
            pass_type_identifier=pass_type_identifier,
        ).delete()
        return Response(status=status.HTTP_200_OK if deleted else status.HTTP_404_NOT_FOUND)


class PassKitDevicePassesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, device_library_identifier: str, pass_type_identifier: str):
        expected = get_expected_pass_type_identifier()
        if expected and pass_type_identifier != expected:
            return Response(status=404)

        since = parse_passes_updated_since(request.query_params.get("passesUpdatedSince"))
        registrations = LoyaltyPassRegistration.objects.filter(
            device_library_id=device_library_identifier,
            pass_type_identifier=pass_type_identifier,
        ).select_related("profile")
        if since:
            registrations = registrations.filter(profile__updated_at__gt=since)
        registrations = list(registrations)
        serials = [reg.profile.membership_id for reg in registrations if reg.profile]
        if not serials:
            return Response(status=status.HTTP_204_NO_CONTENT)

        last_updated = max(
            (reg.profile.updated_at or timezone.now() for reg in registrations),
            default=timezone.now(),
        )
        return Response(
            {
                "serialNumbers": serials,
                "lastUpdated": format_last_updated(last_updated),
            }
        )


class PassKitLatestPassView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pass_type_identifier: str, serial_number: str):
        expected = get_expected_pass_type_identifier()
        if expected and pass_type_identifier != expected:
            return Response(status=404)
        profile = LoyaltyProfile.objects.filter(membership_id=serial_number).first()
        if not profile:
            return Response(status=404)
        auth_token = extract_auth_token(request.headers.get("Authorization"))
        if not verify_auth_token(profile, auth_token):
            return Response(status=401)
        last_modified = profile.updated_at or timezone.now()
        if not is_pass_modified_since(
            last_modified, request.headers.get("If-Modified-Since")
        ):
            return HttpResponse(status=304)
        try:
            pkpass, last_modified = build_pkpass(profile)
        except PassKitConfigError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data, headers = build_pass_response(pkpass, last_modified)
        response = HttpResponse(data, content_type=headers["Content-Type"])
        for key, value in headers.items():
            response[key] = value
        return response
