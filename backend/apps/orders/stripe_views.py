from decimal import Decimal, ROUND_HALF_UP
from urllib.parse import urlparse

import stripe
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from apps.products.models import Product, ProductAddon

stripe.api_key = settings.STRIPE_SECRET_KEY


def _allowed_redirect_hosts():
    hosts = set()
    frontend = getattr(settings, "FRONTEND_URL", "").strip()
    if frontend:
        try:
            parsed = urlparse(frontend)
            if parsed.hostname:
                hosts.add(parsed.hostname.lower())
        except Exception:
            pass
    extra_hosts = getattr(settings, "CHECKOUT_REDIRECT_HOSTS", None) or []
    for host in extra_hosts:
        if isinstance(host, str) and host.strip():
            hosts.add(host.strip().lower())
    return hosts


def _sanitize_redirect_url(raw_url, default_path):
    base = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    if not raw_url:
        return f"{base}{default_path}"
    try:
        parsed = urlparse(raw_url)
    except Exception:
        return f"{base}{default_path}"
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return f"{base}{default_path}"
    if parsed.hostname.lower() not in _allowed_redirect_hosts():
        return f"{base}{default_path}"
    return raw_url


def _resolve_line_items(items):
    line_items = []
    currency = getattr(settings, "STRIPE_CURRENCY", "SAR").lower()

    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Invalid item payload.")
        product_id = item.get("product_id") or item.get("product")
        if not product_id:
            raise ValueError("Missing product_id.")

        quantity = item.get("quantity", 1)
        try:
            quantity = int(quantity)
        except Exception:
            quantity = 0
        if quantity <= 0:
            raise ValueError("Invalid quantity.")

        product = Product.objects.get(pk=product_id)
        if hasattr(product, "available") and not product.available:
            raise ValueError("Product is unavailable.")

        addon_ids = item.get("addon_ids") or []
        if not isinstance(addon_ids, list):
            raise ValueError("Invalid addon_ids.")

        addons_qs = ProductAddon.objects.filter(
            id__in=addon_ids, product_id=product.id, is_active=True
        )
        if addons_qs.count() != len(addon_ids):
            raise ValueError("Invalid addons for product.")

        addons_total = sum(
            (addon.price_delta for addon in addons_qs), Decimal("0.00")
        )
        price = (product.price + addons_total).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if price <= 0:
            raise ValueError("Invalid product price.")

        unit_amount = int(
            (price * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP)
        )

        description = None
        if addon_ids:
            addon_names = ", ".join([a.name for a in addons_qs])
            description = f"Addons: {addon_names}"

        line_items.append(
            {
                "price_data": {
                    "currency": currency,
                    "product_data": {
                        "name": product.name,
                        **({"description": description} if description else {}),
                    },
                    "unit_amount": unit_amount,
                },
                "quantity": quantity,
            }
        )

    if not line_items:
        raise ValueError("Cart is empty.")
    return line_items


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle, UserRateThrottle])
def create_checkout_session(request):
    items = request.data.get("items", [])
    if not isinstance(items, list):
        return JsonResponse({"detail": "Invalid items payload."}, status=400)

    try:
        line_items = _resolve_line_items(items)
    except Product.DoesNotExist:
        return JsonResponse({"detail": "Product not found."}, status=400)
    except ValueError as exc:
        return JsonResponse({"detail": str(exc)}, status=400)

    success_url = _sanitize_redirect_url(request.data.get("success_url"), "/success")
    cancel_url = _sanitize_redirect_url(request.data.get("cancel_url"), "/cancel")

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=line_items,
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
    )
    return JsonResponse({"id": session.id})


@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception:
        return HttpResponse(status=400)
    # handle event types
    return HttpResponse(status=200)
