from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_settings import HRSettingsView, LeaveTypeViewSet
from .views import (
    EmployeeViewSet,
    AttendanceViewSet,
    AbsenceViewSet,
    LeaveBalanceViewSet,
    LeaveRequestViewSet,
    ContractViewSet,
    PayrollViewSet,
    VisaResidenceViewSet,
    DocumentViewSet,
    HRReportViewSet,
    HRWorkReportViewSet,
    hr_dashboard_stats,
    attendance_summary,
    payroll_summary,
    AttendanceSummaryAPIView,
    MyLeaveRequestsViewSet,
    MyLeaveListCreateView,
    MyRaiseRequestListCreateView,
    MyWorkReportListCreateView,
    MyAttendanceListView,
    MyPayrollListView,
    HRAlertsView,
    MyAttendanceCheckInView,
    MyAttendanceCheckOutView,
    MyNotificationsListView,
    MyNotificationsMarkAllReadView,
    HRWorkReportListAPIView,
    HRWorkReportReviewAPIView,
    MyDocumentsListCreateView,
    MyDocumentsView,
    hr_expiry_alerts,
    HRAlertsView,
    HRWorkReportListAPIView,
    HRWorkReportReviewAPIView,
    EmployeePerformanceAPIView,
)

router = DefaultRouter()
router.register(r"employees", EmployeeViewSet, basename="hr-employees")
router.register(r"attendance", AttendanceViewSet, basename="hr-attendance")
router.register(r"absences", AbsenceViewSet, basename="hr-absences")
router.register(r"leave-balance", LeaveBalanceViewSet, basename="hr-leave-balance")
router.register(r"leave-requests", LeaveRequestViewSet, basename="hr-leave-requests")
router.register(r"contracts", ContractViewSet, basename="hr-contracts")
router.register(r"payrolls", PayrollViewSet, basename="hr-payrolls")
router.register(r"visa-residence", VisaResidenceViewSet, basename="hr-visa")
router.register(r"documents", DocumentViewSet, basename="hr-documents")
router.register(r"reports", HRReportViewSet, basename="hr-reports")
router.register(r"work-reports", HRWorkReportViewSet, basename="hr-work-reports")
router.register(r'leaves', LeaveRequestViewSet, basename='leave')
urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/stats/", hr_dashboard_stats, name="hr-dashboard-stats"),
    path("performance/", EmployeePerformanceAPIView.as_view(), name="hr-performance"),
    path("payroll/summary/", payroll_summary, name="hr-payroll-summary"),
    path("attendance-summary/", attendance_summary, name="hr-attendance-summary"),
    path("attendance/summary/", AttendanceSummaryAPIView.as_view(), name="attendance-summary-api"),
    path("expiry-alerts/", hr_expiry_alerts, name="hr-expiry-alerts"),

    path("my/leave-requests/", MyLeaveRequestsViewSet.as_view({"get": "list", "post": "create"}), name="my-leave-requests"),

    # ======= My HR (Self Service) =======
    path("my/leaves/", MyLeaveListCreateView.as_view(), name="my-leaves"),
    path("my/raises/", MyRaiseRequestListCreateView.as_view(), name="my-raises"),
    path("my/work-reports/", MyWorkReportListCreateView.as_view(), name="my-work-reports"),
    path("my/attendance/", MyAttendanceListView.as_view(), name="my-attendance"),
    path("my/attendance/check-in/", MyAttendanceCheckInView.as_view(), name="my-attendance-checkin"),
    path("my/attendance/check-out/", MyAttendanceCheckOutView.as_view(), name="my-attendance-checkout"),
    path("my/payrolls/", MyPayrollListView.as_view(), name="my-payrolls"),

    # تنبيهات HR عامة (للـ HR Manager غالباً)
    path("alerts/", HRAlertsView.as_view(), name="hr-alerts"),

    path("settings/", HRSettingsView.as_view(), name="hr-settings"),
    path("leave-types/", LeaveTypeViewSet.as_view(), name="leave-types"),
    path("my/notifications/", MyNotificationsListView.as_view(), name="my-notifications"),
    path("my/notifications/mark-all-read/", MyNotificationsMarkAllReadView.as_view(), name="my-notifications-mark-all-read"),
    path("work-reports/", HRWorkReportListAPIView.as_view(), name="hr-work-reports"),
    path("work-reports/<int:pk>/review/", HRWorkReportReviewAPIView.as_view(), name="hr-work-report-review"),
    path("my/documents/", MyDocumentsListCreateView.as_view(), name="my-documents"),
    path("", include(router.urls)),
]
