# backend/apps/accounts/signals.py

from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver

from apps.orders.models import OrderActivityLog


def get_client_ip(request):
    """
    إرجاع IP من الهيدر أو من REMOTE_ADDR
    """
    if not request:
        return None
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """
    تسجيل حدث تسجيل الدخول في OrderActivityLog
    """
    if not request or not user:
        return

    ua_string = request.META.get("HTTP_USER_AGENT", "")[:1000]

    OrderActivityLog.objects.create(
        user=user,
        order=None,              # لا يوجد طلب معيّن
        action="تسجيل دخول",
        event_type="login",
        ip_address=get_client_ip(request),
        user_agent=ua_string,
        # لو تريد تركها فارغة، الباكند/الفرونت سيعرض "-"
        browser=None,
        os=None,
        device_type=None,
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """
    تسجيل حدث تسجيل الخروج في OrderActivityLog
    """
    if not request or not user:
        return

    ua_string = request.META.get("HTTP_USER_AGENT", "")[:1000]

    OrderActivityLog.objects.create(
        user=user,
        order=None,
        action="تسجيل خروج",
        event_type="logout",
        ip_address=get_client_ip(request),
        user_agent=ua_string,
        browser=None,
        os=None,
        device_type=None,
    )
