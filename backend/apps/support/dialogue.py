"""
منطق النوايا والحوارات العامة (small talk، توصيات، شكاوى) مستخلصة من خريطة الـ JSON المرسلة.
يُستخدم عندما لا يوجد سياق سابق، أو عندما تكون إجابة "نعم/لا" مبهمة.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Callable

# كلمات مفتاحية للنوايا (intents)
INTENT_KEYWORDS = {
    "greeting": ["هلا", "مرحبا", "ياهلا", "أهلا"],
    "smalltalk_howareyou": ["كيف حالك", "شلونك", "اخبارك"],
    "smalltalk_joke": ["قل نكته", "نكتة", "ضحكني"],
    "smalltalk_weather": ["كيف الجو", "الطقس", "حر ولا برد"],
    "smalltalk_time": ["كم الساعة", "الوقت"],
    "smalltalk_meaning": ["وش معنى", "اشرح", "يعني ايش"],
    "smalltalk_personal": ["مين انت", "وش تسوي", "كم عمرك"],
    "menu_request": ["وش عندكم", "المنيو", "القائمة", "الاصناف", "وش أفضل شي", "وش افضل شي", "أفضل شي عندكم"],
    "recommendation": ["اقترح", "وش تنصح", "ابي وجبة", "اختار لي", "اختيار وجبة"],
    "budget_request": ["بسعر", "بميزانية", "معي", "ابي شي ب", "ب ريال", "ارخص شي", "شي رخيص"],
    "order_start": ["ابي اطلب", "طلب جديد", "ابغى اطلب", "أبغى أضيف طلب", "سوي طلب", "اطلب"],
    "order_confirm_yes": ["نعم", "اي", "ايه", "ايوه", "أجل", "تمام", "اوكي", "أوكي", "وافق"],
    "order_confirm_no": ["لا", "مو", "مابي", "الغ", "وقف"],
    "add_addons": ["زيادة", "اضافة", "إضافة", "حط", "زيد"],
    "remove_ingredients": ["بدون", "لا تحط", "شيل"],
    "set_dine_type": ["سفري", "محلي", "هنا", "تيك اواي", "تيك اوي"],
    "set_payment": ["كاش", "شبكة", "ابل باي", "مدى", "stc pay", "بطاقة", "apple pay"],
    "delivery_request": ["توصيل", "وصل", "دليفري", "استلام", "باخذها من الفرع"],
    "location_provide": ["موقعي", "حي", "شارع", "لوكيشن", "عنوان"],
    "complaint_delay": ["تأخر", "متأخر", "ليش ما جا", "وين طلبي", "تاخر"],
    "complaint_wrong": ["غلط", "مو طلبي", "غير", "ناقص"],
    "complaint_cold": ["بارد", "مو حار", "برد"],
    "complaint_quality": ["سيء", "مو زين", "طعم", "مستوى"],
    "cancel_order": ["الغاء", "كنسل", "ابغى الغي", "ألغيه"],
    "track_order": ["تتبع", "وين وصل", "حالة الطلب"],
    "thanks": ["شكرا", "يعطيك العافية", "مشكور"],
    "goodbye": ["مع السلامة", "باي", "وداع"],
}

# ردود مختصرة
SMALL_TALK = {
    "greeting": "هلا والله 👋 حياك! وش أقدر أخدمك اليوم؟",
    "smalltalk_howareyou": "تمام الحمدلله 🌿 وانت كيفك؟ وش ودّك تطلب؟",
    "smalltalk_joke": "أبشر 😄 نكتة سريعة: واحد راح للمطعم قال: عندكم أكل خفيف؟ قالوا: ايه… سلطة بدون طبق 😂. نرجع لطلبك؟",
    "smalltalk_weather": "الجو يختلف حسب المدينة. قلّي اسم الحي/المدينة وأعطيك رد أقرب، وبالمرة تختار طلب؟",
    "smalltalk_time": "لو تقصد وقت الاستلام/التوصيل: حدد لي توصيل أو استلام وأعطيك وقت تقريبي.",
    "smalltalk_meaning": "اكتب الكلمة أو الجملة اللي تبي معناها، وبعدها نكمل طلبك.",
    "smalltalk_personal": "أنا مساعد CafeMS Demo 🤝 أساعدك تختار وتطلب وتتابع طلباتك.",
}

COMPLAINTS = {
    "delay": "حقك علينا 🙏 عطنا رقم الطلب؟ وإذا ما عندك رقم، عطنا اسمك ووقت الطلب وبشيّك فورًا.",
    "wrong": "معليش 😓 وش اللي وصلك ووش اللي كنت طالب؟ وعطني رقم الطلب أو الاسم عشان نصلحها بسرعة.",
    "cold": "آسفين جدًا 😔 تبغى نبدّل لك الوجبة بواحدة جديدة ولا تعويض؟ وعطني رقم الطلب.",
    "quality": "آسف لو التجربة ما كانت كويسة. وش الملاحظة بالضبط؟ وعطني رقم الطلب.",
}


@dataclass
class DialogueResult:
    reply: str
    stage: Optional[str] = None
    data: Optional[dict] = None


def detect_intent(text: str) -> Optional[str]:
    lower = (text or "").lower()
    for intent, words in INTENT_KEYWORDS.items():
        if any(w in lower for w in words):
            return intent
    return None


def handle_no_ctx(text: str, budget_reply_fn: Callable[[], str], fallback_reply: str) -> Optional[DialogueResult]:
    """
    يحدد النية ويعطي رد سريع إذا لا يوجد سياق سابق.
    budget_reply_fn: دالة تُرجع اقتراح بناءً على الميزانية (يربطها generate_bot_reply بالمنتجات).
    """
    intent = detect_intent(text)
    if intent in ("greeting", "smalltalk_howareyou", "smalltalk_joke", "smalltalk_weather", "smalltalk_time", "smalltalk_meaning", "smalltalk_personal"):
        return DialogueResult(SMALL_TALK.get(intent, SMALL_TALK["greeting"]), stage="ASK_PRODUCT", data={})
    if intent == "menu_request":
        return DialogueResult("عندنا خيارات سريعة ولذيذة 😋 تبغى شي خفيف ولا مشبع؟ وكم ميزانيتك تقريباً؟", stage="ASK_NEXT", data={"order_id": ""})
    if intent in ("recommendation", "budget_request"):
        return DialogueResult(budget_reply_fn(), stage="ASK_NEXT", data={"order_id": ""})
    if intent == "order_start":
        return DialogueResult("تم، وش تبي تطلب؟ اكتب اسم المنتج والكمية (مثال: ساندويتش دجاج 2).", stage="ASK_PRODUCT", data={})
    if intent == "complaint_delay":
        return DialogueResult(COMPLAINTS["delay"], stage="COMPLAINT", data={"issue": "delay"})
    if intent == "complaint_wrong":
        return DialogueResult(COMPLAINTS["wrong"], stage="COMPLAINT", data={"issue": "wrong"})
    if intent == "complaint_cold":
        return DialogueResult(COMPLAINTS["cold"], stage="COMPLAINT", data={"issue": "cold"})
    if intent == "complaint_quality":
        return DialogueResult(COMPLAINTS["quality"], stage="COMPLAINT", data={"issue": "quality"})
    if intent == "cancel_order":
        return DialogueResult("تم 👍 عطنا رقم الطلب عشان ألغيه لك. إذا ما عندك رقم، قلّي الاسم ووقت الطلب.", stage="ASK_EDIT_ID")
    if intent == "track_order":
        return DialogueResult("أكيد 👍 عطني رقم الطلب أو رقم جوالك اللي طلبت فيه وبشيّك لك.", stage="ASK_EDIT_ID")
    if intent == "thanks":
        return DialogueResult("العفو يا بعدي 🌟 إذا تبغى شي ثاني أنا حاضر.")
    if intent == "goodbye":
        return DialogueResult("في أمان الله 👋 متى ما احتجت شي أنا حاضر.")
    # fallback
    return DialogueResult(fallback_reply)


def handle_yes_like(last_stage: Optional[str]) -> Optional[DialogueResult]:
    """
    التعامل مع إجابة "نعم/اوكي" المبهمة حسب آخر مرحلة.
    """
    if not last_stage:
        return DialogueResult("أكيد، نعم على أي خيار؟ أضيف صنف، أرسل الفاتورة، ولا في استفسار؟")
    if last_stage == "ASK_NEXT":
        return DialogueResult("تمام، نعم على أي خيار؟ أضيف صنف ثاني ولا أرسل لك الفاتورة؟", stage="ASK_NEXT")
    if last_stage == "ASK_PRODUCT":
        return DialogueResult("طيب، اكتب اسم المنتج والكمية (مثال: صحن بطاطس 1).", stage="ASK_PRODUCT")
    if last_stage == "ASK_TYPE":
        return DialogueResult("تبغى الطلب محلي، سفري، أو توصيل؟", stage="ASK_TYPE")
    if last_stage == "ASK_PAY":
        return DialogueResult("كيف تحب تدفع؟ كاش، شبكة، أو أونلاين (Apple Pay / STC Pay).", stage="ASK_PAY")
    if last_stage == "COMPLAINT":
        return DialogueResult("تمام، عطنا رقم الطلب أو الاسم عشان نحلها بسرعة.", stage="ASK_EDIT_ID")
    return DialogueResult("أوضح لك: أضيف صنف، أرسل فاتورة، ولا في استفسار ثاني؟")
