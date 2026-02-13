from datetime import datetime, timedelta
from apps.accounts.permissions import (
    CanViewDashboard,
    CanViewActivityLog,
    CanManageOrders,
    CanAccessCashier,
    CanManageTables,
    CanManageInventory,
)
from django.conf import settings
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils.timezone import now, localdate
from rest_framework import viewsets, permissions, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .signals import log_order_activity
from apps.store.email_utils import send_store_email
from apps.store.utils import get_store_name
from .models import Order, OrderActivityLog, Table, InventoryAdjustment
from .serializers import (
    OrderSerializer,
    PublicOrderTrackingSerializer,
    OrderActivityLogSerializer,
    TableSerializer,
)
from apps.accounts.push import notify_roles, notify_user
from django.http import HttpRequest
from apps.products.models import Product
try:
    from apps.loyalty.services import award_points_for_order
except Exception:
    award_points_for_order = None


def log_user_order_activity(request, user, action, order):
    """
    يسجل إدخالاً في UserActivity مع تفاصيل الطلب والطاولة.
    """
    if not user:
        return
    try:
        from apps.accounts.models import UserActivity

        ip = get_client_ip(request)
        ua = request.META.get("HTTP_USER_AGENT", "")
        ua_info = parse_user_agent(ua)

        UserActivity.objects.create(
            user=user,
            path=request.path,
            method=request.method,
            status_code=200,
            ip_address=ip,
            user_agent=ua or None,
            device_type=ua_info["device_type"],
            browser=ua_info["browser"],
            os=ua_info["os"],
            action=action,
            order=order,
            table_label=order.table.label if order and order.table else "",
            order_status=order.status,
        )
    except Exception as exc:
        print("log_user_order_activity error:", exc)


def get_client_ip(request: HttpRequest) -> str | None:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # ممكن يرجع أكثر من IP
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip or None


def parse_user_agent(ua: str | None) -> dict:
    """
    تحليل بسيط بدون مكتبات خارجية.
    يعطي تقريب لنوع المتصفح والجهاز ونظام التشغيل.
    """
    ua = ua or ""
    ua_lower = ua.lower()

    # Browser
    if "chrome" in ua_lower and "edg" not in ua_lower:
        browser = "Chrome"
    elif "edg" in ua_lower:
        browser = "Edge"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "msie" in ua_lower or "trident" in ua_lower:
        browser = "Internet Explorer"
    else:
        browser = "Other"

    # OS
    if "windows" in ua_lower:
        os = "Windows"
    elif "mac os" in ua_lower or "macintosh" in ua_lower:
        os = "macOS"
    elif "android" in ua_lower:
        os = "Android"
    elif "iphone" in ua_lower or "ios" in ua_lower:
        os = "iOS"
    elif "linux" in ua_lower:
        os = "Linux"
    else:
        os = "Other"

    # Device
    if "mobile" in ua_lower or "iphone" in ua_lower or "android" in ua_lower:
        device_type = "Mobile"
    elif "ipad" in ua_lower or "tablet" in ua_lower:
        device_type = "Tablet"
    else:
        device_type = "Desktop"

    return {
        "browser": browser,
        "os": os,
        "device_type": device_type,
    }

# 👇 استيراد نظام الصلاحيات الديناميكي


# ================== إيميلات الطلب ==================


def send_order_created_email(order: Order):
    """
    إرسال إيميل عند إنشاء طلب جديد.
    """
    if not order.user or not order.user.email:
        return

    store_name = get_store_name()
    subject = f"تم استلام طلبك رقم #{order.id} - {store_name}"
    message = (
        f"مرحباً {order.user.username},\n\n"
        f"شكراً لطلبك من {store_name}. رقم طلبك هو #{order.id}.\n"
        f"إجمالي الطلب: {order.total} ريال.\n\n"
        "سنقوم بإشعارك عند تحديث حالة الطلب.\n\n"
        "تحياتنا،\n"
        f"فريق {store_name}"
    )
    if not send_store_email(subject, message, [order.user.email], kind="default"):
        print("Email error (order created)")


def send_order_status_changed_email(order: Order, old_status: str, new_status: str):
    """
    إرسال إيميل عند تغيير حالة الطلب.
    """
    if not order.user or not order.user.email:
        return

    status_map = {
        "pending": "قيد المراجعة",
        "confirmed": "تم تأكيد الطلب",
        "preparing": "طلبك قيد التحضير",
        "ready": "طلبك جاهز للاستلام",
        "completed": "اكتمل الطلب",
        "paid": "تم الدفع",
        "failed": "فشلت عملية الدفع",
        "refunded": "تم استرجاع المبلغ",
        "cancelled": "تم إلغاء الطلب",
        "complated": "اكتمل الطلب",
    }
    old_status_text = status_map.get((old_status or "").lower(), old_status)
    new_status_text = status_map.get((new_status or "").lower(), new_status)

    store_name = get_store_name()
    subject = f"تحديث حالة طلبك رقم #{order.id}"
    message = (
        f"مرحباً {order.user.username},\n\n"
        f"تم تحديث حالة طلبك رقم #{order.id} من '{old_status_text}' إلى '{new_status_text}'.\n"
        f"إجمالي الطلب: {order.total} ريال.\n\n"
        "يمكنك تتبع الطلب عبر صفحة تتبع الطلب في الموقع.\n\n"
        "تحياتنا،\n"
        f"فريق {store_name}"
    )
    if not send_store_email(subject, message, [order.user.email], kind="default"):
        print("Email error (status change)")


def notify_order_created(order: Order):
    try:
        title = f"طلب جديد #{order.id}"
        body = f"تم إنشاء طلب جديد بقيمة {order.total}."
        notify_roles(
            ["manager", "supervisor", "staff"],
            title=title,
            body=body,
            data={"type": "order_created", "order_id": order.id},
        )
    except Exception as exc:
        print("push notify order created error:", exc)


def notify_order_status_changed(order: Order, old_status: str, new_status: str):
    if not order.user:
        return
    try:
        status_phrases = {
            "pending": "أخذنا طلبك وبدأنا مراجعته. انتظرنا دقائق ونرجع لك بتحديث جديد.",
            "confirmed": "تم تأكيد طلبك رسميا، وبدأنا الخطوات التالية للتجهيز.",
            "preparing": "طلبك الآن تحت التحضير بكل حب، قريباً يكون جاهز.",
            "ready": "طلبك أصبح جاهز! تفضل للاستلام الآن.",
            "completed": "تم تسليم طلبك بنجاح، بالعافية عليك.",
            "paid": "تم تسجيل الدفع بنجاح، شكراً لك.",
            "failed": "للأسف عملية الدفع لم تكتمل. تقدر تعيد المحاولة في أي وقت.",
            "refunded": "تم استرجاع مبلغ طلبك بنجاح.",
            "cancelled": "تم إلغاء طلبك. إذا تحتاج مساعدة تواصل معنا.",
            "complated": "تم تسليم طلبك بنجاح، بالعافية عليك.",
        }
        status_label_map = {
            "pending": "قيد المراجعة",
            "confirmed": "مؤكد",
            "preparing": "قيد التحضير",
            "ready": "جاهز",
            "completed": "مكتمل",
            "paid": "مدفوع",
            "failed": "فشل الدفع",
            "refunded": "مسترجع",
            "cancelled": "ملغي",
            "complated": "مكتمل",
        }
        normalized_status = (new_status or "").strip().lower()
        title = f"تحديث حالة الطلب #{order.id}"
        status_text = status_label_map.get(normalized_status) or (
            order.get_status_display() if hasattr(order, "get_status_display") else new_status
        )
        body = status_phrases.get(normalized_status) or f"تم تحديث حالة طلبك إلى {status_text}."
        notify_user(
            order.user,
            title=title,
            body=body,
            data={
                "type": "order_status",
                "order_id": order.id,
                "status": normalized_status,
                "status_label_ar": status_text,
                "old_status": old_status,
            },
        )
    except Exception as exc:
        print("push notify order status error:", exc)


# ================== طلبات المستخدم الحالي ==================


class MyOrdersView(generics.ListAPIView):
    """
    طلبات المستخدم الحالي
    GET /api/orders/my-orders/
    """
    serializer_class = PublicOrderTrackingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .order_by("-created_at")
        )


# ================== صلاحيات خاصة بالطلبات ==================


class IsOwnerStaffOrManager(permissions.BasePermission):
    """
    - المدير (manager) والموظف (staff) والمشرف (supervisor) عندهم صلاحية عامة على الطلبات
    - العميل (customer) لا يرى إلا طلباته
    - يسمح لأي شخص بإنشاء طلب جديد (create) ليعمل الضيوف أيضاً.
    """

    def has_permission(self, request, view):
        # السماح بإنشاء الطلب للجميع (حتى غير المسجلين)
        user = request.user
        if getattr(view, "action", None) == "create":
            return bool(user and user.is_authenticated)
        return bool(user and user.is_authenticated)

    def has_object_permission(self, request, view, obj: Order):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        role = getattr(user, "role", "")
        # الموظف / المشرف / المدير: صلاحية كاملة على الطلبات
        if role in ("manager", "supervisor", "staff"):
            return True

        # العميل: يرى فقط طلباته
        if role == "customer" and obj.user_id == user.id:
            return True

        return False


# ================== إحصائيات لوحة التحكم ==================


class DashboardStatsView(APIView):
    """
    إحصائيات لوحة المدير/المشرف (GET /api/orders/dashboard-stats/)
    تدعم فلاتر:
      - start_date, end_date (yyyy-mm-dd)
      - group_by: day | week | month
    وترجع series لمخططات (recharts) في الفرونت.
    """

    # 👈 الآن تعتمد على RolePermission.can_manage_orders
    permission_classes = [CanViewDashboard]

    def get(self, request):
        today = now().date()
        qs = Order.objects.all()

        # ========= إجماليات عامة =========
        total_orders = qs.count()
        pending_orders = qs.filter(status="pending").count()
        preparing_orders = qs.filter(status="preparing").count()
        ready_orders = qs.filter(status="ready").count()
        completed_orders = qs.filter(status="completed").count()
        cancelled_orders = qs.filter(status="cancelled").count()

        revenue_today = (
            qs.filter(created_at__date=today, status="completed")
            .aggregate(total=Sum("total"))
            .get("total")
            or 0
        )

        revenue_all = (
            qs.filter(status="completed")
            .aggregate(total=Sum("total"))
            .get("total")
            or 0
        )

        # ========= فلاتر التاريخ و group_by =========
        group_by = request.query_params.get("group_by", "day")
        start_str = request.query_params.get("start_date")
        end_str = request.query_params.get("end_date")

        # افتراضياً: آخر 30 يوم
        default_start = today - timedelta(days=29)
        default_end = today

        try:
            start_date = (
                datetime.fromisoformat(start_str).date()
                if start_str
                else default_start
            )
        except ValueError:
            start_date = default_start

        try:
            end_date = (
                datetime.fromisoformat(end_str).date()
                if end_str
                else default_end
            )
        except ValueError:
            end_date = default_end

        if group_by == "week":
            trunc = TruncWeek("created_at")
        elif group_by == "month":
            trunc = TruncMonth("created_at")
        else:
            trunc = TruncDate("created_at")

        series_qs = (
            qs.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
                status="completed",
            )
            .annotate(period=trunc)
            .values("period")
            .annotate(
                revenue=Sum("total"),
                orders=Count("id"),
            )
            .order_by("period")
        )

        series = []
        for item in series_qs:
            period = item["period"]
            if hasattr(period, "date"):
                period_str = period.date().isoformat()
            else:
                period_str = str(period)
            series.append(
                {
                    "period": period_str,
                    "revenue": float(item["revenue"] or 0),
                    "orders": item["orders"],
                }
            )

        data = {
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "preparing_orders": preparing_orders,
            "ready_orders": ready_orders,
            "completed_orders": completed_orders,
            "cancelled_orders": cancelled_orders,
            "revenue_today": float(revenue_today),
            "revenue_all": float(revenue_all),
            "series": series,
        }
        return Response(data, status=status.HTTP_200_OK)


# ================== CRUD الطلبات ==================


class OrderViewSet(viewsets.ModelViewSet):
    """
    CRUD للطلبات + صلاحيات حسب الدور:
    - manager / supervisor: يشوفون كل الطلبات
    - staff : يشوف طلبات اليوم فقط
    - customer: يشوف طلباته فقط
    """

    serializer_class = OrderSerializer
    permission_classes = [IsOwnerStaffOrManager]

    def get_queryset(self):
        qs = Order.objects.all().order_by("-created_at")
        user = self.request.user

        if not user.is_authenticated:
            # غير مسجل لا يمكنه رؤية أي طلبات
            return Order.objects.none()

        role = getattr(user, "role", "")
        today = localdate()

        if role in ("manager", "supervisor"):
            # المدير والمشرف يشوفون كل شيء
            return qs

        if role == "staff":
            # الموظف يشوف فقط طلبات اليوم
            return qs.filter(created_at__date=today)

        # العميل (customer) يشوف طلباته فقط
        if role == "customer":
            return qs.filter(user=user)

        # أي دور آخر (لو حصل) لا يرى شيء
        return Order.objects.none()

    def perform_create(self, serializer):
        """
        إنشاء الطلب وإرسال إيميل تأكيد + تسجيل نشاط إنشاء الطلب.
        """
        user = self.request.user if self.request.user.is_authenticated else None
        order = serializer.save(user=user)

        # تسجيل نشاط "إنشاء طلب"
        try:
            log_order_activity(
                order=order,
                user=user,
                action="إنشاء طلب جديد",
                event_type="order_created",
                request=self.request,
            )
        except Exception as e:
            print("log_order_activity (order_created) error:", e)

        # إرسال الإيميل (لو فيه إيميل للمستخدم)
        try:
            send_order_created_email(order)
        except Exception as e:
            print("Email error (order created):", e)

        notify_order_created(order)

        return order


    def partial_update(self, request, *args, **kwargs):
        """
        نسمح فقط للمدير والمشرف والموظف بتعديل حالة الطلب (status).
        العميل لا يستطيع تعديل حالة الطلب.
        """
        user = request.user
        role = getattr(user, "role", "")

        if role not in ("manager", "supervisor", "staff"):
            return Response(
                {"detail": "غير مسموح لك بتعديل حالة الطلب."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get("status")
        valid_statuses = [
            "pending",
            "confirmed",
            "preparing",
            "ready",
            "completed",
            "cancelled",
        ]
        if new_status not in valid_statuses:
            return Response(
                {"detail": "حالة غير صحيحة."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance = self.get_object()
        old_status = instance.status

        instance.status = new_status
        instance.save()
        if instance.table:
            if new_status in ("completed", "cancelled"):
                instance.table.status = "available"
                instance.table.save(update_fields=["status"])
            elif instance.order_type == "dine_in" and new_status in (
                "confirmed",
                "preparing",
                "ready",
            ):
                if instance.table.status != "occupied":
                    instance.table.status = "occupied"
                    instance.table.save(update_fields=["status"])
        # معلومات الطلب من الـ request
        ip = get_client_ip(request)
        ua = request.META.get("HTTP_USER_AGENT", "")
        ua_info = parse_user_agent(ua)

        # تسجيل النشاط (مع IP و User-Agent)
        try:
            OrderActivityLog.objects.create(
                user=user,
                order=instance,
                action="تحديث حالة الطلب",
                old_status=old_status,
                new_status=new_status,
                ip_address=ip,
                user_agent=ua or None,
                device_type=ua_info["device_type"],
                browser=ua_info["browser"],
                os=ua_info["os"],
                # country/city تترك فارغة حالياً، يمكن ربط GeoIP لاحقاً
            )
        except Exception as e:
            print("log_order_activity (status_change) error:", e)

        log_user_order_activity(
            request,
            user,
            f"تغيير حالة الطلب #{instance.id} إلى {new_status}",
            instance,
        )

        # إرسال إيميل بتغيير الحالة
        try:
            send_order_status_changed_email(instance, old_status, new_status)
        except Exception as e:
            print("Email error (status change):", e)

        notify_order_status_changed(instance, old_status, new_status)

        if new_status == "completed" and award_points_for_order:
            try:
                award_points_for_order(instance)
            except Exception as exc:
                print("loyalty award error:", exc)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


# ================== تتبع الطلب (بدون تسجيل) ==================


class PublicOrderTrackingView(APIView):
    """
    تتبع حالة الطلب برقم الطلب فقط (بدون تسجيل دخول)
    يرجّع: id, status, status_display, total, created_at
    GET /api/orders/public/<pk>/
    """

    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PublicOrderTrackingSerializer(order)
        return Response(serializer.data)


# ================== سجل نشاط تعديل الطلبات ==================


class OrderActivityLogView(APIView):
    """
    قائمة بسجل نشاط تعديل الطلبات (للأدوار المسموح لها)
    GET /api/orders/activity-log/?limit=100
    """

    permission_classes = [CanViewActivityLog]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 100))
        except ValueError:
            limit = 100

        qs = OrderActivityLog.objects.select_related("user", "order").all()

        # 🔒 إخفاء نشاط المدير عن غير المدير
        user = request.user
        role = getattr(user, "role", "")
        if role != "manager":
            qs = qs.exclude(user__role="manager")

        qs = qs[:limit]

        serializer = OrderActivityLogSerializer(qs, many=True)
        return Response(serializer.data)


class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.all().order_by("number", "label")
    serializer_class = TableSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), CanAccessCashier()]
        return [permissions.IsAuthenticated(), CanManageTables()]


class InventorySummaryView(APIView):
    permission_classes = [IsAuthenticated, CanAccessCashier]

    def get(self, request):
        qs = (
            Product.objects.filter(track_inventory=True)
            .order_by("stock", "name")
        )
        summary = []
        for product in qs:
            low_stock = product.stock <= product.minimum_stock
            summary.append(
                {
                    "id": product.id,
                    "name": product.name,
                    "stock": product.stock,
                    "minimum_stock": product.minimum_stock,
                    "low_stock": low_stock,
                }
            )
        low_stock_items = [item for item in summary if item["low_stock"]]
        return Response(
            {
                "items": summary[:100],
                "low_stock": low_stock_items[:25],
                "total_low_stock": len(low_stock_items),
            }
        )


class InventoryAdjustView(APIView):
    permission_classes = [IsAuthenticated, CanManageInventory]

    def post(self, request):
        product_id = request.data.get("product_id")
        delta = request.data.get("delta")
        reason = request.data.get("reason", "manual")
        note = request.data.get("note", "")

        if product_id is None or delta is None:
            return Response(
                {"detail": "product_id و delta مطلوبة."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            delta_value = int(delta)
        except (TypeError, ValueError):
            return Response(
                {"detail": "قيمة delta يجب أن تكون رقماً صحيحاً."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response(
                {"detail": "المنتج غير موجود."},
                status=status.HTTP_404_NOT_FOUND,
            )

        product.stock = max(0, product.stock + delta_value)
        product.save(update_fields=["stock"])

        InventoryAdjustment.objects.create(
            product=product,
            delta=delta_value,
            reason=reason if reason in dict(InventoryAdjustment.REASON_CHOICES) else "manual",
            note=note,
            created_by=request.user if request.user.is_authenticated else None,
        )

        return Response(
            {
                "id": product.id,
                "name": product.name,
                "stock": product.stock,
                "minimum_stock": product.minimum_stock,
            }
        )


class POSCashierOrderView(APIView):
    permission_classes = [IsAuthenticated, CanAccessCashier]

    def post(self, request):
        serializer = OrderSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        log_user_order_activity(
            request,
            request.user,
            f"تسجيل طلب كاشير #{order.id} ({order.order_type})",
            order,
        )
        notify_order_created(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

