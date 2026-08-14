from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Sequence

from django.conf import settings
from django.core.mail import EmailMessage, get_connection

from .models import StoreSettings

EmailKind = Literal["default", "verification", "support"]


@dataclass
class EmailProfile:
    host: str | None
    port: int | None
    username: str | None
    password: str | None
    use_tls: bool
    use_ssl: bool
    from_email: str | None


def _base_profile() -> EmailProfile:
    return EmailProfile(
        host=getattr(settings, "EMAIL_HOST", None),
        port=getattr(settings, "EMAIL_PORT", None),
        username=getattr(settings, "EMAIL_HOST_USER", None),
        password=getattr(settings, "EMAIL_HOST_PASSWORD", None),
        use_tls=getattr(settings, "EMAIL_USE_TLS", False),
        use_ssl=getattr(settings, "EMAIL_USE_SSL", False),
        from_email=getattr(
            settings,
            "DEFAULT_FROM_EMAIL",
            "CafeMS Demo <noreply@example.invalid>",
        ),
    )


def _load_store_settings() -> StoreSettings | None:
    try:
        obj, _ = StoreSettings.objects.get_or_create(id=1)
        return obj
    except Exception:
        return None


def _build_profile(kind: EmailKind) -> EmailProfile:
    profile = _base_profile()
    settings_obj = _load_store_settings()
    if not settings_obj:
        return profile

    def apply(
        *,
        host: str | None = None,
        port: int | None = None,
        username: str | None = None,
        password: str | None = None,
        use_tls: bool | None = None,
        use_ssl: bool | None = None,
        from_email: str | None = None,
    ):
        nonlocal profile
        if host:
            profile.host = host
        if port:
            profile.port = port
        if username:
            profile.username = username
        if password is not None and password != "":
            profile.password = password
        if use_tls is not None:
            profile.use_tls = bool(use_tls)
        if use_ssl is not None:
            profile.use_ssl = bool(use_ssl)
        if from_email:
            profile.from_email = from_email

    if kind == "verification":
        apply(
            host=settings_obj.verification_smtp_host or settings_obj.smtp_host,
            port=settings_obj.verification_smtp_port or settings_obj.smtp_port,
            username=settings_obj.verification_smtp_username or settings_obj.smtp_username,
            password=settings_obj.verification_smtp_password or settings_obj.smtp_password,
            use_tls=settings_obj.verification_smtp_use_tls,
            use_ssl=settings_obj.verification_smtp_use_ssl,
            from_email=settings_obj.verification_email or settings_obj.notification_email,
        )
    elif kind == "support":
        apply(
            host=settings_obj.support_smtp_host or settings_obj.smtp_host,
            port=settings_obj.support_smtp_port or settings_obj.smtp_port,
            username=settings_obj.support_smtp_username or settings_obj.smtp_username,
            password=settings_obj.support_smtp_password or settings_obj.smtp_password,
            use_tls=settings_obj.support_smtp_use_tls,
            use_ssl=settings_obj.support_smtp_use_ssl,
            from_email=settings_obj.support_reply_email
            or settings_obj.support_email
            or settings_obj.contact_email
            or settings_obj.notification_email,
        )
    else:
        apply(
            host=settings_obj.smtp_host,
            port=settings_obj.smtp_port,
            username=settings_obj.smtp_username,
            password=settings_obj.smtp_password,
            use_tls=settings_obj.smtp_use_tls,
            use_ssl=settings_obj.smtp_use_ssl,
            from_email=settings_obj.notification_email or settings_obj.contact_email,
        )

    if profile.use_tls and profile.use_ssl:
        profile.use_ssl = False
    return profile


def send_store_email(
    subject: str,
    message: str,
    recipient_list: Sequence[str],
    *,
    kind: EmailKind = "default",
    fail_silently: bool = True,
) -> bool:
    if not recipient_list:
        return False

    profile = _build_profile(kind)

    try:
        connection = get_connection(
            host=profile.host,
            port=profile.port,
            username=profile.username,
            password=profile.password,
            use_tls=profile.use_tls,
            use_ssl=profile.use_ssl,
        )
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=profile.from_email,
            to=list(recipient_list),
            connection=connection,
        )
        email.send(fail_silently=fail_silently)
        return True
    except Exception as exc:
        if not fail_silently:
            raise
        print("send_store_email error:", exc)
        return False
