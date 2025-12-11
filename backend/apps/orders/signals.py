# backend/apps/orders/signals.py
from __future__ import annotations

from typing import Optional

from django.http import HttpRequest

from .models import Order, OrderActivityLog


def _get_client_ip(request: HttpRequest) -> Optional[str]:
    """
    استخراج IP من الهيدر (يدعم البروكسي X-Forwarded-For).
    """
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        # لو أكثر من IP ناخذ الأول
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_order_activity(
    *,
    order: Order,
    user=None,
    action: str,
    old_status: Optional[str] = None,
    new_status: Optional[str] = None,
    request: Optional[HttpRequest] = None,
    event_type: str = "order_status_change",
) -> OrderActivityLog:
    """
    دالة موحدة لتسجيل نشاط الطلبات مع IP و User-Agent إن توفر request.
    تُستخدم من الـ views عشان ما نكرر الكود.
    """
    ip = None
    ua = ""

    if request is not None:
        ip = _get_client_ip(request)
        ua = (request.META.get("HTTP_USER_AGENT") or "")[:500]

    return OrderActivityLog.objects.create(
        user=user,
        order=order,
        action=action,
        old_status=old_status,
        new_status=new_status,
        event_type=event_type,
        ip_address=ip,
        user_agent=ua,
    )
