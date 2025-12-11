from django.contrib.auth.tokens import PasswordResetTokenGenerator


class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    """
    توكن تفعيل الحساب.
    مربوط مع حالة المستخدم (is_active) عشان إذا تفعّل الحساب
    التوكن القديم ما يصير صالح.
    """

    def _make_hash_value(self, user, timestamp):
        # تأكد أن عندك حقل is_active في نموذج المستخدم
        return f"{user.pk}{timestamp}{user.is_active}"


class PasswordResetCustomTokenGenerator(PasswordResetTokenGenerator):
    """
    توكن إعادة تعيين كلمة المرور.
    نربطه بكلمة المرور الحالية وحالة الحساب، عشان
    لو تغيّرت كلمة المرور أو تغيّرت حالة المستخدم التوكن يبطل.
    """

    def _make_hash_value(self, user, timestamp):
        # user.password يتغير إذا المستخدم غيّر كلمة المرور
        return f"{user.pk}{timestamp}{user.is_active}{user.password}"


# هذا يُستخدم في serializers.py
account_activation_token = AccountActivationTokenGenerator()

# وهذا يُستخدم في views.py
password_reset_token = PasswordResetCustomTokenGenerator()
