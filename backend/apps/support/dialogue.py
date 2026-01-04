"""
حزمة حوارية خفيفة لدمج خريطة النوايا (intents) والردود المختصرة.
ملاحظة: هذه ليست بديل كامل لـ JSON الكبير، لكنها تغطي الترحيب، السوالف الخفيفة،
التوصيات حسب الميزانية، والشكاوى، وتعيد حالة بسيطة ليستعملها bot.py.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


INTENT_KEYWORDS = {
    "greeting": ["هلا", "السلام عليكم", "مرحبا", "ياهلا"],
    "smalltalk_howareyou": ["كيف حالك", "شلونك", "اخبارك"],
    "recommendation": ["اقترح", "وش تنصح", "ابي وجبة", "اختار لي", "ترشح", "ترشيح"],
    "budget_request": ["بسعر", "بميزانية", "معي", "ريال", "بريال", "ريالات"],
    "order_start": ["ابي اطلب", "طلب جديد", "ابغى اطلب", "سو لي طلب", "اضف", "أضف"],
    "complaint_delay": ["تأخر", "متأخر", "ليش ما جا", "وين طلبي"],
    "complaint_wrong": ["غلط", "مو طلبي", "غير", "ناقص"],
    "complaint_cold": ["بارد", "مو حار", "برد"],
    "cancel_order": ["الغاء", "كنسل", "ابغى الغي"],
    "track_order": ["تتبع", "وين وصل", "حالة الطلب"],
    "thanks": ["شكرا", "يعطيك العافية", "مشكور"],
    "goodbye": ["مع السلامة", "سلام", "باي"],
}


YES_LIKE = ["نعم", "اي", "ايه", "ايوه", "أيوه", "اوكي", "تمام", "sure", "yes"]


@dataclass
class DialogueResult:
    reply: str
    stage: Optional[str] = None
    data: Optional[dict] = None


def detect_intent(text: str) -> Optional[str]:
    lower = text.lower()
    for intent, words in INTENT_KEYWORDS.items():
        if any(w in lower for w in words):
            return intent
    return None


def handle_no_ctx(text: str, budget_reply_fn, fallback_reply: str) -> Optional[DialogueResult]:
    """
    تعامل مع الرسائل عندما لا يوجد سياق سابق (قبل بدء مسار الطلب).
    budget_reply_fn: دالة تعطي رد توصية بناءً على الميزانية.
    """
    intent = detect_intent(text)
    if intent == "greeting":
        return DialogueResult("هلا والله 👋 حياك! تبغى تطلب شي ولا عندك استفسار؟")
    if intent == "smalltalk_howareyou":
        return DialogueResult("تمام الحمدلله 🌿 وانت؟ حاب أرتّب لك طلب أو اقتراح؟")
    if intent in ("recommendation", "budget_request"):
        return DialogueResult(budget_reply_fn(), stage="ASK_NEXT", data={"order_id": ""})
    if intent == "complaint_delay":
        return DialogueResult("حقك علينا 🙏 عطنا رقم الطلب أو اسمك ووقت الطلب وبشيّك لك.")
    if intent == "complaint_wrong":
        return DialogueResult("معليش 😓 وش اللي وصلك ووش اللي كنت طالب؟ ورقم الطلب إن وجد.")
    if intent == "complaint_cold":
        return DialogueResult("آسفين جدًا 😔 تبغى نستبدل الوجبة أو نعوضك؟ عطنا رقم الطلب.")
    if intent == "cancel_order":
        return DialogueResult("تم 👍 عطنا رقم الطلب عشان نلغيه لك.")
    if intent == "track_order":
        return DialogueResult("أكيد 👍 اكتب رقم الطلب أو رقم جوالك اللي طلبت فيه وبشيّك.")
    if intent == "thanks":
        return DialogueResult("العفو يا بعدي 🌟 إذا تبغى شي ثاني أنا حاضر.")
    if intent == "goodbye":
        return DialogueResult("في أمان الله 👋 إذا احتجت شي رجّع لي.")
    if intent == "order_start":
        # دع المسار الرئيسي يتكفل بالطلب
        return None
    return DialogueResult(fallback_reply)


def handle_yes_like(last_stage: Optional[str]) -> Optional[DialogueResult]:
    """
    إذا قال العميل «نعم» بدون وضوح، نعيده للسؤال السابق بوضوح.
    """
    if not last_stage:
        return DialogueResult("أكيد 👍 نعم على أي خيار بالضبط؟ اختَر لك صنف أو قل سفري/محلي/الدفع.")
    if last_stage == "ASK_NEXT":
        return DialogueResult("تمام، أحدد لك؟ اكتب اسم الصنف والكمية، أو قل لي أرسل الفاتورة.")
    if last_stage == "ASK_PRODUCT":
        return DialogueResult("تمام، اكتب اسم الصنف والكمية (مثال: بطاطس 2).")
    if last_stage == "ASK_TYPE":
        return DialogueResult("أوكي، تبيها سفري ولا محلي؟ ولو توصيل اكتب العنوان.")
    if last_stage == "ASK_PAY":
        return DialogueResult("تمام، كيف تبي تدفع؟ كاش أو بطاقة أو أونلاين؟")
    return DialogueResult("أبشر، وضّح لي نعم على أي خطوة؟")

