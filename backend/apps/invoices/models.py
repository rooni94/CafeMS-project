from django.db import models
from django.core.files.base import ContentFile

from apps.orders.models import Order

import io
import os

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

try:
    import qrcode
except Exception:  # pragma: no cover
    qrcode = None

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
except Exception:  # pragma: no cover
    arabic_reshaper = None
    get_display = None


def ar(text: str) -> str:
    """
    تهيئة النص العربي ليظهر متصل وبالاتجاه الصحيح في reportlab
    """
    if not text:
        return ""
    if arabic_reshaper is None or get_display is None:
        return text
    # reportlab لا يدعم Arabic shaping، فنستخدم arabic_reshaper + bidi
    reshaped = arabic_reshaper.reshape(text)
    bidi_text = get_display(reshaped)
    return bidi_text


def register_arabic_font():
    """
    تسجيل الخط العربي باسم ArabicFont من داخل مجلد هذا الـ app
    """
    if "ArabicFont" in pdfmetrics.getRegisteredFontNames():
        return

    # مسار هذا الملف نفسه (models.py)
    app_dir = os.path.dirname(os.path.abspath(__file__))
    font_path = os.path.join(app_dir, "fonts", "DejaVuSans.ttf")

    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont("ArabicFont", font_path))
    else:
        # لو الخط غير موجود، سنستمر باستخدام Helvetica لكن سيظهر العربي كمربعات
        print("Arabic font file not found at:", font_path)


class Invoice(models.Model):
    order = models.OneToOneField(
        Order, related_name="invoice", on_delete=models.CASCADE
    )
    number = models.CharField(max_length=32, unique=True, null=True, blank=True)
    pdf = models.FileField(upload_to="invoices/")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.number or f"Invoice for Order #{self.order_id}"

    def generate_number(self):
        if not self.number:
            self.number = f"INV-{self.order.id:06d}"

    def build_pdf(self):
        """
        إنشاء فاتورة بشكل إيصال طابعة (عرض ~80mm) مع دعم عربي و QR
        """
        register_arabic_font()

        # عرض الإيصال 80mm وطول ديناميكي بسيط
        width = 80 * mm
        items_count = 1
        for _item in self.order.items.prefetch_related("addons"):
            addon_count = _item.addons.count() if hasattr(_item, "addons") else 0
            items_count += 1 + addon_count
        base_height = 120 * mm
        line_height = 6 * mm
        height = base_height + items_count * line_height

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=(width, height))

        order = self.order

        font_name = (
            "ArabicFont"
            if "ArabicFont" in pdfmetrics.getRegisteredFontNames()
            else "Helvetica"
        )

        y = height - 10 * mm

        # عنوان الكافيه
        c.setFont(font_name, 12)
        c.drawCentredString(width / 2, y, ar("نظام إدارة الكافيه"))
        y -= 8 * mm

        c.setFont(font_name, 8)
        c.drawCentredString(width / 2, y, ar("فاتورة طلب"))
        y -= 4 * mm

        # خط فاصل
        c.setStrokeColor(colors.black)
        c.line(5 * mm, y, width - 5 * mm, y)
        y -= 5 * mm

        # معلومات الفاتورة
        c.setFont(font_name, 7)
        c.drawString(5 * mm, y, ar(f"رقم الفاتورة: {self.number}"))
        y -= 4 * mm
        c.drawString(5 * mm, y, ar(f"رقم الطلب: #{order.id}"))
        y -= 4 * mm
        if order.created_at:
            c.drawString(
                5 * mm,
                y,
                ar(f"التاريخ: {order.created_at.strftime('%Y-%m-%d %H:%M')}"),
            )
            y -= 4 * mm

        y -= 3 * mm
        c.line(5 * mm, y, width - 5 * mm, y)
        y -= 5 * mm

        # عناوين الأعمدة
        c.setFont(font_name, 7)
        c.drawString(5 * mm, y, ar("الصنف"))
        c.drawRightString(width - 5 * mm, y, ar("الإجمالي"))
        y -= 4 * mm
        c.drawString(5 * mm, y, ar("الكمية × السعر"))
        y -= 3 * mm

        c.line(5 * mm, y, width - 5 * mm, y)
        y -= 4 * mm

        # بنود الطلب
        c.setFont(font_name, 7)
        for item in order.items.prefetch_related("addons"):
            if y < 25 * mm:
                c.showPage()
                y = height - 10 * mm
                c.setFont(font_name, 7)

            line_total = float(item.price) * item.quantity

            # السطر الأول: اسم الصنف
            c.drawString(5 * mm, y, ar(str(item.product.name)))
            c.drawRightString(
                width - 5 * mm,
                y,
                ar(f"{line_total:.2f} ريال"),
            )
            y -= 4 * mm

            # السطر الثاني: الكمية × السعر
            c.drawString(
                5 * mm,
                y,
                ar(f"{item.quantity} × {item.price:.2f} ريال"),
            )
            y -= 5 * mm

            addons = list(item.addons.all()) if hasattr(item, "addons") else []
            for addon in addons:
                if y < 25 * mm:
                    c.showPage()
                    y = height - 10 * mm
                    c.setFont(font_name, 7)

                addon_price = float(getattr(addon, "price_delta", 0) or 0)
                c.drawString(7 * mm, y, ar(f"+ {addon.name}"))
                c.drawRightString(width - 5 * mm, y, ar(f"{addon_price:.2f} ريال"))
                y -= 4 * mm

        # خط قبل الإجمالي
        y -= 2 * mm
        c.line(5 * mm, y, width - 5 * mm, y)
        y -= 5 * mm

        # الإجمالي الكلي
        c.setFont(font_name, 8)
        c.drawString(5 * mm, y, ar("الإجمالي الكلي:"))
        c.drawRightString(
            width - 5 * mm,
            y,
            ar(f"{order.total:.2f} ريال"),
        )
        y -= 6 * mm

        # طريقة الدفع وحالة الدفع
        c.setFont(font_name, 7)
        c.drawString(5 * mm, y, ar(f"طريقة الدفع: {order.payment_method}"))
        y -= 4 * mm
        c.drawString(
            5 * mm,
            y,
            ar(f"الحالة: {'مدفوع' if order.paid else 'غير مدفوع'}"),
        )
        y -= 6 * mm

        # خط قبل الـ QR
        c.line(5 * mm, y, width - 5 * mm, y)
        y -= 6 * mm

        # الـ QR
        try:
            if qrcode is None:
                raise RuntimeError("qrcode library is not installed")
            from django.conf import settings as dj_settings

            frontend_url = getattr(dj_settings, "FRONTEND_URL", "http://localhost:5173")
            frontend_url = frontend_url.rstrip("/")
            tracking_url = f"{frontend_url}/order-tracking?order={order.id}"

            qr = qrcode.QRCode(box_size=2, border=1)
            qr.add_data(tracking_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")

            qr_buffer = io.BytesIO()
            img.save(qr_buffer, format="PNG")
            qr_buffer.seek(0)

            qr_image = ImageReader(qr_buffer)

            # حجم ومكان الـ QR
            qr_size = 30 * mm
            qr_x = width / 2 - qr_size / 2
            qr_y = max(5 * mm, y - qr_size - 8 * mm)  # نجعله فوق الهامش السفلي

            # النص أولاً فوق الكود
            c.setFont(font_name, 6)
            c.drawCentredString(
                width / 2,
                qr_y + qr_size + 3 * mm,  # فوق أعلى الكود
                ar("امسح الـ QR لتتبع حالة الطلب"),
            )

            # ثم نرسم الكود أسفل النص
            c.drawImage(
                qr_image,
                qr_x,
                qr_y,
                width=qr_size,
                height=qr_size,
                preserveAspectRatio=True,
            )

        except Exception as qr_err:
            print("QR generation error:", qr_err)

        c.showPage()
        c.save()

        buffer.seek(0)
        filename = f"invoice_{order.id}.pdf"
        self.pdf.save(filename, ContentFile(buffer.read()), save=False)
        buffer.close()

    def save(self, *args, **kwargs):
        creating = self.pk is None
        self.generate_number()
        if creating and not self.pdf:
            self.build_pdf()
        super().save(*args, **kwargs)
