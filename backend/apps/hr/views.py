# backend/apps/hr/views.py
from datetime import date, timedelta, datetime

from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q, Avg
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import (
    viewsets,
    filters as drf_filters,
    permissions,
    filters,
    generics,
    status as drf_status,
)
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.store.email_utils import send_store_email
from rest_framework.exceptions import PermissionDenied

from .models import (
    Employee,
    Attendance,
    Absence,
    LeaveBalance,
    LeaveRequest,
    Contract,
    Payroll,
    VisaResidence,
    Document,
    HRReport,
    SalaryRaiseRequest,
    WorkReport,
    EmployeeContract,
    HRSettings,
    LeaveType,
    Notification,
    create_notification_for_employee,
)
from .serializers import (
    EmployeeSerializer,
    AttendanceSerializer,
    AbsenceSerializer,
    LeaveBalanceSerializer,
    LeaveRequestSerializer,
    ContractSerializer,
    PayrollSerializer,
    PayrollSummarySerializer,
    VisaResidenceSerializer,
    DocumentSerializer,
    HRReportSerializer,
    SalaryRaiseRequestSerializer,
    WorkReportSerializer,
    HRWorkReportSerializer,
    HRSettingsSerializer,
    LeaveTypeSerializer,
    MyLeaveRequestSerializer,
    NotificationSerializer,
)

from apps.accounts.permissions import (
    IsHRManager,
    IsHRSupervisorOrManager,
    IsHRStaffOrAbove,
    IsOwnerOrHR,
    CanViewHRDashboard,
    CanManageEmployees,
    CanManageAttendance,
    CanManageHRLeaves,
    CanManageHRPayroll,
    CanManageHRDocuments,
    CanManageHRWorkReports,
    CanManageHRReports,
    CanViewHRPerformance,
)
from apps.orders.models import Order

User = get_user_model()


def get_employee_for_user(user):
    # تربط User بـ Employee
    try:
        return Employee.objects.get(user=user)
    except Employee.DoesNotExist:
        return None


# ========= ViewSets إدارية للـ HR =========

class IsHRManagerLocal(permissions.BasePermission):
    """
    نسمح فقط للمستخدمين role='manager' أو is_staff أو is_superuser
    (نستخدمها داخلياً لو احتجنا، وإلا نستعمل IsHRManager من accounts.permissions)
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = getattr(user, "role", None)
        return bool(
            role == "manager"
            or getattr(user, "is_staff", False)
            or getattr(user, "is_superuser", False)
        )


# ========= ViewSets =========

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("user").all()
    serializer_class = EmployeeSerializer
    permission_classes = [CanManageEmployees]


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("employee", "employee__user").all()
    serializer_class = AttendanceSerializer
    permission_classes = [CanManageAttendance]

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get("employee")
        status_param = self.request.query_params.get("status")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if status_param:
            qs = qs.filter(status=status_param)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs


class AbsenceViewSet(viewsets.ModelViewSet):
    queryset = Absence.objects.select_related("employee", "employee__user").all()
    serializer_class = AbsenceSerializer
    permission_classes = [CanManageAttendance]


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    queryset = LeaveBalance.objects.select_related("employee", "employee__user").all()
    serializer_class = LeaveBalanceSerializer
    permission_classes = [CanManageHRLeaves]


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related("employee", "employee__user")
    serializer_class = LeaveRequestSerializer
    permission_classes = [CanManageHRLeaves]

    def perform_update(self, serializer):
        old = self.get_object()
        prev_status = old.status

        instance = serializer.save(
            decided_by=self.request.user
            if "status" in serializer.validated_data
            else old.decided_by,
            decided_at=timezone.now()
            if "status" in serializer.validated_data
            else old.decided_at,
        )

        new_status = instance.status

        if prev_status != "approved" and new_status == "approved":
            self._apply_leave_balance(instance)
            self._notify_leave_status(instance, approved=True)
            self._notify_leave_status_noti(instance, approved=True)
        elif prev_status != "rejected" and new_status == "rejected":
            self._notify_leave_status(instance, approved=False)
            self._notify_leave_status_noti(instance, approved=False)

    def _apply_leave_balance(self, leave: LeaveRequest):
        days = (leave.end_date - leave.start_date).days + 1
        if days < 0:
            days = 0

        lb, _ = LeaveBalance.objects.get_or_create(employee=leave.employee)

        if lb.remaining_days < days:
            # تقدر تمنع هنا لاحقاً لو حبيت
            pass

        lb.used_days += days
        lb.save()

    def _notify_leave_status(self, leave: LeaveRequest, approved: bool):
        user = leave.employee.user
        subject = "حالة طلب الإجازة"
        if approved:
            msg = (
                f"تمت الموافقة على طلب إجازتك من {leave.start_date} إلى {leave.end_date}."
            )
        else:
            msg = (
                f"تم رفض طلب إجازتك من {leave.start_date} إلى {leave.end_date}."
            )
        if user.email:
            send_store_email(
                subject,
                msg,
                [user.email],
                kind="default",
            )
        create_notification_for_employee(
            leave.employee,
            title="تحديث على طلب الإجازة",
            message=msg,
            category="leave",
            related_object="LeaveRequest",
            related_id=leave.id,
        )

    def _notify_leave_status_noti(self, leave: LeaveRequest, approved: bool):
        user = leave.employee.user
        if not user:
            return

        if approved:
            msg = f"تمت الموافقة على طلب إجازتك من {leave.start_date} إلى {leave.end_date}."
            status_value = "approved"
        else:
            msg = f"تم رفض طلب إجازتك من {leave.start_date} إلى {leave.end_date}."
            status_value = "rejected"

        Notification.objects.create(
            user=user,
            type="leave_status",
            title="حالة طلب الإجازة",
            message=msg,
            data={
                "leave_id": leave.id,
                "status": status_value,
                "start_date": str(leave.start_date),
                "end_date": str(leave.end_date),
            },
        )

class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.select_related("employee", "employee__user").all()
    serializer_class = ContractSerializer
    permission_classes = [CanManageHRDocuments]
    


class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.all()
    serializer_class = PayrollSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["month"]
    ordering = ["-month"]
    permission_classes = [CanManageHRPayroll]

    def get_queryset(self):
        qs = super().get_queryset()

        month_param = self.request.query_params.get("month")
        employee = self.request.query_params.get("employee")

        # فلترة الشهر بالشكل YYYY-MM
        if month_param:
            try:
                # "2025-11"
                if len(month_param) == 7:
                    year, month = map(int, month_param.split("-"))
                    qs = qs.filter(month__year=year, month__month=month)
                else:
                    # لو "YYYY-MM-DD"
                    qs = qs.filter(month=month_param)
            except ValueError:
                pass

        if employee:
            qs = qs.filter(employee_id=employee)

        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.employee and instance.employee.user:
            month_str = instance.month.strftime("%Y-%m")
            create_notification_for_employee(
                instance.employee,
                title="إضافة مسير راتب جديد",
                message=f"تمت إضافة مسير راتب للشهر {month_str} براتب صافي {instance.net_salary}.",
                category="payroll",
                related_object="Payroll",
                related_id=instance.id,
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.employee and instance.employee.user:
            month_str = instance.month.strftime("%Y-%m")
            create_notification_for_employee(
                instance.employee,
                title="تحديث على مسير الراتب",
                message=f"تم تحديث مسير راتب الشهر {month_str}. الرجاء المراجعة.",
                category="payroll",
                related_object="Payroll",
                related_id=instance.id,
            )


class VisaResidenceViewSet(viewsets.ModelViewSet):
    queryset = VisaResidence.objects.select_related("employee", "employee__user").all()
    serializer_class = VisaResidenceSerializer
    permission_classes = [CanManageHRDocuments]


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageHRDocuments]
    queryset = Document.objects.select_related("employee", "employee__user")
    serializer_class = DocumentSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_fields = ["employee", "document_type", "is_expired"]
    search_fields = ["document_name", "employee__user__full_name", "employee__employee_id"]
    ordering_fields = ["expiry_date", "issue_date"]

    def get_queryset(self):
        qs = super().get_queryset()
        expiry = self.request.query_params.get("expiry")
        if expiry == "active":
            qs = qs.filter(is_expired=False)
        elif expiry == "expired":
            qs = qs.filter(is_expired=True)
        elif expiry == "soon":
            today = date.today()
            qs = qs.filter(
                expiry_date__isnull=False,
                expiry_date__gte=today,
                expiry_date__lte=today + timedelta(days=30),
            )
        return qs

class MyDocumentsView(generics.ListCreateAPIView):
    """
    GET /api/hr/my/documents/
    POST /api/hr/my/documents/
    """
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        emp = get_employee_for_user(self.request.user)
        if not emp:
            return Document.objects.none()
        return Document.objects.filter(employee=emp).order_by("-expiry_date", "-id")

    def perform_create(self, serializer):
        emp = get_employee_for_user(self.request.user)
        if not emp:
            raise PermissionDenied("لا تملك حساب موظف في نظام الموارد البشرية.")
        serializer.save(employee=emp)

class HRReportViewSet(viewsets.ModelViewSet):
    queryset = HRReport.objects.select_related("generated_by").all()
    serializer_class = HRReportSerializer
    permission_classes = [CanManageHRReports]

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)


# ========= Endpoints إحصائيات / داشبورد =========


@api_view(["GET"])
@permission_classes([CanViewHRDashboard])
def hr_dashboard_stats(request):
    today = timezone.localdate()

    # فلتر شهر للرواتب والإحصائيات الشهرية
    month_param = request.query_params.get("month")
    if month_param:
        try:
            year_str, month_str = month_param.split("-")
            year = int(year_str)
            month = int(month_str)
        except ValueError:
            year = today.year
            month = today.month
    else:
        year = today.year
        month = today.month

    total_employees = Employee.objects.count()

    attendance_today_present = Attendance.objects.filter(
        date=today, status="present"
    ).count()
    attendance_today_absent = Attendance.objects.filter(
        date=today, status="absent"
    ).count()
    attendance_today_on_leave = Attendance.objects.filter(
        date=today, status="on_leave"
    ).count()

    pending_leaves = LeaveRequest.objects.filter(status="pending").count()

    expired_documents = Document.objects.filter(is_expired=True).count()
    expiring_soon = Document.objects.filter(
        expiry_date__isnull=False,
        expiry_date__lte=today + timezone.timedelta(days=30),
        expiry_date__gte=today,
    ).count()

    # ملخص رواتب الشهر المحدد
    month_qs = Payroll.objects.filter(month__year=year, month__month=month)
    paid_qs = month_qs.filter(payment_status="paid")
    unpaid_qs = month_qs.exclude(payment_status="paid")

    paid_agg = paid_qs.aggregate(
        total_net=Sum("net_salary"),
        deductions=Sum("deductions"),
        absent_deductions=Sum("absent_deductions"),
    )
    unpaid_agg = unpaid_qs.aggregate(total_net=Sum("net_salary"))

    data = {
        "total_employees": total_employees,
        "today_present": attendance_today_present,
        "today_absent": attendance_today_absent,
        "today_on_leave": attendance_today_on_leave,
        "pending_leaves": pending_leaves,
        "expired_documents": expired_documents,
        "soon_expiring_documents": expiring_soon,
        "payroll_paid_count": paid_qs.count(),
        "payroll_unpaid_count": unpaid_qs.count(),
        "payroll_paid_total_net": paid_agg["total_net"] or 0,
        "payroll_paid_total_deductions": (
            (paid_agg["deductions"] or 0) + (paid_agg["absent_deductions"] or 0)
        ),
        "payroll_unpaid_total_net": unpaid_agg["total_net"] or 0,
    }
    return Response(data)


class EmployeePerformanceAPIView(APIView):
    """
    GET /api/hr/performance/?employee=<id>&date_from=2025-12-01&date_to=2025-12-31&group_by=day|month
    """

    permission_classes = [CanViewHRPerformance]

    def get(self, request, *args, **kwargs):
        qs = Order.objects.select_related("served_by").filter(served_by__isnull=False)

        employee_id = request.query_params.get("employee")
        if employee_id:
            qs = qs.filter(served_by_id=employee_id)

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        if date_from:
            try:
                parsed = datetime.fromisoformat(date_from).date()
                qs = qs.filter(created_at__date__gte=parsed)
            except ValueError:
                pass

        if date_to:
            try:
                parsed = datetime.fromisoformat(date_to).date()
                qs = qs.filter(created_at__date__lte=parsed)
            except ValueError:
                pass

        totals = qs.aggregate(
            total_orders=Count("id"),
            total_revenue=Sum("total"),
            completed_orders=Count("id", filter=Q(status="completed")),
        )

        summary_qs = (
            qs.values(
                "served_by_id",
                "served_by__username",
                "served_by__first_name",
                "served_by__last_name",
                "served_by__employee_profile__employee_id",
            )
            .annotate(
                total_orders=Count("id"),
                completed_orders=Count("id", filter=Q(status="completed")),
                total_revenue=Sum("total"),
                avg_order=Avg("total"),
            )
            .order_by("-total_revenue")
        )

        employees = []
        for row in summary_qs:
            full_name = (
                f"{row.get('served_by__first_name') or ''} {row.get('served_by__last_name') or ''}"
            ).strip()
            employees.append(
                {
                    "user_id": row["served_by_id"],
                    "employee_id": row.get("served_by__employee_profile__employee_id"),
                    "name": full_name or row.get("served_by__username"),
                    "total_orders": row["total_orders"],
                    "completed_orders": row["completed_orders"],
                    "total_revenue": float(row["total_revenue"] or 0),
                    "avg_order": float(row["avg_order"] or 0),
                }
            )

        group_by = request.query_params.get("group_by", "day")
        trunc = TruncDay("created_at") if group_by == "day" else TruncMonth("created_at")
        series_qs = (
            qs.annotate(period=trunc)
            .values("period")
            .annotate(
                orders=Count("id"),
                revenue=Sum("total"),
            )
            .order_by("period")
        )

        series = []
        for row in series_qs:
            period_value = row["period"]
            if hasattr(period_value, "date"):
                period_value = period_value.date().isoformat()
            elif hasattr(period_value, "isoformat"):
                period_value = period_value.isoformat()
            series.append(
                {
                    "period": period_value,
                    "orders": row["orders"],
                    "revenue": float(row["revenue"] or 0),
                }
            )

        return Response(
            {
                "filters": {
                    "employee": employee_id,
                    "date_from": date_from,
                    "date_to": date_to,
                    "group_by": group_by,
                },
                "totals": {
                    "total_orders": totals["total_orders"] or 0,
                    "completed_orders": totals["completed_orders"] or 0,
                    "total_revenue": float(totals["total_revenue"] or 0),
                },
                "employees": employees,
                "series": series,
            }
        )

@api_view(["GET"])
@permission_classes([CanViewHRDashboard])
def attendance_summary(request):
    """
    /api/hr/attendance-summary/?month=2025-11
    يرجّع تجميع للحضور حسب الحالة في شهر معيّن
    """
    month = request.query_params.get("month")
    qs = Attendance.objects.all()

    if month:
        try:
            year, m = month.split("-")
            qs = qs.filter(date__year=int(year), date__month=int(m))
        except ValueError:
            pass

    summary = (
        qs.values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )

    return Response(summary)


@api_view(["GET"])
@permission_classes([CanViewHRDashboard])
def payroll_summary(request):
    """
    /api/hr/payroll/summary/?month=2025-11
    """
    month_param = request.query_params.get("month")  # مثل "2025-11"
    qs = Payroll.objects.all()

    if month_param:
        try:
            year_str, month_str = month_param.split("-")
            year = int(year_str)
            month = int(month_str)
            qs = qs.filter(month__year=year, month__month=month)
        except ValueError:
            return Response(
                {"detail": "صيغة الشهر غير صحيحة. استخدم YYYY-MM مثل 2025-11"},
                status=400,
            )

    agg = qs.aggregate(
        total_net=Sum("net_salary"),
        overtime_pay=Sum("overtime_pay"),
        bonuses=Sum("bonuses"),
        deductions=Sum("deductions"),
        absent_deductions=Sum("absent_deductions"),
        total_employees=Count("id"),
    )

    total_overtime = (agg["overtime_pay"] or 0) + (agg["bonuses"] or 0)
    total_deductions = (agg["deductions"] or 0) + (agg["absent_deductions"] or 0)

    if qs.exists():
        month_value = qs.first().month.replace(day=1)
    else:
        today = date.today()
        month_value = today.replace(day=1)

    data = {
        "month": month_value,
        "total_net": agg["total_net"] or 0,
        "total_overtime": total_overtime,
        "total_deductions": total_deductions,
        "total_employees": agg["total_employees"] or 0,
    }
    return Response(data)


@api_view(["GET"])
@permission_classes([CanViewHRDashboard])
def hr_expiry_alerts(request):
    today = date.today()
    soon = today + timedelta(days=30)

    docs_expired = Document.objects.filter(is_expired=True)
    docs_soon = Document.objects.filter(
        expiry_date__isnull=False,
        expiry_date__gte=today,
        expiry_date__lte=soon,
    )

    visas_expired = VisaResidence.objects.filter(
        residence_expiry_date__lt=today
    )
    visas_soon = VisaResidence.objects.filter(
        residence_expiry_date__isnull=False,
        residence_expiry_date__gte=today,
        residence_expiry_date__lte=soon,
    )

    return Response(
        {
            "summary": {
                "documents_expired": docs_expired.count(),
                "documents_expiring_soon": docs_soon.count(),
                "visa_expired": visas_expired.count(),
                "visa_expiring_soon": visas_soon.count(),
            },
            "documents_expired": DocumentSerializer(docs_expired[:20], many=True).data,
            "documents_expiring_soon": DocumentSerializer(docs_soon[:20], many=True).data,
            "visa_expired": VisaResidenceSerializer(visas_expired[:20], many=True).data,
            "visa_expiring_soon": VisaResidenceSerializer(visas_soon[:20], many=True).data,
        }
    )


class AttendanceSummaryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        qs = Attendance.objects.all()

        present_count = qs.filter(status="present").count()
        absent_count = qs.filter(status="absent").count()
        late_count = qs.filter(status="late").count()

        return Response({
            "present": present_count,
            "absent": absent_count,
            "late": late_count,
        })


# ========= My HR (الموظف نفسه) =========


class MyLeaveRequestsViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LeaveRequest.objects.filter(employee__user=self.request.user).order_by("-start_date")

    def perform_create(self, serializer):
        employee = Employee.objects.get(user=self.request.user)
        serializer.save(employee=employee, status="pending")


class MyHRBaseView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_employee(self):
        user = self.request.user
        try:
            return Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            raise PermissionDenied("لا تملك حساب موظف في نظام الموارد البشرية.")


class MyNotificationsListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")


class MyNotificationsMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "تم تعليم جميع التنبيهات كمقروءة."})


class MyLeaveListCreateView(MyHRBaseView, generics.ListCreateAPIView):
    """
    GET /api/hr/my/leaves/
    POST /api/hr/my/leaves/
    """
    serializer_class = MyLeaveRequestSerializer

    def get_queryset(self):
        emp = self.get_employee()
        return LeaveRequest.objects.filter(employee=emp).order_by("-start_date")


class MyRaiseRequestListCreateView(MyHRBaseView, generics.ListCreateAPIView):
    """
    /api/hr/my/raises/
    """
    serializer_class = SalaryRaiseRequestSerializer

    def get_queryset(self):
        emp = self.get_employee()
        return SalaryRaiseRequest.objects.filter(employee=emp).order_by("-created_at")


class MyWorkReportListCreateView(MyHRBaseView, generics.ListCreateAPIView):
    """
    /api/hr/my/work-reports/
    """
    serializer_class = WorkReportSerializer

    def get_queryset(self):
        emp = self.get_employee()
        return WorkReport.objects.filter(employee=emp).order_by("-date")


class HRAlertsView(APIView):
    permission_classes = [CanViewHRDashboard]

    def get(self, request, *args, **kwargs):
        today = date.today()
        soon = today + timedelta(days=30)

        visa_soon = VisaResidence.objects.filter(
            residence_expiry_date__range=(today, soon)
        ).count()
        visa_expired = VisaResidence.objects.filter(
            residence_expiry_date__lt=today
        ).count()

        passport_soon = Document.objects.filter(
            document_type="passport",
            expiry_date__range=(today, soon),
        ).count()
        passport_expired = Document.objects.filter(
            document_type="passport",
            expiry_date__lt=today,
        ).count()

        contracts_soon = EmployeeContract.objects.filter(
            end_date__range=(today, soon)
        ).count()
        contracts_expired = EmployeeContract.objects.filter(
            end_date__lt=today
        ).count()

        data = {
            "visa": {"soon": visa_soon, "expired": visa_expired},
            "passport": {"soon": passport_soon, "expired": passport_expired},
            "contracts": {"soon": contracts_soon, "expired": contracts_expired},
        }
        return Response(data)


class HRWorkReportAdminViewSet(viewsets.ModelViewSet):
    """
    (لو مستخدم في router) لإدارة تقارير العمل / الغياب
    """
    queryset = WorkReport.objects.select_related("employee", "employee__user").all()
    serializer_class = WorkReportSerializer
    permission_classes = [CanManageHRWorkReports]
    filter_backends = [DjangoFilterBackend, drf_filters.OrderingFilter]
    filterset_fields = ["employee", "status", "date"]
    ordering = ["-date", "-id"]

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request, pk=None):
        report = self.get_object()
        action_value = request.data.get("action")

        if action_value not in ("approve", "reject"):
            return Response(
                {"detail": "قيمة action يجب أن تكون approve أو reject."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        if report.status != "pending":
            return Response(
                {"detail": "تمت مراجعة هذا التقرير مسبقاً."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        report.status = "approved" if action_value == "approve" else "rejected"
        report.save()

        if report.employee:
            create_notification_for_employee(
                report.employee,
                title="تحديث على تقرير الدوام/الغياب",
                message=(
                    f"تم {'اعتماد' if action_value == 'approve' else 'رفض'} "
                    f"تقريرك بتاريخ {report.date}."
                ),
                category="hr",
                related_object="WorkReport",
                related_id=report.id,
            )

        return Response(WorkReportSerializer(report).data)


class MyAttendanceListView(generics.ListAPIView):
    """
    GET /api/hr/my/attendance/?from=2025-11-01&to=2025-11-30
    """
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        emp = get_employee_for_user(self.request.user)
        if not emp:
            return Attendance.objects.none()
        qs = Attendance.objects.filter(employee=emp).order_by('-date')
        d_from = self.request.query_params.get("from")
        d_to = self.request.query_params.get("to")
        if d_from:
            qs = qs.filter(date__gte=d_from)
        if d_to:
            qs = qs.filter(date__lte=d_to)
        return qs


class MyPayrollListView(generics.ListAPIView):
    """
    GET /api/hr/my/payrolls/?year=2025
    """
    serializer_class = PayrollSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        emp = get_employee_for_user(self.request.user)
        if not emp:
            return Payroll.objects.none()
        qs = Payroll.objects.filter(employee=emp).order_by('-month')
        year = self.request.query_params.get("year")
        if year:
            qs = qs.filter(month__year=year)
        return qs


class HRSettingsView(generics.RetrieveUpdateAPIView):
    """
    GET /api/hr/settings/
    PATCH /api/hr/settings/
    """
    serializer_class = HRSettingsSerializer
    permission_classes = [IsHRManager]  # إعدادات HR للمدير

    def get_object(self):
        obj, _ = HRSettings.objects.get_or_create(id=1)
        return obj


class MyAttendanceCheckInView(MyHRBaseView, APIView):
    """
    POST /api/hr/my/attendance/check-in/
    يسجل حضور الموظف لليوم الحالي
    """
    def post(self, request, *args, **kwargs):
        emp = self.get_employee()
        today = timezone.localdate()

        att, created = Attendance.objects.get_or_create(
            employee=emp,
            date=today,
            defaults={
                "check_in": timezone.localtime().time(),
                "status": "present",
            },
        )

        if not created and att.check_in:
            return Response(
                {"detail": "تم تسجيل حضورك مسبقاً.", "attendance_id": att.id},
                status=400,
            )

        att.check_in = timezone.localtime().time()
        if not att.status:
            att.status = "present"
        att.save()
        return Response(AttendanceSerializer(att).data)


class MyAttendanceCheckOutView(MyHRBaseView, APIView):
    """
    POST /api/hr/my/attendance/check-out/
    يسجل انصراف الموظف لليوم الحالي ويحسب total_hours إن أمكن
    """
    def post(self, request, *args, **kwargs):
        emp = self.get_employee()
        today = timezone.localdate()

        att, _ = Attendance.objects.get_or_create(
            employee=emp,
            date=today,
            defaults={"status": "present"},
        )

        now_time = timezone.localtime().time()
        att.check_out = now_time

        if att.check_in and att.check_out:
            dt_in = datetime.combine(today, att.check_in)
            dt_out = datetime.combine(today, att.check_out)
            delta = dt_out - dt_in
            hours = delta.total_seconds() / 3600
            att.total_hours = round(hours, 2)

        att.save()
        return Response(AttendanceSerializer(att).data)


# ========= تقارير العمل / الغياب للـ HR (قائمة + مراجعة) =========
class HRWorkReportViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet يُستخدم مع الـ router:
    GET /api/hr/work-reports/
    GET /api/hr/work-reports/{id}/
    مع فلاتر وبحث بسيطة.
    """
    queryset = WorkReport.objects.select_related("employee", "employee__user").all()
    serializer_class = HRWorkReportSerializer
    permission_classes = [CanManageHRWorkReports]
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_fields = ["employee", "status"]
    search_fields = [
        "employee__user__username",
        "employee__employee_id",
        "absence_reason",
        "notes",
    ]
    ordering_fields = ["date", "created_at"]
    ordering = ["-date", "-id"]

class HRWorkReportListAPIView(generics.ListAPIView):
    """
    GET /api/hr/work-reports/
    """
    permission_classes = [CanManageHRWorkReports]
    serializer_class = WorkReportSerializer

    def get_queryset(self):
        qs = WorkReport.objects.select_related("employee", "employee__user").all().order_by("-date", "-id")

        employee_id = self.request.query_params.get("employee")
        status_param = self.request.query_params.get("status")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if status_param:
            qs = qs.filter(status=status_param)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs


class HRWorkReportReviewAPIView(APIView):
    """
    POST /api/hr/work-reports/<pk>/review/
    body: { "action": "approve" | "reject" }
    """
    permission_classes = [CanManageHRWorkReports]

    def post(self, request, pk, *args, **kwargs):
        try:
            wr = WorkReport.objects.select_related("employee", "employee__user").get(pk=pk)
        except WorkReport.DoesNotExist:
            return Response({"detail": "التقرير غير موجود."}, status=drf_status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")
        if action not in ["approve", "reject"]:
            return Response({"detail": "إجراء غير صحيح."}, status=drf_status.HTTP_400_BAD_REQUEST)

        wr.status = "approved" if action == "approve" else "rejected"
        wr.save()

        emp_user = getattr(wr.employee, "user", None)
        if emp_user:
            msg = (
                f"تم اعتماد تقرير العمل بتاريخ {wr.date}."
                if action == "approve"
                else f"تم رفض تقرير العمل بتاريخ {wr.date}."
            )
            Notification.objects.create(
                user=emp_user,
                type="general",
                title="تحديث على تقرير العمل",
                message=msg,
                category="hr",
                related_object="WorkReport",
                related_id=wr.id,
            )

        return Response(WorkReportSerializer(wr).data)

class MyDocumentsListCreateView(MyHRBaseView, generics.ListCreateAPIView):
    """
    GET /api/hr/my/documents/
    POST /api/hr/my/documents/
    يعرض مستندات الموظف الحالي + يسمح له برفع مستندات جديدة
    """
    serializer_class = DocumentSerializer

    def get_queryset(self):
        emp = self.get_employee()
        return Document.objects.filter(employee=emp).order_by("-expiry_date", "-id")

    def perform_create(self, serializer):
        emp = self.get_employee()
        serializer.save(employee=emp)


    
