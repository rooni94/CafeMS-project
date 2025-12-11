# backend/apps/accounts/emails.py
from django.conf import settings

from apps.store.email_utils import send_store_email


def safe_send_mail(subject: str, message: str, recipient_list: list[str]) -> bool:
    """
    دالة موحدة لإرسال الإيميل داخل try/except حتى لا يطيح النظام لو فشل الإرسال.
    ترجع True لو تم الإرسال (على الأغلب)، و False لو حصل استثناء.
    """
    if not recipient_list:
        return False

    return send_store_email(
        subject=subject,
        message=message,
        recipient_list=recipient_list,
        kind="verification",
        fail_silently=True,
    )


def build_frontend_url(path: str) -> str:
    """
    يبني رابط كامل للفرونت من الإعداد FRONTEND_URL.
    مثال:
      FRONTEND_URL = "http://localhost:5173"
      path = "/verify-email?uid=..&token=.."
    النتيجة: "http://localhost:5173/verify-email?uid=..&token=.."
    """
    base = getattr(settings, "FRONTEND_URL", "").rstrip("/")
    if not base:
        # fallback آخر عشان ما يكون فاضي
        base = "http://localhost:5173"
    if not path.startswith("/"):
        path = "/" + path
    return base + path
