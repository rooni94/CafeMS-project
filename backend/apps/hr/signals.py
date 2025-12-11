# backend/apps/hr/signals.py
from datetime import date, timedelta
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import(
    Employee,
    SalaryRaiseRequest,
    Payroll,
    VisaResidence,
    Document,
    EmployeeContract,
    Notification,
)

User = get_user_model()

@receiver(post_save, sender=User)
def create_employee_for_staff_roles(sender, instance, created, **kwargs):
    """
    إنشاء سجل Employee تلقائيًا لأي مستخدم ليس customer
    (staff / supervisor / manager)
    """
    if instance.role in ["staff", "supervisor", "manager"]:
        Employee.objects.get_or_create(
            user=instance,
            defaults={
                "employee_id": f"EMP-{instance.id}",
                "department": "المقهى",
                "position": instance.get_role_display()
                if hasattr(instance, "get_role_display")
                else instance.role,
                "salary": 0,
            },
        )

@receiver(pre_save, sender=SalaryRaiseRequest)
def store_old_raise_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = SalaryRaiseRequest.objects.get(pk=instance.pk)
            instance._old_status = old.status
        except SalaryRaiseRequest.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=SalaryRaiseRequest)
def notify_raise_status_change(sender, instance, created, **kwargs):
    if created:
        # إنشاء جديد = لسه Pending غالباً، ما نرسل تنبيه هنا
        return

    old_status = getattr(instance, "_old_status", None)
    if old_status == instance.status:
        return

    if instance.status not in ["approved", "rejected"]:
        return

    user = instance.employee.user
    if not user:
        return

    if instance.status == "approved":
        msg = "تمت الموافقة على طلب زيادة الراتب الخاص بك."
    else:
        msg = "تم رفض طلب زيادة الراتب الخاص بك."

    Notification.objects.create(
        user=user,
        type="raise_status",
        title="حالة طلب زيادة الراتب",
        message=msg,
        data={
            "raise_id": instance.id,
            "status": instance.status,
            "requested_amount": str(instance.requested_amount),
        },
    )


@receiver(post_save, sender=Payroll)
def notify_new_payroll(sender, instance, created, **kwargs):
    if not created:
        return

    user = instance.employee.user
    if not user:
        return

    Notification.objects.create(
        user=user,
        type="payroll_new",
        title="إضافة مسير راتب جديد",
        message=f"تم تسجيل راتب شهر {instance.month.strftime('%Y-%m')} لك في النظام.",
        data={
            "payroll_id": instance.id,
            "month": instance.month.isoformat(),
            "net_salary": str(instance.net_salary),
        },
    )

def _notify_managers_and_employee(user, noti_type, title, message, extra_data=None):
    # تنبيه الموظف نفسه
    if user:
        Notification.objects.create(
            user=user,
            type=noti_type,
            title=title,
            message=message,
            data=extra_data or {},
        )

    # تنبيه جميع المدراء (role = manager)
    managers = User.objects.filter(role="manager")
    for m in managers:
        Notification.objects.create(
            user=m,
            type=noti_type,
            title=title,
            message=message,
            data=extra_data or {},
        )


@receiver(post_save, sender=VisaResidence)
def visa_residence_expiry_notifications(sender, instance, created, **kwargs):
    """
    عند حفظ سجل إقامة/تأشيرة:
    - لو الإقامة منتهية أو ستنتهي خلال 30 يوم → تنبيه
    - لو الجواز منتهي أو سينتهي خلال 30 يوم → تنبيه
    """
    emp_user = instance.employee.user if instance.employee and instance.employee.user else None
    today = date.today()
    soon_limit = today + timedelta(days=30)

    # إقامة
    if instance.residence_expiry_date:
        d = instance.residence_expiry_date
        if d < today:
            _notify_managers_and_employee(
                emp_user,
                "visa_expiry",
                "إقامة منتهية",
                f"إقامة الموظف {instance.employee} انتهت بتاريخ {d}.",
                {"employee_id": instance.employee_id, "residence_expiry_date": str(d)},
            )
        elif today <= d <= soon_limit:
            days = (d - today).days
            _notify_managers_and_employee(
                emp_user,
                "visa_expiry",
                "اقتراب انتهاء الإقامة",
                f"إقامة الموظف {instance.employee} ستنتهي بعد {days} يوم (بتاريخ {d}).",
                {"employee_id": instance.employee_id, "residence_expiry_date": str(d)},
            )

    # جواز
    if instance.passport_expiry:
        d = instance.passport_expiry
        if d < today:
            _notify_managers_and_employee(
                emp_user,
                "visa_expiry",
                "جواز سفر منتهي",
                f"جواز سفر الموظف {instance.employee} انتهى بتاريخ {d}.",
                {"employee_id": instance.employee_id, "passport_expiry": str(d)},
            )
        elif today <= d <= soon_limit:
            days = (d - today).days
            _notify_managers_and_employee(
                emp_user,
                "visa_expiry",
                "اقتراب انتهاء جواز السفر",
                f"جواز سفر الموظف {instance.employee} سينتهي بعد {days} يوم (بتاريخ {d}).",
                {"employee_id": instance.employee_id, "passport_expiry": str(d)},
            )


@receiver(post_save, sender=Document)
def documents_expiry_notifications(sender, instance, created, **kwargs):
    """
    عند حفظ مستند:
    - لو منتهي أو سينتهي خلال 30 يوم → تنبيه (document_expiry)
    """
    emp_user = instance.employee.user if instance.employee and instance.employee.user else None
    today = date.today()
    soon_limit = today + timedelta(days=30)

    if instance.expiry_date:
        d = instance.expiry_date
        if d < today:
            _notify_managers_and_employee(
                emp_user,
                "document_expiry",
                f"مستند منتهي: {instance.document_name}",
                f"المستند '{instance.document_name}' للموظف {instance.employee} انتهى بتاريخ {d}.",
                {"document_id": instance.id, "expiry_date": str(d)},
            )
        elif today <= d <= soon_limit:
            days = (d - today).days
            _notify_managers_and_employee(
                emp_user,
                "document_expiry",
                f"قرب انتهاء المستند: {instance.document_name}",
                f"المستند '{instance.document_name}' للموظف {instance.employee} سينتهي بعد {days} يوم (بتاريخ {d}).",
                {"document_id": instance.id, "expiry_date": str(d)},
            )


@receiver(post_save, sender=EmployeeContract)
def contract_expiry_notifications(sender, instance, created, **kwargs):
    """
    نهاية العقد = ممكن تعتبرها تأمين/عقد عمل
    """
    emp_user = instance.employee.user if instance.employee and instance.employee.user else None
    today = date.today()
    soon_limit = today + timedelta(days=30)

    if instance.end_date:
        d = instance.end_date
        if d < today:
            _notify_managers_and_employee(
                emp_user,
                "contract_expiry",
                "عقد عمل منتهي",
                f"عقد العمل للموظف {instance.employee} انتهى بتاريخ {d}.",
                {"contract_id": instance.id, "end_date": str(d)},
            )
        elif today <= d <= soon_limit:
            days = (d - today).days
            _notify_managers_and_employee(
                emp_user,
                "contract_expiry",
                "اقتراب انتهاء عقد العمل",
                f"عقد العمل للموظف {instance.employee} سينتهي بعد {days} يوم (بتاريخ {d}).",
                {"contract_id": instance.id, "end_date": str(d)},
            )