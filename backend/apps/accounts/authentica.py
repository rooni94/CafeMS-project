from __future__ import annotations

from dataclasses import dataclass

import requests
from django.conf import settings


class AuthenticaError(RuntimeError):
    pass


@dataclass(frozen=True)
class AuthenticaResult:
    ok: bool
    message: str | None = None
    raw: dict | None = None


def _auth_headers() -> dict:
    api_key = getattr(settings, "AUTHENTICA_API_KEY", "").strip()
    if not api_key:
        raise AuthenticaError("Authentica API key is not configured (AUTHENTICA_API_KEY).")
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Authorization": api_key,
    }


def send_otp(*, phone: str, method: str | None = None, template_id: int | None = None) -> AuthenticaResult:
    """
    Authentica send OTP:
      POST {AUTHENTICA_BASE_URL}/send-otp
      headers: X-Authorization
      body: { method: "sms", phone: "+9665..." , template_id: 1 }
    """
    base_url = getattr(settings, "AUTHENTICA_BASE_URL", "https://api.authentica.sa/api/v2").rstrip("/")
    effective_method = (method or getattr(settings, "AUTHENTICA_OTP_METHOD", "sms")).strip().lower()
    effective_template_id = template_id if template_id is not None else int(
        getattr(settings, "AUTHENTICA_OTP_TEMPLATE_ID", 1)
    )

    url = f"{base_url}/send-otp"
    payload = {"method": effective_method, "phone": phone, "template_id": effective_template_id}

    try:
        resp = requests.post(url, headers=_auth_headers(), json=payload, timeout=15)
    except requests.RequestException as exc:
        raise AuthenticaError(f"Authentica send-otp network error: {exc}") from exc

    try:
        data = resp.json()
    except ValueError:
        data = None

    if resp.status_code == 401:
        raise AuthenticaError("Authentica unauthorized (check AUTHENTICA_API_KEY).")

    if resp.status_code >= 400:
        raise AuthenticaError(f"Authentica send-otp failed ({resp.status_code}).")

    message = None
    if isinstance(data, dict):
        message = data.get("message")
        ok = bool(data.get("success", True))
    else:
        ok = True

    return AuthenticaResult(ok=ok, message=message, raw=data if isinstance(data, dict) else None)


def verify_otp(*, phone: str, otp: str) -> AuthenticaResult:
    """
    Authentica verify OTP:
      POST {AUTHENTICA_BASE_URL}/verify-otp
      body: { phone: "+9665...", otp: "123456" }
    """
    base_url = getattr(settings, "AUTHENTICA_BASE_URL", "https://api.authentica.sa/api/v2").rstrip("/")
    url = f"{base_url}/verify-otp"
    payload = {"phone": phone, "otp": otp}

    try:
        resp = requests.post(url, headers=_auth_headers(), json=payload, timeout=15)
    except requests.RequestException as exc:
        raise AuthenticaError(f"Authentica verify-otp network error: {exc}") from exc

    try:
        data = resp.json()
    except ValueError:
        data = None

    if resp.status_code == 401:
        raise AuthenticaError("Authentica unauthorized (check AUTHENTICA_API_KEY).")

    if resp.status_code >= 400:
        raise AuthenticaError(f"Authentica verify-otp failed ({resp.status_code}).")

    ok = False
    message = None
    if isinstance(data, dict):
        message = data.get("message")
        ok = bool(data.get("status") or data.get("success"))
    else:
        ok = True

    return AuthenticaResult(ok=ok, message=message, raw=data if isinstance(data, dict) else None)

