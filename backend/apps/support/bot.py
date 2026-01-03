import re
from difflib import get_close_matches
from typing import Optional

from django.contrib.auth import get_user_model

from apps.orders.models import Order
from apps.products.models import Product

User = get_user_model()


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
    cleaned = re.sub(r"[!?.,؛،]", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _normalize_variants(text: str) -> str:
    if not text:
        return ""
    normalized = text
    # توحيد كتابة ساندويتش
    normalized = re.sub(r"ساند[وي]تش", "ساندويتش", normalized, flags=re.IGNORECASE)
    normalized = normalized.replace("صندويتش", "ساندويتش")

    # مرادفات/اختصارات شائعة
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
        "قهوة": "Latte",  # لو القهوة الأساسية لاتيه
    }
    for k, v in variant_map.items():
        normalized = re.sub(k, v, normalized, flags=re.IGNORECASE)

    return normalized


def _strip_stopwords(query: str) -> str:
    # كلمات ربط/حشو شائعة باللهجة السعودية والخليجية
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

    # مرادفات مبنية على المنيو
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

    # alias مباشر
    if q_strip in alias_map:
        target = alias_map[q_strip].lower()
        if target in names_lower:
            return products[names_lower.index(target)]

    # alias على مستوى كلمة واحدة
    for token in list(q_tokens):
        if token in alias_map:
            target = alias_map[token].lower()
            if target in names_lower:
                return products[names_lower.index(target)]

    # مطابقة tokens فرعية
    if q_tokens:
        for idx, toks in enumerate(name_tokens):
            if q_tokens.issubset(toks):
                return products[idx]

    # substring matching
    for cand in [q_strip, q_norm, query.lower()]:
        if not cand:
            continue
        for i, n in enumerate(names_lower):
            if cand in n:
                return products[i]

    # fuzzy matching
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


# ---------- Main bot ----------
def generate_bot_reply(user: Optional[User], content: str) -> str:
    original = content or ""
    text = _normalize_variants(_normalize_text(original))
    lower = text.lower()

    greeting_tail = (
        "هلا والله 👋، نوَّرت CafeMS Demo! "
"وش حاب نساعدك فيه؟ تقدر تسأل عن الأسعار، حالة الطلب، توُّفر منتج، أو أي استفسار عن التطبيق أو الموقع."
    )

    # تحية سلام
    salam_keywords = ["السلام عليكم", "سلام عليكم", "سلام", "السلام", "عليكم السلام"]
    if any(k in text for k in salam_keywords):
        return f"وعليكم السلام! {greeting_tail}"

    # صباح/مساء
    if "صباح الخير" in text:
        return f"صباح النور 🌅، {greeting_tail}"
    if "مساء الخير" in text:
        return f"مساء النور 🌆، {greeting_tail}"

    greetings = [
        "مرحبا",
        "مرحباً",
        "هلا",
        "هلا والله",
        "هاي",
        "الو",
        "ألو",
    ]
    if any(k in text for k in greetings):
        return greeting_tail

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

    # سؤال عن السعر
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

    # إنشاء طلب
    if any(
        k in lower
        for k in ["أبغى أطلب", "ابي اطلب", "ابغى اطلب", "سو لي طلب", "سوّي لي طلب", "أضف", "اضف", "أبي أضيف", "ابغى اضيف"]
    ):
        return (
            "تمام، خل نضبط طلبك ✅\n"
            "اكتب لي اسم المنتج والعدد، مثلاً: «ساندوتش دجاج مكسيكي مع جبن ٢» أو «فلافل عادي وحبتين موية».\n"
            "بعدها أرسل لك ملخص الطلب قبل التأكيد."
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

