# backend/apps/accounts/utils.py
"""
دوال مساعدة عامة لتطبيق الحسابات.
الآن هو مجرد ملف هيكلي يمكن التوسع فيه مستقبلاً
(مثل تسجيل نشاط، تنسيق رسائل، ...).
"""

from apps.store.utils import get_store_name


def arabic_app_name() -> str:
    return get_store_name()

