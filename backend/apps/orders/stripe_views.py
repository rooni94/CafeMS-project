import json
from decimal import Decimal, ROUND_HALF_UP
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import stripe
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import UserRateThrottle

from apps.orders.models import Order
from apps.payments.models import PaymentMethod, PaymentTransaction
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


def _append_session_id_placeholder(url):
    """
    يضمن إضافة session_id={CHECKOUT_SESSION_ID} إلى success_url.
    """
    try:
        parsed = urlparse(url)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        if "session_id" not in query:
            query["session_id"] = "{CHECKOUT_SESSION_ID}"
        return urlunparse(parsed._replace(query=urlencode(query)))
    except Exception:
        separator = "&" if "?" in url else "?"
        return f"{url}{separator}session_id={{CHECKOUT_SESSION_ID}}"


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


def _resolve_order_line_items(order: Order):
    line_items = []
    currency = getattr(settings, "STRIPE_CURRENCY", "SAR").lower()

    items = order.items.select_related("product").prefetch_related("addons")
    for order_item in items:
        quantity = int(order_item.quantity or 0)
        if quantity <= 0:
            continue

        price = (order_item.price or Decimal("0.00")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if price <= 0:
            continue

        description = None
        addon_names = [addon.name for addon in order_item.addons.all() if addon.name]
        if addon_names:
            description = f"Addons: {', '.join(addon_names)}"

        unit_amount = int(
            (price * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP)
        )

        line_items.append(
            {
                "price_data": {
                    "currency": currency,
                    "product_data": {
                        "name": order_item.product.name,
                        **({"description": description} if description else {}),
                    },
                    "unit_amount": unit_amount,
                },
                "quantity": quantity,
            }
        )

    if not line_items:
        raise ValueError("Order has no payable items.")
    return line_items


def _resolve_order_for_checkout(request, order_id):
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return None, JsonResponse({"detail": "Order not found."}, status=404)

    user = request.user
    role = getattr(user, "role", "")
    if role not in ("manager", "supervisor", "staff") and order.user_id != user.id:
        return None, JsonResponse({"detail": "You cannot pay this order."}, status=403)

    if order.payment_status == "paid":
        return None, JsonResponse({"detail": "Order is already paid."}, status=400)

    return order, None


def _ensure_online_method():
    method = PaymentMethod.objects.filter(code=PaymentMethod.Code.CARD).first()
    if method:
        return method
    method, _ = PaymentMethod.objects.get_or_create(
        code=PaymentMethod.Code.CARD,
        name="Card (Stripe)",
        defaults={
            "is_online": True,
            "is_active": True,
            "description": "Auto-created for Stripe card checkout.",
        },
    )
    return method


def _sync_order_payment_state(order: Order, state: str):
    updates = []
    if order.payment_method != "online":
        order.payment_method = "online"
        updates.append("payment_method")

    if state == "paid":
        if order.payment_status != "paid":
            order.payment_status = "paid"
            updates.append("payment_status")
        if not order.paid:
            order.paid = True
            updates.append("paid")
    elif state == "failed":
        if order.payment_status != "failed":
            order.payment_status = "failed"
            updates.append("payment_status")
        if order.paid:
            order.paid = False
            updates.append("paid")
    elif state == "pending":
        if order.payment_status != "pending":
            order.payment_status = "pending"
            updates.append("payment_status")
        if order.paid:
            order.paid = False
            updates.append("paid")

    if updates:
        order.save(update_fields=updates)


def _upsert_payment_transaction(order: Order, session, status: str):
    method = _ensure_online_method()
    currency = (session.get("currency") or getattr(settings, "STRIPE_CURRENCY", "SAR")).upper()
    amount_total = session.get("amount_total")
    if isinstance(amount_total, int):
        amount = (Decimal(amount_total) / Decimal("100")).quantize(Decimal("0.01"))
    else:
        amount = (order.total or Decimal("0.00")).quantize(Decimal("0.01"))

    provider_reference = (
        session.get("payment_intent")
        or session.get("id")
        or f"order-{order.id}"
    )

    txn_defaults = {
        "order": order,
        "method": method,
        "amount": amount,
        "currency": currency,
        "status": status,
        "provider_raw_response": session,
    }
    transaction, created = PaymentTransaction.objects.get_or_create(
        provider_reference=provider_reference,
        defaults=txn_defaults,
    )

    if not created:
        transaction.order = order
        transaction.method = method
        transaction.amount = amount
        transaction.currency = currency
        transaction.status = status
        transaction.provider_raw_response = session
        transaction.save(
            update_fields=[
                "order",
                "method",
                "amount",
                "currency",
                "status",
                "provider_raw_response",
                "updated_at",
            ]
        )


def _handle_checkout_session_event(session, payment_ok):
    metadata = session.get("metadata") or {}
    raw_order_id = metadata.get("order_id") or session.get("client_reference_id")
    if not raw_order_id:
        return

    try:
        order_id = int(raw_order_id)
    except (TypeError, ValueError):
        return

    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return

    if payment_ok:
        _sync_order_payment_state(order, "paid")
        _upsert_payment_transaction(order, session, PaymentTransaction.Status.CAPTURED)
    else:
        _sync_order_payment_state(order, "failed")
        _upsert_payment_transaction(order, session, PaymentTransaction.Status.FAILED)


@api_view(["GET"])
@permission_classes([AllowAny])
def stripe_checkout_status(request):
    publishable_key = getattr(settings, "STRIPE_PUBLISHABLE_KEY", "") or ""
    return JsonResponse(
        {
            "configured": bool(getattr(settings, "STRIPE_SECRET_KEY", "")),
            "publishable_key_configured": bool(publishable_key),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([UserRateThrottle])
def create_checkout_session(request):
    if not settings.STRIPE_SECRET_KEY:
        return JsonResponse({"detail": "Stripe is not configured."}, status=503)

    stripe.api_key = settings.STRIPE_SECRET_KEY

    order_id = request.data.get("order_id")
    metadata = {}
    client_reference_id = None

    if order_id is not None:
        try:
            order_id = int(order_id)
        except (TypeError, ValueError):
            return JsonResponse({"detail": "Invalid order_id."}, status=400)

        order, error_response = _resolve_order_for_checkout(request, order_id)
        if error_response is not None:
            return error_response

        try:
            line_items = _resolve_order_line_items(order)
        except ValueError as exc:
            return JsonResponse({"detail": str(exc)}, status=400)

        metadata = {
            "order_id": str(order.id),
            "user_id": str(request.user.id),
        }
        client_reference_id = str(order.id)

        if order.payment_method != "online":
            order.payment_method = "online"
            order.save(update_fields=["payment_method"])
    else:
        items = request.data.get("items", [])
        if not isinstance(items, list):
            return JsonResponse({"detail": "Invalid items payload."}, status=400)
        try:
            line_items = _resolve_line_items(items)
        except Product.DoesNotExist:
            return JsonResponse({"detail": "Product not found."}, status=400)
        except ValueError as exc:
            return JsonResponse({"detail": str(exc)}, status=400)

    success_url = _sanitize_redirect_url(
        request.data.get("success_url"), "/checkout/success"
    )
    success_url = _append_session_id_placeholder(success_url)
    cancel_url = _sanitize_redirect_url(
        request.data.get("cancel_url"), "/checkout/cancel"
    )

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=line_items,
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        client_reference_id=client_reference_id,
    )
    return JsonResponse(
        {
            "id": session.id,
            "url": session.url,
            "order_id": metadata.get("order_id"),
        }
    )


@csrf_exempt
def stripe_webhook(request):
    if request.method != "POST":
        return HttpResponse(status=405)
    if not settings.STRIPE_SECRET_KEY:
        return HttpResponse(status=503)

    stripe.api_key = settings.STRIPE_SECRET_KEY

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            event = stripe.Event.construct_from(json.loads(payload.decode("utf-8")), stripe.api_key)
    except Exception:
        return HttpResponse(status=400)

    event_type = event.get("type")
    data_object = (event.get("data") or {}).get("object") or {}

    if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        payment_status = data_object.get("payment_status")
        payment_ok = payment_status in ("paid", "no_payment_required")
        _handle_checkout_session_event(data_object, payment_ok=payment_ok)
    elif event_type in (
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
    ):
        _handle_checkout_session_event(data_object, payment_ok=False)

    return HttpResponse(status=200)
