# backend/apps/hr/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers
from datetime import date
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
    Employee,
    HRSettings,
    LeaveType,
    Notification,
    create_notification_for_employee,
    
)

User = get_user_model()


# ========= User مختصر (للاستخدام داخل Employee) =========

class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role"]


# ========= Employee =========

class EmployeeSerializer(serializers.ModelSerializer):
    # لعرض اسم المستخدم المرتبط في الفرونت إند
    user_username = serializers.CharField(
        source="user.username", read_only=True
    )
    user_full_name = serializers.CharField(
        source="user.full_name", read_only=True
    )


    class Meta:
        model = Employee
        fields = [
            "id",
            "user",              # id المستخدم (للإرسال/الاستقبال)
            "user_username",     # قراءة فقط
            "user_full_name",    # قراءة فقط ← جديد
            "employee_id",
            "department",
            "position",
            "hire_date",
            "salary",
            "phone_number",
            "address",
            "emergency_contact",
            "nationality",
            "work_permit",
        ]

    def validate_user(self, value):
        if value is None:
            raise serializers.ValidationError("يجب اختيار مستخدم مرتبط.")
        return value
    def create(self, validated_data):
        user = validated_data.get("user")
        if user and not validated_data.get("email"):
            validated_data["email"] = user.email
        return super().create(validated_data)

    def update(self, instance, validated_data):
        user = validated_data.get("user", instance.user)
        # لو حاب تخليه يتحدث تلقائي
        if user and not validated_data.get("email"):
            validated_data["email"] = user.email
        return super().update(instance, validated_data)
# ========= Attendance =========

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.username", read_only=True
    )

    class Meta:
        model = Attendance
        fields = [
            "id",
            "employee",
            "employee_name",
            "date",
            "check_in",
            "check_out",
            "status",
            "total_hours",
        ]


# ========= Absence =========

class AbsenceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.username", read_only=True
    )

    class Meta:
        model = Absence
        fields = [
            "id",
            "employee",
            "employee_name",
            "start_date",
            "end_date",
            "absence_type",
            "reason",
            "approved",
        ]


# ========= LeaveBalance =========

class LeaveBalanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.username", read_only=True
    )

    class Meta:
        model = LeaveBalance
        fields = [
            "id",
            "employee",
            "employee_name",
            "annual_leave",
            "sick_leave",
            "emergency_leave",
            "used_annual_leave",
            "used_sick_leave",
        ]


# ========= LeaveRequest =========

class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.username", read_only=True
    )

    class Meta:
        model = LeaveRequest
        fields = "__all__"
        read_only_fields = ["created_at", "decided_at"]


# ========= Contract =========

class ContractSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.username", read_only=True
    )

    class Meta:
        model = Contract
        fields = [
            "id",
            "employee",
            "employee_name",
            "contract_type",
            "start_date",
            "end_date",
            "salary",
            "file",
        ]


# ========= Payroll =========

class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.username", read_only=True
    )

    class Meta:
        model = Payroll
        fields = [
            "id",
            "employee",
            "employee_name",
            "month",
            "basic_salary",
            "overtime_hours",
            "overtime_pay",
            "bonuses",
            "deductions",
            "absent_deductions",
            "net_salary",
            "payment_status",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class PayrollSummarySerializer(serializers.Serializer):
    month = serializers.DateField()
    total_employees = serializers.IntegerField()
    total_net_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_deductions = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_overtime = serializers.DecimalField(max_digits=12, decimal_places=2)



# ========= VisaResidence =========

class VisaResidenceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.username", read_only=True
    )
    is_residence_expired = serializers.SerializerMethodField()
    is_passport_expired = serializers.SerializerMethodField()

    class Meta:
        model = VisaResidence
        fields = [
            "id",
            "employee",
            "employee_name",
            "visa_number",
            "residence_number",
            "residence_issue_date",
            "residence_expiry_date",
            "residence_duration",
            "passport_number",
            "passport_expiry",
            "sponsorship",
            "status",
            "is_residence_expired",
            "is_passport_expired",
        ]

    def get_is_residence_expired(self, obj):
        if obj.residence_expiry_date:
            return obj.residence_expiry_date < date.today()
        return False

    def get_is_passport_expired(self, obj):
        if obj.passport_expiry:
            return obj.passport_expiry < date.today()
        return False

# ========= Document =========

class DocumentSerializer(serializers.ModelSerializer):
    days_to_expiry = serializers.IntegerField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    employee_name = serializers.CharField(
          source="employee.user.username", read_only=True
      )

    class Meta:
        model = Document
        fields = "__all__"
        extra_kwargs = {
            "employee": {"required": False},
        }


# ========= HRReport =========

class HRReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(
        source="generated_by.username", read_only=True
    )

    class Meta:
        model = HRReport
        fields = [
            "id",
            "title",
            "report_type",
            "generated_by",
            "generated_by_name",
            "generated_at",
            "date_range",
            "file",
        ]
        read_only_fields = ["generated_at"]

class HRWorkReportSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.username", read_only=True
    )

    class Meta:
        model = WorkReport
        fields = [
            "id",
            "employee",
            "employee_name",
            "date",
            "hours_worked",
            "overtime_hours",
            "absence_reason",
            "notes",
            "status",
            "created_at",
            "reviewed_at",
        ]
        read_only_fields = ["created_at", "reviewed_at"]
        
class MyEmployeeMixin:
    """
    helper: يرجع Employee المرتبط بالمستخدم
    """
    def get_employee_for_user(self):
        user = self.context["request"].user
        try:
            return Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            raise serializers.ValidationError("لم يتم ربط حسابك كسجل موظف بعد.")


class MyEmployeeMixin:
    """
    helper: يرجع Employee المرتبط بالمستخدم
    """
    def get_employee_for_user(self):
        user = self.context["request"].user
        try:
            return Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            raise serializers.ValidationError("لم يتم ربط حسابك كسجل موظف بعد.")


class MyLeaveRequestSerializer(serializers.ModelSerializer, MyEmployeeMixin):
    """
    Serializer خاص بالموظف نفسه:
    - لا يسمح له بتحديد employee يدوياً
    - يحسب days_requested تلقائياً
    """
    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "leave_type",
            "start_date",
            "end_date",
            "status",
            "reason",
            "days_requested",
            "created_at",
            "decided_at",
        ]
        read_only_fields = ["status", "days_requested", "created_at", "decided_at"]

    def create(self, validated_data):
        emp = self.get_employee_for_user()
        start = validated_data["start_date"]
        end = validated_data["end_date"]
        days = (end - start).days + 1
        if days < 1:
            raise serializers.ValidationError("تاريخ النهاية يجب أن يكون بعد تاريخ البداية.")
        validated_data["days_requested"] = days
        return LeaveRequest.objects.create(employee=emp, **validated_data)


class SalaryRaiseRequestSerializer(serializers.ModelSerializer, MyEmployeeMixin):
    class Meta:
        model = SalaryRaiseRequest
        fields = [
            "id",
            "requested_amount",
            "reason",
            "status",
            "created_at",
            "decided_at",
        ]
        read_only_fields = ["status", "created_at", "decided_at"]

    def create(self, validated_data):
        emp = self.get_employee()
        obj = SalaryRaiseRequest.objects.create(employee=emp, **validated_data)

        # إشعار للموظف نفسه بتسجيل الطلب
        create_notification_for_employee(
            emp,
            title="تم استلام طلب زيادة راتب",
            message=f"تم استلام طلب زيادة راتب بمبلغ {obj.requested_amount}. سيتم المراجعة من قبل الإدارة.",
            category="raise",
            related_object="SalaryRaiseRequest",
            related_id=obj.id,
        )
        return obj


class WorkReportSerializer(serializers.ModelSerializer, MyEmployeeMixin):
    class Meta:
        model = WorkReport
        fields = [
            "id",
            "date",
            "hours_worked",
            "overtime_hours",
            "absence_reason",
            "notes",
            "status",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]

    def create(self, validated_data):
        emp = self.get_employee_for_user()
        return WorkReport.objects.create(employee=emp, **validated_data)
    
class HRWorkReportSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.username", read_only=True
    )

    class Meta:
        model = WorkReport
        fields = [
            "id",
            "employee",
            "employee_name",
            "date",
            "hours_worked",
            "overtime_hours",
            "absence_reason",
            "notes",
            "status",
            "created_at",
        ]
        read_only_fields = ["created_at"]

class HRSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HRSettings
        fields = [
            "id",
            "work_days_per_week",
            "official_hours_per_day",
            "overtime_threshold_hours",
            "leave_types",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ["id", "code", "name", "color", "default_days_per_year", "is_paid"]

class NotificationSerializer(serializers.ModelSerializer):
    # اسم المستخدم لعرضه عند الحاجة
    user_name = serializers.CharField(
        source="user.username", read_only=True
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "user_name",
            "title",
            "message",
            "category",
            "type",
            "data",
            "is_read",
            "related_object",
            "related_id",
            "created_at",
        ]
        read_only_fields = ["id", "user", "user_name", "created_at"]
