# backend/apps/hr/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import date
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()

User = settings.AUTH_USER_MODEL


# ========= الموظف =========

class Employee(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile",
    )
    employee_id = models.CharField(max_length=20, unique=True)
    email = models.EmailField(null=True, blank=True)
    department = models.CharField(max_length=100)
    position = models.CharField(max_length=100)
    hire_date = models.DateField(default=timezone.now)
    salary = models.DecimalField(max_digits=10, decimal_places=2)

    phone_number = models.CharField(max_length=30, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    emergency_contact = models.CharField(max_length=255, blank=True, null=True)

    nationality = models.CharField(max_length=100, blank=True, null=True)
    work_permit = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.employee_id} - {self.user}"


# ========= الحضور =========

class Attendance(models.Model):
    STATUS_CHOICES = (
        ("present", "حاضر"),
        ("late", "متأخر"),
        ("absent", "غائب"),
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField(default=timezone.localdate)
    check_in = models.TimeField(blank=True, null=True)
    check_out = models.TimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="present")
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        unique_together = ("employee", "date")
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.employee} - {self.date} - {self.status}"


# ========= الغياب =========

class Absence(models.Model):
    ABSENCE_TYPES = (
        ("sick", "مرضي"),
        ("annual", "اعتيادي"),
        ("unexcused", "غير مبرر"),
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="absences",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    absence_type = models.CharField(max_length=20, choices=ABSENCE_TYPES)
    reason = models.TextField(blank=True, null=True)
    approved = models.BooleanField(default=False)

    class Meta:
        ordering = ["-start_date", "-id"]

    def __str__(self):
        return f"{self.employee} - {self.absence_type} ({self.start_date} -> {self.end_date})"


# ========= رصيد الإجازات =========

class LeaveBalance(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name="leave_balance")
    annual_quota = models.PositiveIntegerField(default=30)
    used_days = models.PositiveIntegerField(default=0)

    @property
    def remaining_days(self):
        return max(self.annual_quota - self.used_days, 0)

    def __str__(self):
        return f"{self.employee} - remaining {self.remaining_days}"

    annual_leave = models.PositiveIntegerField(default=0)
    sick_leave = models.PositiveIntegerField(default=0)
    emergency_leave = models.PositiveIntegerField(default=0)

    used_annual_leave = models.PositiveIntegerField(default=0)
    used_sick_leave = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Leave balance for {self.employee}"


# ========= طلبات الإجازة =========

class LeaveRequest(models.Model):
    LEAVE_TYPES = (
        ("annual", "سنوية"),
        ("sick", "مرضية"),
        ("emergency", "طارئة"),
    )

    STATUS_CHOICES = (
        ("pending", "معلق"),
        ("approved", "معتمد"),
        ("rejected", "مرفوض"),
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    reason = models.TextField(blank=True, null=True)
    days_requested = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.employee} - {self.leave_type} ({self.start_date} -> {self.end_date})"


# ========= العقود =========

class Contract(models.Model):
    CONTRACT_TYPES = (
        ("permanent", "دائم"),
        ("temporary", "مؤقت"),
        ("intern", "متدرب"),
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="contracts",
    )
    contract_type = models.CharField(max_length=20, choices=CONTRACT_TYPES)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    file = models.FileField(upload_to="hr/contracts/", blank=True, null=True)

    class Meta:
        ordering = ["-start_date", "-id"]

    def __str__(self):
        return f"{self.employee} - {self.contract_type}"


# ========= الرواتب =========

class Payroll(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="payrolls",
    )
    # نُخزن أول يوم من الشهر
    month = models.DateField(help_text="خزّن اليوم الأول من الشهر، مثلاً 2025-11-01")

    basic_salary = models.DecimalField(max_digits=10, decimal_places=2)
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    overtime_pay = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bonuses = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    absent_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    PAYMENT_STATUS_CHOICES = (
        ("unpaid", "غير مدفوع"),
        ("paid", "مدفوع"),
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="unpaid",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-month", "-id"]
        unique_together = ("employee", "month")

    def __str__(self):
        return f"Payroll {self.month} - {self.employee}"


# ========= التأشيرة والإقامة =========

class VisaResidence(models.Model):
    STATUS_CHOICES = (
        ("valid", "سارية"),
        ("expired", "منتهية"),
        ("renewing", "قيد التجديد"),
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="visa_residences",
    )
    visa_number = models.CharField(max_length=50, blank=True, null=True)
    residence_number = models.CharField(max_length=50, blank=True, null=True)

    residence_issue_date = models.DateField(blank=True, null=True)
    residence_expiry_date = models.DateField(blank=True, null=True)
    residence_duration = models.PositiveIntegerField(
        default=0, help_text="مدة الإقامة بالأشهر"
    )

    passport_number = models.CharField(max_length=50, blank=True, null=True)
    passport_expiry = models.DateField(blank=True, null=True)
    is_residence_expired = models.BooleanField(default=False)
    is_passport_expired = models.BooleanField(default=False)
    sponsorship = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="valid")

    class Meta:
        ordering = ["residence_expiry_date", "passport_expiry", "id"]

    def __str__(self):
        return f"{self.employee} - {self.status}"
    
    def save(self, *args, **kwargs):
        today = date.today()
        old_res_expired = None
        old_pass_expired = None
        if self.pk:
            try:
                old = VisaResidence.objects.get(pk=self.pk)
                old_res_expired = old.is_residence_expired
                old_pass_expired = old.is_passport_expired
            except VisaResidence.DoesNotExist:
                pass

        # تحديث الحالات
        self.is_residence_expired = bool(
            self.residence_expiry_date and self.residence_expiry_date < today
        )
        self.is_passport_expired = bool(
            self.passport_expiry and self.passport_expiry < today
        )

        super().save(*args, **kwargs)

        # إشعارات جديدة
        if self.employee:
            if self.is_residence_expired and old_res_expired is not True:
                create_notification_for_employee(
                    self.employee,
                    title="انتهاء الإقامة",
                    message="انتهت صلاحية الإقامة الخاصة بك، يرجى مراجعة الموارد البشرية.",
                    category="visa",
                    related_object="VisaResidence",
                    related_id=self.id,
                )
            if self.is_passport_expired and old_pass_expired is not True:
                create_notification_for_employee(
                    self.employee,
                    title="انتهاء جواز السفر",
                    message="انتهت صلاحية جواز سفرك، يرجى تجديده ورفع نسخة جديدة.",
                    category="visa",
                    related_object="VisaResidence",
                    related_id=self.id,
                )


# ========= المستندات =========

class Document(models.Model):
    DOCUMENT_TYPES = (
        ("passport", "جواز"),
        ("residence", "إقامة"),
        ("contract", "عقد"),
        ("certificate", "شهادة"),
        ("insurance", "تأمين"),
        ("other", "أخرى"),
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    document_name = models.CharField(max_length=255)

    issue_date = models.DateField(blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)

    file = models.FileField(upload_to="hr/documents/", blank=True, null=True)
    # حقل حقيقي في قاعدة البيانات
    is_expired = models.BooleanField(default=False)

    def update_expiry_status(self):
        if self.expiry_date:
            self.is_expired = self.expiry_date < date.today()
        else:
            self.is_expired = False

    def save(self, *args, **kwargs):
        # نحدد الحالة القديمة قبل الحفظ (لو السجل موجود)
        old_is_expired = None
        if self.pk:
            try:
                old = Document.objects.get(pk=self.pk)
                old_is_expired = old.is_expired
            except Document.DoesNotExist:
                pass

        # تحديث حالة الانتهاء
        self.update_expiry_status()
        super().save(*args, **kwargs)

        # بعد الحفظ: لو أصبح منتهي لأول مرة -> إرسال تنبيه
        if self.is_expired and old_is_expired is not True and self.employee:
            title = "تنبيه انتهاء مستند"
            msg = f"انتهى المستند '{self.document_name}' من نوع {self.document_type}."
            create_notification_for_employee(
                self.employee,
                title=title,
                message=msg,
                category="document",
                related_object="Document",
                related_id=self.id,
            )

    @property
    def days_to_expiry(self):
        if not self.expiry_date:
            return None
        return (self.expiry_date - date.today()).days

    @property
    def is_expiring_soon(self):
        d = self.days_to_expiry
        return d is not None and 0 <= d <= 30


# ========= التقارير =========

class HRReport(models.Model):
    REPORT_TYPES = (
        ("payroll", "رواتب"),
        ("attendance", "حضور"),
        ("leaves", "إجازات"),
        ("documents", "مستندات"),
        ("other", "أخرى"),
    )

    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    generated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_reports",
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    date_range = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="وصف الفترة الزمنية للتقرير (مثلاً: نوفمبر 2025)",
    )
    file = models.FileField(upload_to="hr/reports/", blank=True, null=True)

    class Meta:
        ordering = ["-generated_at", "-id"]

    def __str__(self):
        return self.title

class Notification(models.Model):
    NOTI_TYPES = (
        ("leave_status", "Leave Status"),
        ("raise_status", "Raise Status"),
        ("payroll_new", "New Payroll"),
        ("visa_expiry", "Visa / Residence Expiry"),
        ("document_expiry", "Document Expiry"),
        ("contract_expiry", "Contract / Insurance Expiry"),
        ("general", "General"),
    )

    CATEGORY_CHOICES = (
        ("hr", "HR"),
        ("payroll", "Payroll"),
        ("leave", "Leave"),
        ("other", "Other"),
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=50, choices=NOTI_TYPES, default="general")
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    category = models.CharField(
        max_length=50, choices=CATEGORY_CHOICES, default="other"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    related_object = models.CharField(max_length=100, blank=True, null=True)
    related_id = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.user} - {self.title}"


def create_notification_for_employee(
    employee,
    title,
    message,
    category="other",
    related_object=None,
    related_id=None,
):
    """
    helper: يستقبل Employee ويُنشئ Notification بناءً على employee.user
    """
    if not employee or not getattr(employee, "user", None):
        return

    notification = Notification.objects.create(
        user=employee.user,
        title=title,
        message=message,
        category=category,
        related_object=related_object or "",
        related_id=related_id,
    )

    try:
        from apps.accounts.push import notify_user

        notify_user(
            employee.user,
            title=title,
            body=message,
            data={
                "type": "hr",
                "category": category,
                "notification_id": notification.id,
                "related_object": related_object or "",
                "related_id": related_id,
            },
        )
    except Exception as exc:
        print("push notification error:", exc)


class SalaryRaiseRequest(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="raise_requests")
    created_at = models.DateTimeField(auto_now_add=True)
    requested_amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField(blank=True, null=True)

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="raise_decisions"
    )


class WorkReport(models.Model):
    """
    تقرير غياب/دوام/ساعات إضافية يقدمه الموظف نفسه
    """
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="work_reports")
    date = models.DateField()
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # عدد ساعات الدوام
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    absence_reason = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    STATUS_CHOICES = (
        ("pending", "Pending"),    # قيد المراجعة
        ("approved", "Approved"),  # معتمد
        ("rejected", "Rejected"),  # مرفوض
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    created_at = models.DateTimeField(auto_now_add=True)

    # من وافق/رفض ومتى (اختياري لكن مفيد)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_work_reports",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.employee} - {self.date} - {self.status}"


class EmployeeContract(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="employee_contracts",
    )
    contract_type = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    document = models.FileField(upload_to="hr/employee_contracts/", null=True, blank=True)

    def __str__(self):
        return f"{self.employee} - {self.contract_type}"

class HRSettings(models.Model):
    # نفترض نظام واحد، نستخدم Singleton (أول سجل فقط)
    work_days_per_week = models.CharField(
        max_length=50,
        default="sun,mon,tue,wed,thu",  # نحفظها كقائمة نصية بسيطة
    )
    official_hours_per_day = models.DecimalField(
        max_digits=4, decimal_places=2, default=8.0
    )
    overtime_threshold_hours = models.DecimalField(
        max_digits=4, decimal_places=2, default=8.0
    )

    # نحفظ أنواع الإجازات في JSON بسيط
    leave_types = models.JSONField(
        default=list,
        help_text="مثال: [{\"code\":\"annual\",\"label\":\"سنوية\",\"color\":\"#22c55e\",\"days\":21}]",
    )

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "HR Settings"


class LeaveType(models.Model):
    code = models.CharField(max_length=20, unique=True)  # e.g. annual / sick / unpaid
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#10b981")  # HEX
    default_days_per_year = models.PositiveSmallIntegerField(default=0)
    is_paid = models.BooleanField(default=True)

    def __str__(self):
        return self.name
