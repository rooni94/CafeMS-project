from django.utils.deprecation import MiddlewareMixin
from django.http import HttpRequest, HttpResponse
from .models import UserActivity
from .permissions import get_role_permission  # ممكن نستخدمه لاحقاً
from apps.orders.views import get_client_ip, parse_user_agent  # أعد استخدامها لو تحب، أو انسخها هنا


EXCLUDED_PATH_PREFIXES = (
    "/admin",
    "/static",
    "/media",
    "/api/auth/token",
    "/api/auth/password-reset",
)


class UserActivityMiddleware(MiddlewareMixin):
    def process_response(self, request: HttpRequest, response: HttpResponse):
        user = getattr(request, "user", None)

        # نسجل فقط للمستخدم المسجل دخول
        if not user or not user.is_authenticated:
            return response

        path = request.path

        # تجاهل بعض المسارات
        if any(path.startswith(p) for p in EXCLUDED_PATH_PREFIXES):
            return response

        try:
            ip = get_client_ip(request)
        except Exception:
            ip = None

        ua = request.META.get("HTTP_USER_AGENT", "")
        ua_info = parse_user_agent(ua)

        try:
            UserActivity.objects.create(
                user=user,
                path=path,
                method=request.method,
                status_code=response.status_code,
                ip_address=ip,
                user_agent=ua or None,
                device_type=ua_info["device_type"],
                browser=ua_info["browser"],
                os=ua_info["os"],
            )
        except Exception as e:
            # ما نخلي أي خطأ هنا يطيح السيرفر
            print("UserActivityMiddleware error:", e)

        return response
