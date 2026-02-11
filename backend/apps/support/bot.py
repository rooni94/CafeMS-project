import logging
import re
from decimal import Decimal
from difflib import get_close_matches
from typing import Optional, Tuple, List, Dict

from django.contrib.auth import get_user_model
from django.db import transaction

from apps.orders.models import Order, OrderItem
from apps.products.models import Product
from apps.support.models import Conversation
from .dialogue import DialogueResult, detect_intent, handle_no_ctx, handle_yes_like, SMALL_TALK, COMPLAINTS

logger = logging.getLogger(__name__)
User = get_user_model()

# ترميز سياق مخفي لا يظهر للعميل
_CTX_MARK = "\u2063"
_BIT0 = "\u200b"
_BIT1 = "\u200c"

YES_LIKE = {"نعم", "اي", "ايه", "ايوه", "أجل", "تمام", "اوكي", "أوكي", "طيب", "yes", "sure", "ok", "okay"}
NO_LIKE = {"لا", "مو", "مابي", "الغ", "وقف", "no", "not"}
INVOICE_WORDS = ["فاتورة", "ارسال الفاتورة", "أرسل الفاتورة", "ارسل الفاتورة", "وصل", "الفاتورة", "الفاتوره", "وصل الطلب", "invoice", "bill"]
GRATITUDE_WORDS = {"شكرا", "شكراً", "مشكور", "تسلم", "يعطيك العافية", "الله يعافيك"}
ADDON_HINT = ["زيادة", "اضافة", "إضافة", "بدون", "شيل", "لا تحط", "ملاحظة", "ملاحظه", "اضف", "زيادة جبن", "بدون بصل"]
ORDER_TRIGGERS = ["اطلب", "طلب", "ابغى اطلب", "أبغى اطلب", "ابغى اضيف طلب", "أبغى أضيف طلب", "طلب جديد", "سوي طلب", "أريد طلب", "اضافة طلب"]

PRODUCT_ALIASES: Dict[str, List[str]] = {
    "?????": ["?????", "?????", "????? ????", "?????", "???"],
    "????": ["????", "??????", "????", "????", "???? ????", "???? ???"],
    "??????": ["??????", "??????", "?????? ????", "?????? ???"],
    "????": ["????", "?????", "????????", "??????", "latte", "coffee"],
    "???": ["????", "?????", "???", "???", "????", "??? ????"],
    "?????": ["?????", "???????? ?????", "??????? ?????", "??????? ?????", "??? ?????"],
}
# ========= ترميز/فك سياق =========
def _encode_ctx(stage: str, data: dict) -> str:
    payload = stage + "|" + ";".join(f"{k}={v}" for k, v in data.items())
    bits = "".join(f"{b:08b}" for b in payload.encode("utf-8"))
    hidden = "".join(_BIT0 if bit == "0" else _BIT1 for bit in bits)
    return f"{_CTX_MARK}{hidden}{_CTX_MARK}"


def _decode_ctx(text: str) -> Optional[dict]:
    if not text:
        return None
    start = text.find(_CTX_MARK)
    if start == -1:
        return None
    end = text.find(_CTX_MARK, start + 1)
    if end == -1:
        return None
    hidden = text[start + 1 : end]
    bits = []
    for ch in hidden:
        if ch == _BIT0:
            bits.append("0")
        elif ch == _BIT1:
            bits.append("1")
    if not bits or len(bits) % 8 != 0:
        return None
    try:
        data_bytes = bytes(int("".join(bits[i : i + 8]), 2) for i in range(0, len(bits), 8))
        payload = data_bytes.decode("utf-8")
    except Exception:
        return None
    if "|" not in payload:
        return None
    stage, rest = payload.split("|", 1)
    data = {}
    for part in rest.split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            data[k] = v
    return {"stage": stage, "data": data}


def _mark_reply(text: str, stage: Optional[str] = None, **data) -> str:
    if not stage:
        return text
    return f"{text}{_encode_ctx(stage, data)}"


# ========= نصوص =========
def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _extract_int(text: str) -> Optional[int]:
    m = re.search(r"\d+", text or "")
    if not m:
        return None
    try:
        return int(m.group(0))
    except ValueError:
        return None


def _extract_budget(text: str) -> Optional[int]:
    nums = re.findall(r"\d+", text or "")
    if not nums:
        return None
    try:
        return int(nums[0])
    except ValueError:
        return None


def _is_yes(text: str) -> bool:
    lower = (text or "").lower()
    return any(word in lower for word in YES_LIKE)


def _is_no(text: str) -> bool:
    lower = (text or "").lower()
    return any(word in lower for word in NO_LIKE)


def _is_invoice_request(text: str) -> bool:
    lower = (text or "").lower()
    return any(word in lower for word in INVOICE_WORDS)


def _extract_addon_note(text: str) -> Optional[str]:
    lower = (text or "").lower()
    if any(k in lower for k in ADDON_HINT):
        return _normalize(text)
    return None


def _extract_dine_type(lower: str) -> Optional[str]:
    if any(k in lower for k in ["محلي", "هنا", "بالصالة", "داخل", "جلسة"]):
        return "dine_in"
    if any(k in lower for k in ["سفري", "تيك", "تيك اواي", "تيك اوي", "takeaway", "استلام"]):
        return "takeaway"
    if any(k in lower for k in ["توصيل", "وصل", "دليفري", "توصيل طلب", "توصيلها"]):
        return "delivery"
    return None


def _extract_payment(lower: str) -> Optional[str]:
    if any(k in lower for k in ["كاش", "نقد", "نقدي"]):
        return "cash"
    if any(k in lower for k in ["شبكة", "بطاقة", "مدى", "فيزا", "visa", "mastercard"]):
        return "card_pos"
    if any(k in lower for k in ["أونلاين", "اونلاين", "apple pay", "stc", "stc pay", "مدى الرقمية", "محفظة"]):
        return "online"
    return None


# ========= البحث عن منتجات =========
def _best_product(query: str) -> Optional[Product]:
    query_norm = _normalize(query).lower()
    if not query_norm:
        return None

    products = list(Product.objects.all())
    if not products:
        return None
    names_lower = [p.name.lower() for p in products]

    for target, words in PRODUCT_ALIASES.items():
        if any(w in query_norm for w in words):
            for idx, name in enumerate(names_lower):
                if target in name or any(word in name for word in words):
                    return products[idx]

    for idx, name in enumerate(names_lower):
        if query_norm in name:
            return products[idx]

    close = get_close_matches(query_norm, names_lower, n=1, cutoff=0.55)
    if close:
        return products[names_lower.index(close[0])]
    return None


def _recommend_by_budget(budget: Optional[int], hot: bool = False) -> Optional[Product]:
    products = list(Product.objects.all())
    if not products:
        return None
    filtered = [p for p in products if getattr(p, "price", None) is not None]
    if budget is not None:
        filtered = [p for p in filtered if Decimal(str(p.price)) <= Decimal(budget)]
    if hot:
        filtered = [p for p in filtered if "حار" in p.name or "سبايسي" in p.name or "spicy" in p.name.lower()]
    if not filtered:
        filtered = [p for p in products if getattr(p, "price", None) is not None]
    filtered.sort(key=lambda x: Decimal(str(x.price)))
    return filtered[0] if filtered else None


def _top_sellers(limit: int = 3) -> List[str]:
    products = list(Product.objects.all())
    products.sort(key=lambda p: Decimal(str(getattr(p, "price", 0) or 0)))
    return [p.name for p in products[:limit]]


# ========= إنشاء طلبات =========
def _create_quick_order(
    user: Optional[User],
    product: Product,
    qty: int,
    order_type: str,
    payment_method: str,
    note: str = "",
    delivery_address: str = "",
) -> Optional[Order]:
    qty = max(1, qty)
    price = getattr(product, "price", None)
    price_dec = Decimal(str(price)) if price is not None else Decimal("0")
    total = price_dec * qty
    try:
        with transaction.atomic():
            kwargs = dict(
                user=user if user and getattr(user, "is_authenticated", False) else None,
                status="pending",
                payment_method=payment_method or "cash",
                payment_status="pending",
                paid=False,
                total=total,
                order_type=order_type or "takeaway",
                delivery=(order_type == "delivery"),
                delivery_address=delivery_address or "",
                note=note or "",
            )
            try:
                kwargs["customer_name"] = getattr(user, "get_full_name", lambda: "")() or getattr(user, "username", "")
                order = Order.objects.create(**kwargs)
            except Exception:
                kwargs.pop("customer_name", None)
                order = Order.objects.create(**kwargs)

            OrderItem.objects.create(order=order, product=product, quantity=qty, price=price_dec)
        return order
    except Exception:
        logger.exception("Failed to create quick order")
        return None


def _add_item_to_order(order: Order, product: Product, qty: int, note: Optional[str] = None) -> None:
    qty = max(1, qty)
    price_dec = Decimal(str(getattr(product, "price", 0) or 0))
    OrderItem.objects.create(order=order, product=product, quantity=qty, price=price_dec)
    order.total = (order.total or Decimal("0")) + price_dec * qty
    if note:
        order.note = (order.note + " | " if order.note else "") + note
    order.save(update_fields=["total", "note", "updated_at"])


def _format_invoice_hint(order_id: int) -> str:
    return (
        f"أرسل لك الفاتورة للطلب #{order_id}. تقدر تتابع الطلب وتشوف الفاتورة من صفحة تتبع الطلب: "
        f"https://example.invalid/order-tracking?order={order_id} أو من صفحة الطلبات."
    )


# ========= سياق المحادثة =========
def _get_user_conversation(user: Optional[User], conversation: Optional[Conversation] = None) -> Optional[Conversation]:
    if conversation:
        return conversation
    if not user or not getattr(user, "is_authenticated", False):
        return None
    return (
        Conversation.objects.filter(customer=user, is_deleted=False, is_closed=False)
        .order_by("-created_at")
        .first()
    )


def _last_bot_ctx(conv: Optional[Conversation]) -> Optional[dict]:
    if not conv:
        return None
    last_bot = conv.messages.filter(sender_type="bot").order_by("-created_at").first()
    if not last_bot:
        return None
    return _decode_ctx(last_bot.content)


def _get_order(order_id: Optional[str], user: Optional[User]) -> Optional[Order]:
    if not order_id:
        return None
    qs = Order.objects.filter(id=int(order_id))
    if user and getattr(user, "is_authenticated", False):
        qs = qs.filter(user=user)
    return qs.first()


def _default_reply() -> str:
    top = ", ".join(_top_sellers())
    return (
        "هلا! أقدر أساعدك في الطلبات، الأسعار، والتوصيل. "
        "تقدر تقول: «ابغى اطلب برجر»، «اقترح لي وجبة ب١٠ ريال»، أو «وين وصل طلبي؟». "
        f"الأكثر مبيعاً عندنا: {top}."
    )


# ========= المنطق الرئيسي =========
def generate_bot_reply(user: Optional[User], content: str, conversation: Optional[Conversation] = None) -> str:
    original = content or ""
    text = _normalize(original)
    lower = text.lower()

    conv = _get_user_conversation(user, conversation)
    ctx = _last_bot_ctx(conv)
    ctx_stage = ctx.get("stage") if ctx else None
    ctx_data = ctx.get("data", {}) if ctx else {}

    # ردود تحية مخصصة (مع الحفاظ على السياق إن وجد)
    if any(k in text for k in ["السلام عليكم", "سلام", "سلام عليكم"]):
        reply = "وعليكم السلام ورحمة الله، هلا والله! وش تحب أساعدك فيه؟ تبغى تطلب ولا عندك استفسار؟"
        if ctx_stage:
            return _mark_reply(reply, ctx_stage, **(ctx_data or {}))
        return _mark_reply(reply, "ASK_PRODUCT", data={})
    if "صباح الخير" in text:
        reply = "صباح النور والسرور 🌅 هلا والله! وش حاب تطلب أو تستفسر عنه؟"
        if ctx_stage:
            return _mark_reply(reply, ctx_stage, **(ctx_data or {}))
        return _mark_reply(reply, "ASK_PRODUCT", data={})
    if "مساء الخير" in text:
        reply = "مساء النور 🌙 هلا والله! وش ودّك أساعدك فيه؟"
        if ctx_stage:
            return _mark_reply(reply, ctx_stage, **(ctx_data or {}))
        return _mark_reply(reply, "ASK_PRODUCT", data={})

    # معالجة نوايا عالية الأولوية حتى لو كان هناك سياق
    if ctx_stage:
        intent = detect_intent(text)

        if intent in (
            "greeting",
            "smalltalk_howareyou",
            "smalltalk_joke",
            "smalltalk_weather",
            "smalltalk_time",
            "smalltalk_meaning",
            "smalltalk_personal",
        ):
            reply = SMALL_TALK.get(intent, SMALL_TALK["greeting"])
            return _mark_reply(reply, ctx_stage, **(ctx_data or {}))

        if intent == "thanks":
            return _mark_reply(
                "العفو يا بعدي 🌟 إذا تبغى نكمل الطلب علّمني وش تختار.",
                ctx_stage,
                **(ctx_data or {}),
            )

        if intent == "goodbye":
            return "في أمان الله 👋 متى ما احتجت شي أنا حاضر."

        if intent == "cancel_order" or any(k in lower for k in ["الغاء", "الغي", "الغيه", "كنسل", "ألغ", "الغاء الطلب", "ابغى الغي"]):
            return _mark_reply(
                "تم 👍 عطنا رقم الطلب عشان ألغيه لك. وإذا ما عندك رقم، قلّي الاسم ووقت الطلب.",
                "ASK_EDIT_ID",
            )

        if intent == "track_order":
            return _mark_reply(
                "أكيد 👍 عطني رقم الطلب أو رقم جوالك اللي طلبت فيه وبشيّك لك.",
                "ASK_EDIT_ID",
            )

        if intent == "complaint_delay":
            return _mark_reply(COMPLAINTS["delay"], "COMPLAINT", issue="delay")
        if intent == "complaint_wrong":
            return _mark_reply(COMPLAINTS["wrong"], "COMPLAINT", issue="wrong")
        if intent == "complaint_cold":
            return _mark_reply(COMPLAINTS["cold"], "COMPLAINT", issue="cold")
        if intent == "complaint_quality":
            return _mark_reply(COMPLAINTS["quality"], "COMPLAINT", issue="quality")

    # سياق سابق
    if ctx:
        stage = ctx_stage
        data = ctx_data

        if stage == "ASK_PRODUCT":
            product = _best_product(text)
            qty = _extract_int(text) or int(data.get("qty", 1))
            if not product:
                return _mark_reply("ما عرفت المنتج. اكتب اسمه بوضوح والكمية (مثال: صحن بطاطس 2).", "ASK_PRODUCT")
            return _mark_reply(
                f"حددت {qty} × {product.name}. تبيها سفري، محلي، أو توصيل؟",
                "ASK_TYPE",
                pid=product.id,
                qty=qty,
            )

        if stage == "ASK_TYPE":
            pid = data.get("pid")
            qty = int(data.get("qty", "1"))
            if not pid:
                return _mark_reply("أحتاج أحدد المنتج أول.", "ASK_PRODUCT")
            dine_type = _extract_dine_type(lower)
            address = ""
            if dine_type == "delivery":
                address = text
            if not dine_type:
                return _mark_reply("تبغى الطلب محلي، سفري، أو توصيل؟", "ASK_TYPE", pid=pid, qty=qty)
            return _mark_reply(
                "تم، كيف تبي تدفع؟ كاش، شبكة، أو أونلاين (Apple Pay / STC Pay)؟",
                "ASK_PAY",
                pid=pid,
                qty=qty,
                order_type=dine_type,
                address=address,
            )

        if stage == "ASK_PAY":
            pid = data.get("pid")
            qty = int(data.get("qty", "1"))
            dine_type = data.get("order_type", "takeaway")
            address = data.get("address", "")
            if not pid:
                return _mark_reply("خلنا نختار المنتج أول.", "ASK_PRODUCT")
            payment = _extract_payment(lower)
            if not payment:
                return _mark_reply("حدد الدفع: كاش، شبكة، أو أونلاين (Apple Pay / STC Pay).", "ASK_PAY", pid=pid, qty=qty, order_type=dine_type, address=address)
            try:
                product = Product.objects.get(id=pid)
            except Product.DoesNotExist:
                return _mark_reply("ما لقيت المنتج، عطنا اسمه من جديد.", "ASK_PRODUCT")

            order = _create_quick_order(
                user=user,
                product=product,
                qty=qty,
                order_type=dine_type,
                payment_method=payment,
                delivery_address=address,
            )
            if not order:
                return "تعذر إنشاء الطلب الآن، جرّب مرة ثانية أو اطلب مساعدة موظف."

            dine_text = {"dine_in": "محلي بالصالة", "takeaway": "سفري/استلام", "delivery": "توصيل"}.get(dine_type, "سفري")
            pay_text = {"cash": "كاش", "card_pos": "شبكة/بطاقة", "online": "أونلاين"}.get(payment, "كاش")
            return _mark_reply(
                f"تم إنشاء طلب #{order.id}: {qty} × {product.name}. الاستلام: {dine_text}، الدفع: {pay_text}. تبي أضيف صنف ثاني، أضيف ملاحظة (مثلاً زيادة جبن)، أو أرسل لك الفاتورة؟",
                "ASK_NEXT",
                order_id=order.id,
            )

        if stage == "ASK_NEXT":
            order_id = data.get("order_id")
            order = _get_order(order_id, user)

            if _is_invoice_request(text) and order:
                return _mark_reply(_format_invoice_hint(order.id), "ASK_NEXT", order_id=order_id)

            addon_note = _extract_addon_note(text)
            if addon_note and order:
                order.note = (order.note + " | " if order.note else "") + addon_note
                order.save(update_fields=["note", "updated_at"])
                return _mark_reply(f"سجلت الملاحظة: «{addon_note}». تحب أضيف صنف ثاني أو أرسل الفاتورة؟", "ASK_NEXT", order_id=order_id)

            if any(word in lower for word in GRATITUDE_WORDS):
                return _mark_reply("تسلم! تحتاج خدمة ثانية؟ أقدر أرسل الفاتورة أو أضيف صنف جديد.", "ASK_NEXT", order_id=order_id)

            new_product = _best_product(text)
            if order and new_product:
                qty2 = _extract_int(text) or 1
                _add_item_to_order(order, new_product, qty2)
                return _mark_reply(
                    f"أضفت {qty2} × {new_product.name} للطلب #{order.id}. تبغى شي ثاني أو أرسل الفاتورة؟",
                    "ASK_NEXT",
                    order_id=order.id,
                )

            if _is_yes(text):
                return _mark_reply("تمام، نعم على أي خيار بالضبط؟ أضيف صنف ثاني ولا أرسل لك الفاتورة؟", "ASK_NEXT", order_id=order_id)

            if _is_no(text):
                return _mark_reply("تم، أي خدمة ثانية؟ أقدر أرسل المنيو أو أراجع حالة طلب سابق.", None)

            if "منيو" in lower or "قائمة" in lower:
                return _mark_reply("قائمة المتجر كاملة في صفحة «القائمة». تحب أرسل ترشيح سريع ولا تضيف صنف معين؟", "ASK_NEXT", order_id=order_id)

            return _mark_reply("أقدر أدوّن ملاحظة، أضيف صنف جديد، أو أرسل الفاتورة. وش تختار؟", "ASK_NEXT", order_id=order_id)

        if stage == "COMPLAINT":
            issue = data.get("issue", "")
            order_id = _extract_int(text)
            if order_id:
                return _mark_reply(f"استلمت البلاغ عن الطلب #{order_id} ({issue or 'شكوى'}). بأشيّك عليه وأرد عليك. تحب أرسل تحديث الحالة أو أعوضك بخيار مناسب؟", "ASK_NEXT", order_id=order_id)
            return _mark_reply("عطني رقم الطلب أو اسمك ووقت الطلب عشان أقدر أساعدك أسرع.", "COMPLAINT", issue=issue)

        if stage == "ASK_EDIT_ID":
            order_id = _extract_int(text)
            if not order_id:
                return _mark_reply("أحتاج رقم الطلب أو اسم العميل.", "ASK_EDIT_ID")
            return _mark_reply("تم، اكتب التعديل المطلوب أو الملاحظة اللي تبي أضيفها.", "ASK_EDIT_DETAIL", order_id=order_id)

        if stage == "ASK_EDIT_DETAIL":
            order_id = data.get("order_id")
            if not order_id:
                return "أحتاج رقم الطلب للتعديل."
            try:
                order = Order.objects.get(id=order_id)
                change_note = text.strip()
                order.note = (order.note + " | " if order.note else "") + f"تعديل: {change_note}"
                order.save(update_fields=["note"])
            except Exception:
                logger.exception("Failed to save edit note")
            return _mark_reply(f"سجلت التعديل على الطلب #{order_id}. تحتاج شي ثاني؟", "ASK_NEXT", order_id=order_id)

    # ========= لا يوجد سياق سابق =========
    def budget_reply():
        budget_val = _extract_budget(text)
        hot = any(k in lower for k in ["حار", "سبايسي", "spicy", "ساخن"])
        product = _recommend_by_budget(budget_val, hot=hot)
        if product and budget_val is not None:
            return f"تم ✅ على ميزانية {budget_val} ريال أنصحك بـ {product.name} بسعر {product.price}. تبغاه؟ أقول لك إضافاته ولا نثبّت الطلب؟"
        top = ", ".join(_top_sellers())
        return f"ما لقيت شيء بالسعر المذكور، لكن أفضل الخيارات عندنا: {top}. حاب تختار واحد؟"

    dialogue_result: Optional[DialogueResult] = handle_no_ctx(text, budget_reply, _default_reply())
    if dialogue_result:
        if dialogue_result.stage:
            return _mark_reply(dialogue_result.reply, dialogue_result.stage, **(dialogue_result.data or {}))
        return dialogue_result.reply

    if _is_invoice_request(text):
        last_order = None
        if user and getattr(user, "is_authenticated", False):
            last_order = Order.objects.filter(user=user).order_by("-id").first()
        if last_order:
            return _mark_reply(_format_invoice_hint(last_order.id), "ASK_NEXT", order_id=last_order.id)
        return "بخدمتك، لكن ما لقيت طلب سابق. تبي أسوي طلب جديد لك؟"

    if any(k in lower for k in ORDER_TRIGGERS):
        return _mark_reply("تمام، وش اسم المنتج والكمية اللي تبيها؟ مثال: «صحن بطاطس 1»", "ASK_PRODUCT")

    if "اقترح" in lower or "ميزانية" in lower or "بسعر" in lower:
        return _mark_reply(budget_reply(), "ASK_NEXT", order_id="")

    if any(k in lower for k in ["تأخر", "تأخرت", "وين طلبي", "ما وصل"]):
        return _mark_reply(COMPLAINTS["delay"], "COMPLAINT", issue="delay")

    if "الغاء" in lower or "ألغ" in lower or "كنسل" in lower:
        return _mark_reply("تم، عطنا رقم الطلب أو آخر بياناته عشان ألغيه لك.", "ASK_EDIT_ID")

    if "تتبع" in lower or "حالة الطلب" in lower:
        return _mark_reply("أعطني رقم الطلب أو آخر أربعة أرقام منه وأشيّك حالاً.", "ASK_EDIT_ID")

    if _is_yes(text):
        res = handle_yes_like(ctx.get("stage") if ctx else None)
        if res:
            if res.stage:
                return _mark_reply(res.reply, res.stage, **(res.data or {}))
            return res.reply

    return _default_reply()


def should_handover_to_human(content: str) -> bool:
    text = (content or "").strip().lower()
    trigger_phrases = [
        "بغيت اكلم انسان",
        "موظف حقيقي",
        "انسان حقيقي",
        "محتاج دعم موظف",
        "اريد اكلم موظف",
        "أريد أكلم موظف",
        "بكلم موظف ",
        "موظف دعم",
        "موظف",
        "ما احتاج بوت",
        "ما احتاج روبوت",
        "اريد بشري",
        "أريد بشري",
        "بشري",
        "أبغى موظف حقيقي",
        "أبغى موظف",
        "ابي موظف",
        "أبي موظف",
        "عطني موظف",
        "محتاج موظف",
        "احتاج موظف",
        "تكلم بشر",
        "دعم بشري",
        "حابي اكلم احد",
        "talk to human",
        "support agent",
        "real person",
    ]
    return any(p in text for p in trigger_phrases)
