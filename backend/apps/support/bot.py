# backend/apps/support/bot.py
import re
from typing import Optional
from django.contrib.auth import get_user_model

from apps.products.models import Product
from apps.orders.models import Order

User = get_user_model()


def _extract_int(text: str) -> Optional[int]:
    """يرجع أول رقم صحيح موجود في النص (لو فيه)"""
    m = re.search(r"\d+", text)
    if not m:
        return None
    try:
        return int(m.group(0))
    except ValueError:
        return None


def generate_bot_reply(user: User, content: str) -> str:
    """
    من هنا نجاوب الأسئلة التقليدية آليًا:
    - حالة الطلب: 'طلب 15' أو 'order 15'
    - الأسعار: 'سعر كابتشينو'
    - التوفر: 'هل كابتشينو متوفر؟'
    """
    text = content.strip().lower()

    # 0) رد عام افتراضي + fallback
    default_reply = (
        "أجبتك بالقدر المتاح آليًا 🤖\n"
        "ولو تحتاج مساعدة خاصة سيتم تحويل محادثتك لأحد موظفي الدعم في أقرب وقت.\n\n"
        "يمكنك سؤالنا عن:\n"
        "- حالة طلبك: اكتب مثلاً 'ما حالة الطلب 15'\n"
        "- سعر منتج: 'كم سعر ساندويتش دجاج مكسيكي؟'\n"
        "- توفر منتج: 'هل شاي كرك متوفر؟'\n"
    )


    # 1) حالة الطلب
    if "طلب" in content or "order" in text:
        order_id = _extract_int(content)
        if order_id is None:
            return "لو سمحت اذكر رقم الطلب، مثل: 'ما حالة الطلب 15'"

        try:
            order = Order.objects.get(id=order_id, user=user)
        except Order.DoesNotExist:
            return "لم نجد طلب بهذا الرقم مرتبط بحسابك. تأكد من رقم الطلب أو حساب الدخول."

        status_display = getattr(order, "get_status_display", lambda: order.status)()
        total = getattr(order, "total", 0)
        return (
            f"تفاصيل طلبك رقم {order_id}:\n"
            f"- الحالة الحالية: {status_display}\n"
            f"- الإجمالي: {total} ر.س\n"
        )

    # 2) الأسعار / المنتجات
    if "سعر" in content or "price" in text:
        # نحاول نقتبس اسم المنتج من النص (شيء بسيط + يعتمد على احتواء النص)
        # مثال: "كم سعر الكابتشينو" -> نبحث عن "الكابتشينو" كاسم منتج
        # هنا نجرّب نستخدم النص كله كـ filter مبسط:
        qs = Product.objects.filter(name__icontains=content).order_by("name")
        if not qs.exists():
            # نحاول فقط بجزء بعد كلمة "سعر"
            parts = re.split(r"سعر|price", content, flags=re.IGNORECASE)
            if len(parts) > 1:
                keyword = parts[1].strip()
                if keyword:
                    qs = Product.objects.filter(name__icontains=keyword)
        if qs.exists():
            p = qs.first()
            available_text = "متوفر حالياً" if getattr(p, "available", True) else "غير متوفر حالياً"
            return (
                f"سعر '{p.name}' هو {p.price} ر.س.\n"
                f"حالة المنتج: {available_text}."
            )
        else:
            return (
                "لم أستطع تحديد المنتج الذي تقصده.\n"
                "اكتب مثلاً: 'كم سعر ساندويتش دجاج مكسيكي؟'"
            )

    # 3) التوفر
    if "متوفر" in content or "available" in text:
        qs = Product.objects.filter(name__icontains=content)
        if qs.exists():
            p = qs.first()
            if getattr(p, "available", True):
                stock = getattr(p, "stock", None)
                if stock is not None:
                    return f"المنتج '{p.name}' متوفر حالياً، الكمية في المخزون: {stock}."
                return f"المنتج '{p.name}' متوفر حالياً."
            else:
                return f"المنتج '{p.name}' غير متوفر حالياً."
        return (
            "لم أجد منتجاً مطابقاً في القائمة.\n"
            "اذكر اسم المنتج بشكل أوضح، مثال: 'هل شاي كرك متوفر؟'"
        )

    # 4) ساعات العمل / أسئلة شائعة
    if "مواعيد" in content or "ساعات" in content or "open" in text or "مفتوح" in content:
        return (
            "ساعات العمل الحالية:\n"
           " يومياً من 6 صباحاً إلى 11 مساءً\n"
            "لأي استفسار إضافي، نحن بخدمتك 🌿"
        )

    # 5) fallback
    return default_reply

def should_handover_to_human(content: str) -> bool:
    """
    يكتشف جُمل من نوع:
    - أبي أكلم موظف
    - ابغى موظف
    - احتاج رد بشري
    - human / real person / agent
    """
    text = (content or "").strip().lower()

    trigger_phrases = [
        "اكلم موظف",
        "أكلم موظف",
        "ابي موظف",
        "أبي موظف",
        "ابغى موظف",
        "أبغى موظف",
        "احتاج موظف",
        "محتاج موظف",
        "رد بشري",
        "رد انساني",
        "رد إنساني",
        "موظف دعم",
        "شخص حقيقي",
        "بشري يرد",
        "human",
        "real person",
        "real agent",
        "talk to human",
        "talk to agent",
    ]

    return any(p in text for p in trigger_phrases)
