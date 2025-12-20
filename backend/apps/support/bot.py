import re
from typing import Optional
from django.contrib.auth import get_user_model

from apps.products.models import Product
from apps.orders.models import Order

User = get_user_model()


def _extract_int(text: str) -> Optional[int]:
    """يرجع أول رقم صحيح موجود في النص (لو فيه)."""
    m = re.search(r"\d+", text)
    if not m:
        return None
    try:
        return int(m.group(0))
    except ValueError:
        return None


def generate_bot_reply(user: Optional[User], content: str) -> str:
    """
    من هنا نجاوب الأسئلة التقليدية آليًا باللهجة السعودية:
    - حالة الطلب (للعملاء المسجّلين فقط)
    - الأسعار
    - توفر المنتجات
    - ساعات العمل
    - موقع الفرع وأشياء عامة
    """
    raw = content or ""
    text = raw.strip()
    lowered = text.lower()
    is_auth = bool(user and getattr(user, "is_authenticated", False))

    # رد عام افتراضي + fallback
    default_reply = (
        "حياك الله 👋\n"
        "أقدَر أساعدك في الأشياء التالية:\n"
        "• حالة طلبك (لو أنت مسجّل دخول): اكتب مثلاً: \"وش حالة الطلب 15؟\"\n"
        "• أسعار المنيو: \"كم سعر ساندويتش دجاج مكسيكي؟\"\n"
        "• توفر صنف: \"شاي الكرك متوفر؟\"\n"
        "• مواعيد العمل أو موقع الفرع.\n"
        "وإذا حاب يرد عليك موظف حقيقي اكتب: \"أبغى أكلم موظف\" وبنحوّل المحادثة للفريق 🌿"
    )

    # 1) تحيات / افتتاحية
    greetings = [
        "مرحبا",
        "مرحبى",
        "هلا",
        "مسالخير",
        "صباحو",
        "مساالخير",
        "سلام",
        "السلام عليكم",
        "صباح الخير",
        "مساء الخير",
        "allo",
        "الو",
        "hello",
        "hi",
    ]
    if any(g in lowered or g in text for g in greetings):
        return (
            "هلا والله 👋\n"
            "نورّت دعم CafeMS Demo.\n"
            "قول لي كيف أقدر أساعدك؟ تقدر تسأل عن الأسعار، توفر الأصناف، مواعيد العمل، "
            "أو حالة طلبك لو أنت مسجّل دخول 🌮☕️"
        )

    # 2) ساعات العمل / متى تفتحون؟
    if (
        "مواعيد" in text
        or "ساعات" in text
        or "وقت الدوام" in text
        or "دوامكم" in text
        or "تفتحون" in text
        or "مفتوح" in text
        or "open" in lowered
        or "working hours" in lowered
    ):
        return (
            "دوام CafeMS Demo حالياً:\n"
            "📅 كل يوم من السبت إلى الجمعة\n"
            "⏰ من 6:00 صباحاً إلى 11:00 مساءً\n"
            "ولو صار أي تغيير في الأوقات نحدّثه في الموقع والحسابات الرسمية إن شاء الله 🌿"
        )

    # 3) موقع الفرع / وينكم؟
    if (
        "وينكم" in text
        or "موقعكم" in text
        or "العنوان" in text
        or "وين الفرع" in text
        or "location" in lowered
        or "لوكيشن" in text
    ):
        return (
            "حالياً نستقبل طلبات أونلاين عبر الموقع والتطبيق.\n"
            "لو حاب تعرف أقرب فرع أو تستلم من المحل، تواصل معنا ببيانات موقعك "
            "وبيساعدك موظف الدعم بأقرب وقت بإذن الله 📍"
        )

    # 4) حالة الطلب (تتطلب user مسجّل)
    if "طلب" in text or "order" in lowered:
        # ضيف أو مستخدم غير مسجّل
        if not is_auth:
            return (
                "عشان أقدَر أشيّك على حالة طلبك، لازم تكون داخل بحسابك اللي طلبت منه 🔐\n"
                "سجّل دخولك من فوق وبعدين اكتب مثلاً: \"وش حالة الطلب 15؟\""
            )

        order_id = _extract_int(text)
        if order_id is None:
            return "لو سمحت اذكر رقم الطلب، مثل: \"وش حالة الطلب 15؟\""

        try:
            order = Order.objects.get(id=order_id, user=user)
        except Order.DoesNotExist:
            return (
                "ما لقيت طلب بهذا الرقم مرتبط بحسابك 🤔\n"
                "تأكد من رقم الطلب، أو تأكد إنك داخل بنفس الحساب اللي سويت منه الطلب."
            )

        status_display = getattr(order, "get_status_display", lambda: order.status)()
        total = getattr(order, "total", 0)
        return (
            f"تفاصيل طلبك رقم {order_id}:\n"
            f"• الحالة الحالية: {status_display}\n"
            f"• الإجمالي: {total} ر.س\n"
            "لو حاب تعدّل أو تستفسر أكثر، قول لي وش تحتاج 🙏"
        )

    # 5) الأسعار / المنتجات
    if "سعر" in text or "price" in lowered or "بكم" in text or "كم قيمته" in text:
        qs = Product.objects.filter(name__icontains=text).order_by("name")

        if not qs.exists():
            # نحاول ما بعد كلمة "سعر" أو "بكم"
            parts = re.split(r"سعر|price|بكم", text, flags=re.IGNORECASE)
            if len(parts) > 1:
                keyword = parts[1].strip()
                if keyword:
                    qs = Product.objects.filter(name__icontains=keyword)

        if qs.exists():
            p = qs.first()
            available_text = (
                "متوفر حالياً ✅" if getattr(p, "available", True) else "غير متوفر حالياً ❌"
            )
            return (
                f"سعر \"{p.name}\" هو {p.price} ر.س.\n"
                f"حالة المنتج: {available_text}"
            )
        else:
            return (
                "ما قدرت أحدد أي منتج تقصد 😅\n"
                "اكتب اسم الصنف أوضح، مثال: \"كم سعر ساندويتش دجاج مكسيكي؟\""
            )

    # 6) التوفر
    if (
        "متوفر" in text
        or "متوفره" in text
        or "متاحة" in text
        or "available" in lowered
    ):
        qs = Product.objects.filter(name__icontains=text)
        if qs.exists():
            p = qs.first()
            if getattr(p, "available", True):
                stock = getattr(p, "stock", None)
                if stock is not None:
                    return (
                        f"المنتج \"{p.name}\" متوفر حالياً 🙌\n"
                        f"الكمية المتبقية في المخزون تقريباً: {stock}."
                    )
                return f"المنتج \"{p.name}\" متوفر حالياً 🙌"
            else:
                return f"المنتج \"{p.name}\" للأسف حالياً غير متوفر ❌"
        return (
            "ما لقيت منتج مطابق في القائمة 🤔\n"
            "اكتب اسم الصنف بشكل أوضح، مثال: \"شاي الكرك متوفر؟\""
        )

    # 7) توصيل / تجهيز الطلب
    if (
        "توصيل" in text
        or "تسليم" in text
        or "طلبات" in text
        or "ديليفري" in text
        or "delivery" in lowered
        or "يوصل" in text
    ):
        return (
            "حاليًا نستقبل طلباتك من خلال الموقع أو التطبيق 🤳\n"
            "بعد ما تختار الأصناف وتكمل الدفع بيظهر لك خيارات الاستلام أو التوصيل المتاحة لمنطقتك."
        )

    # 8) fallback
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
        "ابغى اكلم احد",
        "أبغى أكلم أحد",
        "احتاج موظف",
        "محتاج موظف",
        "محتاج اكلم احد",
        "أحتاج أكلم أحد",
        "ممكن بشر",
        "ممكن بشري",
        "أبغى بشري",
        "أبغى بشر",
        "ابغى بشري",
        "ابغى بشر",
        "ابي بشري",
        "أبي بشري",
        "رد بشري",
        "رد انساني",
        "رد إنساني",
        "موظف دعم",
        "موظف",
        "ما احتاج رد الي",
        "ما أحتاج رد آلي",
        "شخص حقيقي",
        "بشري يرد",
        "human",
        "real person",
        "real agent",
        "talk to human",
        "talk to agent",
        "support agent",
    ]

    return any(p in text for p in trigger_phrases)
