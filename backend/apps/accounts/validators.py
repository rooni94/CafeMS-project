# backend/apps/accounts/validators.py
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class StrongPasswordValidator:
    def validate(self, password, user=None):
        if len(password) < 8:
            raise ValidationError(
                _("يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل."),
                code="password_too_short",
            )
        if not re.search(r"[A-Z]", password):
            raise ValidationError(
                _("يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل."),
                code="password_no_upper",
            )
        if not re.search(r"[a-z]", password):
            raise ValidationError(
                _("يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل."),
                code="password_no_lower",
            )
        if not re.search(r"\d", password):
            raise ValidationError(
                _("يجب أن تحتوي كلمة المرور على رقم واحد على الأقل."),
                code="password_no_digit",
            )
        if not re.search(r"[^\w\s]", password):
            raise ValidationError(
                _("يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل."),
                code="password_no_symbol",
            )

    def get_help_text(self):
        return _(
            "يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، "
            "وحرف كبير وحرف صغير ورقم ورمز خاص واحد على الأقل."
        )
