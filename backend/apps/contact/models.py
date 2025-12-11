from django.db import models
from django.conf import settings


class ContactMessage(models.Model):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    # 🔹 حقول لإدارة الرسالة من لوحة التحكم
    is_read = models.BooleanField(default=False, verbose_name="مقروءة؟")
    reply_text = models.TextField(blank=True, verbose_name="نص الرد", help_text="آخر رد أُرسل للعميل")
    replied_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الرد")
    replied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="contact_replies",
        verbose_name="تم الرد بواسطة",
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "رسالة تواصل"
        verbose_name_plural = "رسائل التواصل"

    def __str__(self):
        return f"{self.name} - {self.email} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
