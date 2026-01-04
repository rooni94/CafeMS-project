import logging
import re
from decimal import Decimal
from difflib import get_close_matches
from typing import Optional, Tuple

from django.contrib.auth import get_user_model
from django.db import transaction

from apps.orders.models import Order, OrderItem
from apps.products.models import Product
from apps.support.models import Conversation

logger = logging.getLogger(__name__)
User = get_user_model()

# سياق خفي باستخدام محرف غير مرئي حتى لا يظهر للعميل
_CTX_PREFIX = "\u2063"


# ---------- Utilities ----------
def _extract_int(text: str) -> Optional[int]:
    m = re.search(r"\d+", text or "")
    if not m:
        return None
    try:
        return int(m.group(0))
    except ValueError:
        return None


def _normalize_text(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"[!?.,؛،؟]", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _normalize_variants(text: str) -> str:
    if not text:
        return ""
    normalized = text
    normalized = re.sub(r"ساند[وي]تش", "ساندويتش", normalized, flags=re.IGNORECASE)
    normalized = normalized.replace("صندويتش", "ساندويتش")
    variant_map = {
        "بيبسي": "مشروب غازي",
        "سفن": "مشروب غازي",
        "سفن أب": "مشروب غازي",
        "شبس": "صحن بطاطس",
        "شيبس": "صحن بطاطس",
        "مويا": "ماء",
        "موية": "ماء",
        "موى": "ماء",
        "لاتيه": "Latte",
        "لتيه": "Latte",
        "قهوه": "قهوة",
        "قهوة": "Latte",
    }
    for k, v in variant_map.items():
        normalized = re.sub(k, v, normalized, flags=re.IGNORECASE)
    return normalized


def _strip_stopwords(query: str) -> str:
    stopwords = {
        "كم",
        "بكم",
        "ايش",
        "وش",
        "في",
        "فيه",
        "هل",
        "عن",
        "به",
        "مع",
        "على",
        "ابي",
        "أبي",
        "ابغى",
        "أبغى",
        "ابغا",
        "ابا",
        "اللي",
        "هذا",
        "هذي",
        "ذا",
        "ذاك",
        "منيو",
        "القائمة",
        "لو",
        "لو سمحت",
        "تكفى",
        "تكفا",
        "تكفئ",
        "ممكن",
        "احس",
        "ودي",
        "ابي اطلب",
        "ابغى اطلب",
    }
    parts = [w for w in query.split() if w and w.lower() not in stopwords]
    return " ".join(parts).strip()


def _best_product(query: str) -> Optional[Product]:
    query = (query or "").strip()
    if not query:
        return None

    alias_map = {
        "بطاطس": "صحن بطاطس",
        "بطاتس": "صحن بطاطس",
        "بطابس": "صحن بطاطس",
        "بطماطس": "صحن بطاطس",
        "ببابس": "صحن بطاطس",
        "فلافل": "فلافل عادي",
        "فلافل عادي": "فلافل عادي",
        "فلافل جبن": "فلافل جبن",
        "برجر": "برجر دجاج",
        "برقر": "برجر دجاج",
        "مطبق جبن": "مطبق جبن",
        "مطبق": "مطبق",
        "latte": "Latte",
        "قهوة": "Latte",
        "مويا": "ماء",
        "موية": "ماء",
    }

    products = list(Product.objects.all())
    names = [p.name for p in products]
    names_lower = [n.lower() for n in names]
    name_tokens = [set(n.split()) for n in names_lower]

    q_norm = _normalize_variants(_normalize_text(query)).lower()
    q_strip = _strip_stopwords(q_norm)
    q_tokens = set(q_strip.split())

    if q_strip in alias_map:
        target = alias_map[q_strip].lower()
        if target in names_lower:
            return products[names_lower.index(target)]

    for token in list(q_tokens):
        if token in alias_map:
            target = alias_map[token].lower()
            if target in names_lower:
                return products[names_lower.index(target)]

    if q_tokens:
        for idx, toks in enumerate(name_tokens):
            if q_tokens.issubset(toks):
                return products[idx]

    for cand in [q_strip, q_norm, query.lower()]:
        if not cand:
            continue
        for i, n in enumerate(names_lower):
            if cand in n:
                return products[i]

    close = get_close_matches(q_strip or q_norm, names_lower, n=1, cutoff=0.55)
    if close:
        idx = names_lower.index(close[0])
        return products[idx]

    return None


def _format_price_reply(p: Product) -> str:
    available = getattr(p, "available", True)
    available_text = "المنتج متوفر حاليًا ✅" if available else "المنتج غير متوفر حاليًا ❌"
    return f"سعر {p.name} {p.price} ريال. {available_text}"


def _default_reply() -> str:
    return (
        "هلا! أقدر أساعدك في الأسعار، التوفر، تتبع/تعديل الطلب، أو إرسال القائمة. "
        "اسألني مثلاً: «كم سعر ساندويتش دجاج مكسيكي؟» أو «عندكم مويا باردة؟» أو «أبغى أضيف برجر»."
    )


def _parse_order_type_and_payment(text: str) -> Tuple[str, str]:
    order_type = "takeaway"
    payment = "cash"
    lower = text.lower()
    if any(k in lower for k in ["محلي", "صالة", "اكل داخل", "أكل داخل"]):
        order_type = "dine_in"
    if any(k in lower for k in ["توصيل", "دليفري", "delivery"]):
        order_type = "delivery"
    if any(k in lower for k in ["بطاقة", "فيزا", "ماستر", "كردت", "مدى", "card"]):
        payment = "card_pos"
    if any(k in lower for k in ["اونلاين", "أونلاين", "online"]):
        payment = "online"
    if any(k in lower for k in ["كاش", "نقد", "نقدي", "cash"]):
        payment = "cash"
    return order_type, payment


def _create_quick_order(user: User, product: Product, qty: int, order_type: str, payment_method: str, note: str = "") -> Optional[Order]:
    qty = max(1, qty)
    price = getattr(product, "price", None)
    price_dec = Decimal(str(price)) if price is not None else Decimal("0")
    total = price_dec * qty
    try:
        with transaction.atomic():
            order = Order.objects.create(
                user=user,
                status="pending",
                payment_method=payment_method,
                payment_status="pending",
                paid=False,
                total=total,
                customer_name=getattr(user, "get_full_name", lambda: "")() or getattr(user, "username", "") or "",
                order_type=order_type,
                delivery=(order_type == "delivery"),
                note=note or "طلب سريع عبر البوت",
            )
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=qty,
                price=price_dec,
            )
        return order
    except Exception:
        logger.exception("Failed to create quick order")
        return None


# ---------- سياق متعدد الرسائل ----------
def _get_user_conversation(user: User) -> Optional[Conversation]:
    if not user or not getattr(user, "is_authenticated", False):
        return None
    return (
        Conversation.objects.filter(customer=user, is_deleted=False)
        .order_by("-created_at")
        .first()
    )


def _parse_ctx_marker(text: str) -> Optional[dict]:
    if not text:
        return None
    cleaned = text.replace(_CTX_PREFIX, "")
    m = re.search(r"\[CTX:([^\]]+)\]", cleaned)
    if not m:
        return None
    parts = m.group(1).split()
    stage = parts[0]
    data = {}
    for part in parts[1:]:
        if "=" in part:
            k, v = part.split("=", 1)
            data[k] = v
    return {"stage": stage, "data": data}


def _last_bot_ctx(conv: Optional[Conversation]) -> Optional[dict]:
    if not conv:
        return None
    last_bot = conv.messages.filter(sender_type="bot").order_by("-created_at").first()
    if not last_bot:
        return None
    return _parse_ctx_marker(last_bot.content)


def _mark_reply(text: str, stage: Optional[str] = None, **data) -> str:
    if not stage:
        return text
    extras = " ".join(f"{k}={v}" for k, v in data.items())
    marker = f"{_CTX_PREFIX}[CTX:{stage}{(' ' + extras) if extras else ''}]"
    return f"{text} {marker}"


def _is_yes(text: str) -> bool:
    lower = text.lower()
    return any(k in lower for k in ["نعم", "ايه", "ايوه", "أيوه", "يب", "yes", "sure", "ارسل", "اي"])


def _is_invoice_request(text: str) -> bool:
    lower = text.lower()
    return any(k in lower for k in ["فاتورة", "الفاتورة", "ارسل الفاتورة", "أرسل الفاتورة", "invoice", "bill"])


def _extract_addon_note(text: str) -> Optional[str]:
    lower = text.lower()
    keywords = ["زيادة", "زود", "زوّد", "بدون", "لا تضيف", "ضيف", "اضف", "إضافة", "إضافات"]
    if any(k in lower for k in keywords):
        return text.strip()
    return None


# ---------- Main bot ----------
def generate_bot_reply(user: Optional[User], content: str) -> str:
    original = content or ""
    text = _normalize_variants(_normalize_text(original))
    lower = text.lower()

    conv = _get_user_conversation(user) if user else None
    ctx = _last_bot_ctx(conv)

    # مسار سياقي لإنشاء الطلب
    if ctx and ctx.get("stage") in {"ASK_PRODUCT", "ASK_TYPE", "ASK_PAY", "ASK_NEXT"}:
        stage = ctx["stage"]
        data = ctx.get("data", {})

        if stage == "ASK_PRODUCT":
            product = _best_product(text)
            qty = _extract_int(text) or int(data.get("qty", 1))
            if product:
                return _mark_reply(
                    f"حددت {qty} × {product.name}. تبيها سفري ولا محلي؟ ولو توصيل اكتب العنوان.",
                    "ASK_TYPE",
                    pid=product.id,
                    qty=qty,
                )
            return _mark_reply("ما قدرت أحدد المنتج. اكتب اسم المنتج والكمية (مثال: بطاطس 2).", "ASK_PRODUCT")

        if stage == "ASK_TYPE":
            pid = data.get("pid")
            qty = int(data.get("qty", "1"))
            if not pid:
                return "ما عندي تفاصيل المنتج. أعد الطلب بذكر المنتج والكمية."
            try:
                product = Product.objects.get(id=pid)
            except Product.DoesNotExist:
                return "المنتج غير موجود حالياً. اختر منتج آخر."
            order_type, _ = _parse_order_type_and_payment(text)
            order_type_text = {"takeaway": "سفري/استلام", "dine_in": "محلي بالصالة", "delivery": "توصيل"}.get(
                order_type, "سفري/استلام"
            )
            return _mark_reply(
                f"تمام، بتكون {order_type_text}. كيف تبي تدفع؟ كاش أو بطاقة أو أونلاين؟",
                "ASK_PAY",
                pid=pid,
                qty=qty,
                order_type=order_type,
            )

        if stage == "ASK_PAY":
            pid = data.get("pid")
            qty = int(data.get("qty", "1"))
            order_type = data.get("order_type", "takeaway")
            if not pid:
                return "ما عندي تفاصيل المنتج. أعد الطلب من جديد بذكر المنتج."
            try:
                product = Product.objects.get(id=pid)
            except Product.DoesNotExist:
                return "المنتج غير موجود حالياً. اختر منتج آخر."
            _, payment_method = _parse_order_type_and_payment(text)
            order = _create_quick_order(
                user=user,
                product=product,
                qty=qty,
                order_type=order_type,
                payment_method=payment_method,
            )
            if not order:
                return "حاولت أسوي الطلب لكن في مشكلة داخلية. جرّب بعد شوي أو اطلب موظف يساعدك."
            order_type_text = {"takeaway": "سفري/استلام", "dine_in": "محلي بالصالة", "delivery": "توصيل"}.get(
                order_type, "سفري/استلام"
            )
            pay_text = {"cash": "كاش", "card_pos": "بطاقة", "online": "أونلاين"}.get(payment_method, "كاش")
            return _mark_reply(
                f"تم إنشاء طلب #{order.id}: {qty} × {product.name}. "
                f"الاستلام: {order_type_text}، الدفع: {pay_text}. "
                "تبي أضيف صنف ثاني، أضيف ملاحظة (مثلاً زيادة جبن)، أو أرسل لك الفاتورة؟",
                "ASK_NEXT",
                order_id=order.id,
            )

        if stage == "ASK_NEXT":
            order_id = data.get("order_id")
            if _is_invoice_request(text):
                return _mark_reply(
                    f"فاتورة الطلب #{order_id}: تقدر تطلع عليها من صفحة الطلبات. إذا حاب أرسلها بالإيميل، عطنا البريد.",
                    "ASK_NEXT",
                    order_id=order_id,
                )
            addon_note = _extract_addon_note(text)
            if addon_note and order_id:
                try:
                    order = Order.objects.get(id=order_id, user=user)
                    order.note = (order.note + " | " if order.note else "") + addon_note
                    order.save(update_fields=["note"])
                except Exception:
                    logger.exception("Failed to add addon note")
                return _mark_reply(
                    f"سجلت ملاحظة: «{addon_note}». تبي أضيف صنف ثاني أو أرسل الفاتورة؟",
                    "ASK_NEXT",
                    order_id=order_id,
                )
            if _is_yes(text):
                return _mark_reply(
                    "اكتب اسم الصنف والكمية (وأي إضافة مثل زيادة جبن أو بدون بصل).",
                    "ASK_PRODUCT",
                )
            return "تم، إذا احتجت أي تعديل أو فاتورة لاحقاً بلغني."

    # تحية
    greeting_tail = (
        "هلا والله 👋، نوَّرت CafeMS Demo! "
        "وش حاب نساعدك فيه؟ تقدر تسأل عن الأسعار، حالة الطلب، توفُّر منتج، أو أي استفسار عن التطبيق أو الموقع."
    )
    if any(k in text for k in ["السلام عليكم", "سلام عليكم", "سلام", "السلام", "عليكم السلام"]):
        return f"وعليكم السلام! {greeting_tail}"
    if "صباح الخير" in text:
        return f"صباح النور 🌅، {greeting_tail}"
    if "مساء الخير" in text:
        return f"مساء النور 🌆، {greeting_tail}"
    if any(k in text for k in ["مرحبا", "مرحباً", "هلا", "هلا والله", "هاي", "الو", "ألو"]):
        return greeting_tail

    # بدء طلب جديد
    order_triggers = [
        "أبغى أطلب",
        "ابي اطلب",
        "ابغى اطلب",
        "سو لي طلب",
        "سوّي لي طلب",
        "أضف",
        "اضف",
        "أبي أضيف",
        "ابغى اضيف",
        "اطلب",
        "طلب",
    ]
    if any(k in lower for k in order_triggers):
        if not user or not getattr(user, "is_authenticated", False):
            return "سجّل دخولك عشان أقدر أسوي الطلب. بعد الدخول اكتب: «أبغى لاتيه 2» أو «أضف برجر دجاج»."
        product = _best_product(text)
        qty = _extract_int(text) or 1
        if product:
            return _mark_reply(
                f"حددت {qty} × {product.name}. تبيها سفري ولا محلي؟ ولو توصيل اكتب العنوان.",
                "ASK_TYPE",
                pid=product.id,
                qty=qty,
            )
        return _mark_reply("تمام، وش اسم المنتج والكمية اللي تبيها؟", "ASK_PRODUCT")

    # حالة الطلب
    if any(k in text for k in ["طلب", "طلبي", "طربي", "وين الطلب", "وين طلبي"]) or "order" in lower:
        order_id = _extract_int(text)
        if order_id is None:
            return "عشان أشيّك على طلبك، اكتب رقم الطلب بهذا الشكل: «وش حالة الطلب 15؟»"
        if not user or not getattr(user, "is_authenticated", False):
            return f"لمتابعة حالة الطلب #{order_id} لازم تكون مسجّل دخول بحسابك اللي طلبت منه."
        try:
            order = Order.objects.get(id=order_id, user=user)
        except Order.DoesNotExist:
            return f"ما لقيت طلب برقم {order_id} مرتبط بحسابك الحالي."
        status_display = getattr(order, "get_status_display", lambda: order.status)()
        total = getattr(order, "total", 0)
        return (
            f"تفاصيل طلبك #{order_id}: الحالة «{status_display}»، الإجمالي {total} ريال. "
            "لو حاب تعدّل أو تلغي قول لي وش المطلوب."
        )

    # إلغاء طلب
    if any(k in lower for k in ["الغاء", "الغاء الطلب", "ألغ الطلب", "cancel"]) and "طلب" in lower:
        order_id = _extract_int(text)
        if order_id is None:
            return "أرسل رقم الطلب عشان أقدر ألغيه (مثال: ألغِ الطلب 12)."
        if not user or not getattr(user, "is_authenticated", False):
            return f"لازم تكون مسجل دخول لإلغاء طلب #{order_id}."
        try:
            order = Order.objects.get(id=order_id, user=user)
        except Order.DoesNotExist:
            return f"ما لقيت طلب برقم {order_id} مرتبط بحسابك."
        if order.status in ["completed", "cancelled"]:
            return f"الطلب #{order_id} حالته {order.status} ولا يمكن تعديله."
        order.status = "cancelled"
        order.save(update_fields=["status"])
        return f"تم إلغاء الطلب #{order_id}. تحتاج أساعدك في إنشاء طلب جديد؟"

    # الأسعار
    if any(k in lower for k in ["سعر", "price", "بكم", "كم سعر", "كم قيمه", "كم قيمة"]):
        q = re.sub(r"^(سعر|price|بكم|كم سعر|كم قيمه|كم قيمة)\s*", "", text, flags=re.IGNORECASE).strip() or text
        p = _best_product(q)
        if p:
            return _format_price_reply(p)
        return "ما قدرت أحدد المنتج. اكتب اسمه كامل، مثلاً: «كم سعر ساندويتش دجاج مكسيكي مع جبن؟»"

    # التوفر
    if any(k in lower for k in ["متوفر", "availability", "available", "فيه", "موجود"]):
        p = _best_product(text)
        if p:
            available = getattr(p, "available", True)
            stock = getattr(p, "stock", None)
            if available:
                stock_text = f"الكمية المتبقية تقريبًا: {stock}" if stock is not None else "متوفر الآن."
                return f"إيه، {p.name} متوفر ✅. {stock_text}"
            return f"للأسف {p.name} غير متوفر حاليًا ❌."
        return "ما لقيت منتج مطابق. جرّب تكتب اسم المنتج بشكل أوضح."

    # القائمة / المنيو
    if any(
        k in lower
        for k in [
            "قائمة",
            "منيو",
            "المنيو",
            "وش عندكم",
            "وش عندكم فطور",
            "ارسل المنيو",
            "ساندويتشات",
            "مشروبات",
        ]
    ):
        return (
            "قائمة CafeMS Demo كاملة تقدر تشوفها من صفحة «القائمة» في التطبيق أو الموقع. "
            "لو حاب ترشيح سريع، قل لي تحب دجاج أو لحم أو فلافل؟ وسبايسي أو عادي؟"
        )

    # الترشيحات / أفضل شيء
    if any(
        k in lower
        for k in ["وش تنصح", "تنصحني", "افضل شي", "أفضل شي", "أكثر شيء مبيع", "الاكثر مبيع", "top"]
    ):
        return (
            "من الأشياء اللي يمشون كثير عندنا: ساندوتش دجاج مكسيكي مع جبن، "
            "وبرجر دجاج جبن، ومعهم شاي كرك أو لاتيه. "
            "تبي أرشح لك حسب ذوقك؟ قل لي تحب دجاج/لحم وسبايسي أو عادي."
        )

    # أوقات العمل
    if any(
        k in lower
        for k in ["متى تفتحون", "متى تفتح", "متى تسكرون", "أوقات العمل", "دوامكم", "مواعيد العمل"]
    ):
        return (
            "دوام CafeMS Demo عادة من الصباح إلى الليل (قد يختلف حسب الفرع). "
            "تقدر تشوف أوقات العمل الدقيقة من صفحة «اتصل بنا» أو من إعدادات الفرع في التطبيق."
        )

    # الموقع / الفروع
    if any(
        k in lower
        for k in ["وين موقعكم", "وين الفرع", "عنوانكم", "موقع الكافيه", "الموقع", "العنوان"]
    ):
        return (
            "نستقبل الطلبات عن طريق الموقع/التطبيق مع خدمة توصيل في نطاق محدد. "
            "تقدر تشوف موقعنا ومعلومات التواصل من صفحة «اتصل بنا» في الموقع."
        )

    # تعديل طلب
    if any(k in lower for k in ["عدل", "تعديل", "شيل", "احذف", "زود", "زوّد", "غير", "غيّر"]):
        return (
            "وش التعديل اللي حاب تسويه؟ اكتب المنتج والتغيير المطلوب، "
            "مثلاً: «زود جبن على ساندويتش الدجاج»، أو «شيل مويا من الطلب»."
        )

    # الشروط والأحكام
    if any(k in lower for k in ["شروط", "أحكام", "احكام", "سياسة الموقع", "الشروط والاحكام", "الشروط والأحكام"]):
        return (
            "مختصر الشروط: بعد تأكيد الطلب لازم تستلمه وتدفع المبلغ المستحق. "
            "ممكن يتم إلغاء الطلب لو المنتج غير متوفر أو فيه خطأ واضح بالسعر، أو لو ما قدرنا نتواصل معك. "
            "تقدر تطلع على الشروط كاملة من صفحة «الشروط والأحكام» في الموقع."
        )

    # الخصوصية
    if any(k in lower for k in ["الخصوصية", "بياناتي", "سياسة الخصوصية", "privacy"]):
        return (
            "نحترم خصوصيتك، ونستخدم بياناتك مثل الاسم ورقم الجوال وعناوين التوصيل لإدارة الطلبات والتواصل معك فقط. "
            "ما نبيع بياناتك لأي طرف ثالث، ونشارك جزء بسيط مع شركات التوصيل أو الدفع بالقدر اللازم لتنفيذ الخدمة، "
            "مع تطبيق إجراءات لحماية بياناتك."
        )

    # الشكاوى / الملاحظات
    if any(k in lower for k in ["شكوى", "ملاحظة", "ناقص", "غلط", "بارد", "سيئ", "سيء", "تأخر", "تأخير"]):
        return (
            "آسفين على التجربة 🙏 خلنا نصلحها لك. "
            "اكتب رقم الطلب ووصف بسيط للمشكلة (مثلاً: ناقص مشروب، التوصيل تأخر، الأكل بارد). "
            "نقدر بعد كذا نحولك لموظف لو حاب متابعة مباشرة."
        )

    # شكر / ختام
    if any(k in lower for k in ["شكرا", "شكراً", "يعطيك العافية", "يعطيكم العافية", "تسلم", "يعطيك", "مشكور"]):
        return "الله يعافيك ويسعدك 🤍، متى ما احتجت شي أنا حاضر. تحب أرسل لك المنيو أو حالة طلبك؟"

    # رد افتراضي
    return _default_reply()


def should_handover_to_human(content: str) -> bool:
    text = (content or "").strip().lower()
    trigger_phrases = [
        "اكلم موظف",
        "أكلم موظف",
        "ابي موظف",
        "أبي موظف",
        "ابغى موظف",
        "أبغى موظف",
        "ابغى اكلم",
        "أبغى أكلم",
        "احتاج موظف",
        "محتاج موظف",
        "رد بشري",
        "رد انساني",
        "رد إنساني",
        "human",
        "real person",
        "talk to human",
        "support agent",
    ]
    return any(p in text for p in trigger_phrases)

