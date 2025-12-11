# backend/apps/invoices/utils.py
from io import BytesIO
from django.core.files.base import ContentFile
import barcode
from barcode.writer import ImageWriter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

def generate_invoice_pdf(order):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    c.drawString(100, 800, f'Invoice for Order #{order.id}')
    y = 760
    for item in order.items.all():
        c.drawString(100, y, f'{item.product.name} x{item.quantity} - {item.price}')
        y -= 20
    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    return ContentFile(pdf, name=f'invoice_{order.id}.pdf')

def generate_barcode(data):
    CODE = barcode.get('code128', str(data), writer=ImageWriter())
    fp = BytesIO()
    CODE.write(fp)
    fp.seek(0)
    return ContentFile(fp.read(), name=f'barcode_{data}.png')
