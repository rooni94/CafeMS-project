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


def _contains_any(text: str, phrases: list[str]) -> bool:
    """مساعدة بسيطة للتحقق إذا أي جملة من القائمة موجودة في النص"""
    if not text:
        return False
    return any(p in text for p in phrases)


def generate_bot_reply(user: User, content: str) -> str:
    """
    من هنا نجاوب الأسئلة التقليدية آليًا، بلهجة سعودية خفيفة:

    - حالة الطلب / مشاكل الطلب (تأخير، إلغاء، تعديل)
    - الأسعار
    - توفر المنتجات
    - المنيو والعروض
    - أوقات العمل
    - الموقع / الفروع
    - طرق الدفع
    - مشاكل التطبيق / الموقع
    - ترحيب وأسئلة عامة
    """
    original = content or ""
    text = original.strip()
    text_lower = text.lower()

    # ====== رد افتراضي (fallback) ======
    default_reply = (
        "حياك الله 🤍\n"
        "جاوبتك باللي يقدر عليه النظام الآلي.\n"
        "لو تحتاج شيء أدق أو حالة خاصة، نقدر نحول محادثتك لموظف الدعم يتابع معك.\n\n"
        "تقدر تسألنا عن أشياء مثل:\n"
        "- حالة طلبك: اكتب مثلاً «وش وضع الطلب 15» أو «ما حالة الطلب 15»\n"
        "- سعر منتج: «كم سعر ساندويتش دجاج مكسيكي؟»\n"
        "- توفر منتج: «هل شاي كرك متوفر؟»\n"
        "- أوقات العمل أو الموقع: «متى تفتحون؟» أو «وين موقعكم؟»\n"
        "- مشاكل في التطبيق أو الموقع: «التطبيق يعلق»، «ما يطلع لي كود التحقق»\n"
    )

    # ====== 1) ترحيب / تحية عامة ======
    if _contains_any(
        original,
        [
            "هلا",
            "هلا والله",
            "مرحبا",
            "مرحبا بك",
            "السلام عليكم",
            "السلام عليكم ورحمة الله",
            "صباح الخير",
            "مساء الخير",
        ],
    ):
        return (
            "هلا وسهلا فيك 👋\n"
            "معك دعم CafeMS Demo.\n"
            "اكتب لنا مشكلتك أو استفسارك (عن طلب، منيو، أوقات العمل، أو مشكلة في التطبيق)\n"
            "وبنحاول نساعدك بأسرع وقت ممكن 🤍"
        )

    # ====== 2) الطلبات: حالة / تأخير / إلغاء / تعديل ======
    has_order_word = ("طلب" in original) or ("order" in text_lower)
    cancel_words = ["الغاء", "إلغاء", "ألغي", "ألغى", "الغى", "كنسل", "إلغاء الطلب"]
    edit_words = ["تعديل", "أعدل", "اعدل", "أغير", "تغيير", "غيّر", "غير في الطلب"]
    delay_words = [
        "تأخر",
        "تاخر",
        "تأخير",
        "طول",
        "طولت",
        "ما وصل",
        "ماوصل",
        "ما جاني",
        "ماجاني",
        "ما استلمت",
    ]

    if has_order_word:
        order_id = _extract_int(original)

        # 2.1) طلب إلغاء
        if _contains_any(original, cancel_words):
            if order_id is None:
                return (
                    "فهمت إنك حاب تلغي طلبك 🙏\n"
                    "عشان أقدر أساعدك، اكتب رقم الطلب زي كذا:\n"
                    "«أبي ألغي الطلب 15» أو «الغاء الطلب 15».\n"
                    "لو الطلب لسه ما بدأ التجهيز، غالباً نقدر نساعدك في الإلغاء عن طريق فريق الدعم."
                )

            # نرجع حالة الطلب بشكل عام + توجيه للإلغاء
            try:
                order = Order.objects.get(id=order_id, user=user)
            except Order.DoesNotExist:
                return (
                    f"ما لقيت طلب برقم {order_id} مربوط بحسابك الحالي 👀\n"
                    "تأكد من رقم الطلب أو من إنك داخل نفس الحساب اللي سويت منه الطلب."
                )

            status_display = getattr(order, "get_status_display", lambda: order.status)()
            total = getattr(order, "total", 0)
            return (
                f"طلبك رقم {order_id}:\n"
                f"- الحالة الحالية: {status_display}\n"
                f"- الإجمالي: {total} ر.س\n\n"
                "بخصوص الإلغاء: أغلب الوقت نقدر نلغي الطلب إذا لسه ما دخل مرحلة التجهيز أو التوصيل.\n"
                "لو حاب نتابع معك يدويًا، قل: «أبي أكلم موظف» عشان نحول محادثتك لفريق الدعم."
            )

        # 2.2) طلب تعديل
        if _contains_any(original, edit_words):
            if order_id is None:
                return (
                    "تمام، تبي تعدّل على طلبك 👍\n"
                    "اكتب رقم الطلب مع التعديل اللي تبغاه، مثال:\n"
                    "«أبي أعدل الطلب 15 وأشيل الجبن».\n"
                    "بنشيك إذا الطلب يسمح بالتعديل، وإذا يحتاج تدخل موظف نبلّغ فريق الدعم."
                )

            try:
                order = Order.objects.get(id=order_id, user=user)
            except Order.DoesNotExist:
                return (
                    f"ما قدرت ألقى طلب برقم {order_id} مرتبط بحسابك.\n"
                    "تأكد من رقم الطلب أو الحساب اللي طلبت منه."
                )

            status_display = getattr(order, "get_status_display", lambda: order.status)()
            return (
                f"بالنسبة لطلبك رقم {order_id} (حالته: {status_display}):\n"
                "- لو الطلب لسه في البداية، غالباً نقدر نساعدك في التعديل.\n"
                "- لو الطلب في مرحلة متقدمة من التجهيز أو التوصيل، ممكن يحتاج تدخل موظف.\n\n"
                "اكتب التعديل اللي تبغاه بالضبط، ولو احتجنا نحول الطلب لموظف بنعلّمك 🤍"
            )

        # 2.3) تأخير / ما وصل الطلب
        if _contains_any(original, delay_words):
            if order_id is None:
                return (
                    "آسفين إذا حسيت إن الطلب تأخر عليك 🙏\n"
                    "عشان نقدر نطمنك، اكتب رقم الطلب بالشكل هذا:\n"
                    "«وش وضع الطلب 15؟» أو «الطلب 15 تأخر»."
                )

            try:
                order = Order.objects.get(id=order_id, user=user)
            except Order.DoesNotExist:
                return (
                    f"ما لقيت طلب برقم {order_id} مرتبط بحسابك.\n"
                    "تأكد من الرقم أو الحساب، ولو استمرت المشكلة قل: «أبي أكلم موظف»."
                )

            status_display = getattr(order, "get_status_display", lambda: order.status)()
            total = getattr(order, "total", 0)
            return (
                f"شيّكت على طلبك رقم {order_id} 👀\n"
                f"- الحالة الحالية في النظام: {status_display}\n"
                f"- الإجمالي: {total} ر.س\n\n"
                "لو تشوف إن التأخير مو منطقي أو الطلب متوقف على حالة معينة، "
                "علمنا ونحولك لموظف يتابع مع شركة التوصيل أو التجهيز."
            )

        # 2.4) حالة الطلب العادية
        if order_id is None:
            return (
                "عشان أقدر أشيّك على حالة طلبك، اكتب رقم الطلب.\n"
                "مثال: «ما حالة الطلب 15» أو «وش وضع الطلب 15؟»"
            )

        try:
            order = Order.objects.get(id=order_id, user=user)
        except Order.DoesNotExist:
            return (
                f"ما لقيت طلب برقم {order_id} مربوط بحسابك.\n"
                "تأكد من رقم الطلب أو من الحساب اللي طلبت منه."
            )

        status_display = getattr(order, "get_status_display", lambda: order.status)()
        total = getattr(order, "total", 0)
        return (
            f"تحديث طلبك رقم {order_id} 👌\n"
            f"- الحالة الحالية: {status_display}\n"
            f"- الإجمالي: {total} ر.س\n"
        )

    # ====== 3) الأسعار / المنتجات ======
    if ("سعر" in original) or ("price" in text_lower):
        # نحاول نقتبس اسم المنتج من النص
        qs = Product.objects.filter(name__icontains=original).order_by("name")
        if not qs.exists():
            parts = re.split(r"سعر|price", original, flags=re.IGNORECASE)
            if len(parts) > 1:
                keyword = parts[1].strip()
                if keyword:
                    qs = Product.objects.filter(name__icontains=keyword)

        if qs.exists():
            p = qs.first()
            available_text = "متوفر حاليًا" if getattr(p, "available", True) else "غير متوفر حاليًا"
            return (
                f"سعر '{p.name}' هو {p.price} ر.س ✅\n"
                f"حالة المنتج: {available_text}."
            )
        else:
            return (
                "ما قدرت أحدد المنتج اللي تقصده 😅\n"
                "اكتب اسم المنتج بشكل واضح، مثال:\n"
                "«كم سعر ساندويتش دجاج مكسيكي؟»"
            )

    # ====== 4) التوفر ======
    if ("متوفر" in original) or ("available" in text_lower):
        qs = Product.objects.filter(name__icontains=original)
        if qs.exists():
            p = qs.first()
            if getattr(p, "available", True):
                stock = getattr(p, "stock", None)
                if stock is not None:
                    return f"المنتج '{p.name}' متوفر حاليًا ✅\nالكمية في المخزون تقريبًا: {stock}."
                return f"المنتج '{p.name}' متوفر حاليًا ✅."
            else:
                return f"المنتج '{p.name}' غير متوفر حاليًا للأسف 😔."
        return (
            "ما لقيت منتج مطابق في المنيو.\n"
            "حاول تكتب اسم المنتج بشكل أوضح، مثال:\n"
            "«هل شاي كرك متوفر؟»"
        )

    # ====== 5) المنيو / الأصناف / العروض ======
    if _contains_any(
        original,
        [
            "منيو",
            "المنيو",
            "قائمة",
            "القائمة",
            "وش عندكم",
            "الأصناف",
            "الاصناف",
            "الساندوتشات",
            "الفطور",
            "فطور",
            "menu",
        ],
    ):
        return (
            "بالنسبة للمنيو 🤍\n"
            "تقدر تشوف القائمة كاملة مع الأسعار والصور من قسم «المنيو» داخل التطبيق أو الموقع.\n"
            "حالياً نقدم تشكيلة فطور، ساندوتشات، ومشروبات ساخنة وباردة.\n"
            "لو حاب تعرف سعر أو تفاصيل طبق معين، اكتب اسمه بالضبط ونساعدك فيه."
        )

    if _contains_any(
        original,
        ["عرض", "العروض", "خصم", "كوبون", "كوپن", "كود خصم", "promo", "discount", "coupon"],
    ):
        return (
            "بخصوص العروض والكوبونات 🎉\n"
            "لو عندك كود خصم، تقدر تدخله في صفحة إنهاء الطلب وبيتم تطبيقه إذا كان ساري.\n"
            "ولو فيه عروض حالية، راح تلاقيها واضحة في واجهة التطبيق أو في صفحة المنيو.\n"
            "تابعنا بشكل مستمر عشان ما يفوتك شيء 😉"
        )

    # ====== 6) ساعات العمل ======
    if _contains_any(
        original,
        ["مواعيد", "ساعات", "ساعة", "متى تفتحون", "متى تقفلون", "open", "مفتوح", "الدوام"],
    ):
        return (
            "ساعات العمل الحالية لCafeMS Demo ⏰\n"
            "- نفتح يوميًا من 6:00 صباحًا إلى 11:00 مساءً.\n"
            "لو صار أي تغيير في الأوقات (مواسم / إجازات)، نحدّثها داخل التطبيق ووسائل التواصل الاجتماعية."
        )

    # ====== 7) الموقع / الفروع ======
    if _contains_any(
        original,
        [
            "وينكم",
            "وين موقعكم",
            "موقعكم",
            "العنوان",
            "الفرع",
            "فرعكم",
            "فروعكم",
            "location",
            "loc",
            "map",
            "خرائط",
        ],
    ):
        return (
            "بخصوص الموقع والفروع 📍\n"
            "تقدر تلاقي موقع الكافتيريا بالضبط من صفحة «عن الكافتيريا» أو «تواصل معنا» داخل التطبيق.\n"
            "تم تجهيز الرابط بحيث يفتح لك الموقع على خرائط بشكل مباشر.\n"
            "لو حاب توضيح أكثر، اكتب لنا المدينة والحي اللي أنت فيه ونوضح لك أقرب نقطة خدمة."
        )

    # ====== 8) طرق الدفع ======
    if _contains_any(
        original,
        [
            "طريقة الدفع",
            "كيف أدفع",
            "كيف ادفع",
            "الدفع",
            "مدى",
            "فيزا",
            "ماستر",
            "ماستركارد",
            "آبل باي",
            "ابل باي",
            "apple pay",
            "كاش",
            "نقدي",
            "دفع عند الاستلام",
            "cash",
            "payment",
        ],
    ):
        return (
            "طرق الدفع المتاحة حاليًا 💳\n"
            "- بطاقات مدى وبطاقات الائتمان (فيزا/ماستركارد) عن طريق التطبيق أو الموقع.\n"
            "- آبل باي في حال كانت مفعّلة عندك على الجهاز.\n"
            "- الدفع عند الاستلام (في حال كان متوفر في منطقتك).\n"
            "لو واجهتك مشكلة في إتمام عملية الدفع، صور رسالة الخطأ وأرسلها لنا."
        )

    # ====== 9) مشاكل في التطبيق أو الموقع ======
    if _contains_any(
        original,
        [
            "التطبيق",
            "البرنامج",
            "الموقع",
            "ما يفتح",
            "مايفتح",
            "يعلق",
            "يهنق",
            "علق",
            "ما يشتغل",
            "مايشتغل",
            "ما يدخل",
            "مايدخل",
            "تسجيل الدخول",
            "نسيت كلمة السر",
            "نسيت الباسورد",
            "كود التحقق",
            "ما وصلني الكود",
            "ماجاني الكود",
        ],
    ):
        return (
            "واضح إن عندك مشكلة تقنية في التطبيق أو الموقع 🔧\n"
            "جرّب أولاً:\n"
            "- تقفل التطبيق وتفتحه من جديد.\n"
            "- تتأكد من الاتصال بالإنترنت.\n"
            "- لو المشكلة مستمرة، صور الشاشة (Screenshot) وأرسلها لنا مع نوع جهازك (آيفون/أندرويد) ونوع المتصفح لو كنت على موقع.\n"
            "وبعدها نقدر نحول مشكلتك للفريق المختص لو احتاج الأمر."
        )

    # ====== 10) fallback (ما انطبقت ولا حالة) ======
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
        "ممكن موظف",
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
