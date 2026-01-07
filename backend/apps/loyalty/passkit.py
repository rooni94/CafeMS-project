import hashlib
import io
import json
import logging
import os
import secrets
import tempfile
import zipfile
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Dict, Iterable, Optional, Tuple

import httpx
import requests
from PIL import Image
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.hazmat.primitives.serialization.pkcs7 import (
    PKCS7Options,
    PKCS7SignatureBuilder,
)
from django.conf import settings
from django.utils import timezone
from django.utils.http import http_date

from apps.store.models import StoreSettings
from .models import LoyaltyPassRegistration, LoyaltyProfile, LoyaltySettings

logger = logging.getLogger(__name__)


class PassKitConfigError(RuntimeError):
    pass


_PASS_CERT_CACHE: Optional[Tuple[object, x509.Certificate, Tuple[x509.Certificate, ...]]] = None
_WWDR_CERT_CACHE: Optional[x509.Certificate] = None
_APNS_CERT_FILES: Optional[Tuple[str, str]] = None
_LOGO_CACHE_KEY: Optional[Tuple[Optional[str], Optional[str]]] = None
_LOGO_CACHE_BYTES: Optional[bytes] = None


def _load_pass_certificate():
    global _PASS_CERT_CACHE
    if _PASS_CERT_CACHE is not None:
        return _PASS_CERT_CACHE

    p12_path = getattr(settings, "APPLE_PASS_P12", "")
    if not p12_path or not os.path.exists(p12_path):
        raise PassKitConfigError("Missing APPLE_PASS_P12 certificate file.")

    password = getattr(settings, "APPLE_PASS_P12_PASSWORD", "")
    password_bytes = password.encode("utf-8") if password else None
    with open(p12_path, "rb") as handle:
        p12_data = handle.read()

    key, cert, extra = pkcs12.load_key_and_certificates(p12_data, password_bytes)
    if not key or not cert:
        raise PassKitConfigError("Unable to load pass certificate or key from P12.")

    extras = tuple(extra or [])
    _PASS_CERT_CACHE = (key, cert, extras)
    return _PASS_CERT_CACHE


def _load_wwdr_certificate():
    global _WWDR_CERT_CACHE
    if _WWDR_CERT_CACHE is not None:
        return _WWDR_CERT_CACHE

    wwdr_path = getattr(settings, "APPLE_WWDR_PEM", "")
    if not wwdr_path or not os.path.exists(wwdr_path):
        raise PassKitConfigError("Missing APPLE_WWDR_PEM certificate file.")

    with open(wwdr_path, "rb") as handle:
        wwdr_data = handle.read()
    _WWDR_CERT_CACHE = x509.load_pem_x509_certificate(wwdr_data)
    return _WWDR_CERT_CACHE


def _hex_to_rgb(value: str) -> Tuple[int, int, int]:
    value = (value or "").strip().lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if len(value) != 6:
        return (0, 0, 0)
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def _load_logo_bytes(settings_obj: StoreSettings, loyalty_settings: LoyaltySettings) -> Optional[bytes]:
    global _LOGO_CACHE_KEY, _LOGO_CACHE_BYTES
    configured_url = (loyalty_settings.pass_logo_url or "").strip()
    candidate_urls = []
    if configured_url:
        candidate_urls.append(configured_url)
    else:
        candidate_urls.extend(
            ["/loyalty-logo.png", "/loyalty-logo.jpg", "/loyalty-logo.jpeg"]
        )

    normalized_urls = []
    for url in candidate_urls:
        if url.startswith("/"):
            normalized_urls.append(f"{_wallet_base_url(settings_obj)}{url}")
        else:
            normalized_urls.append(url)

    logo_path = settings_obj.logo.path if getattr(settings_obj, "logo", None) else None
    cache_key = (tuple(normalized_urls), logo_path or None)
    if cache_key == _LOGO_CACHE_KEY:
        return _LOGO_CACHE_BYTES

    logo_bytes = None
    for url in normalized_urls:
        try:
            resp = requests.get(url, timeout=5)
            if resp.ok and resp.content:
                logo_bytes = resp.content
                break
        except requests.RequestException as exc:
            logger.warning("Failed to fetch pass logo URL: %s", exc)

    if not logo_bytes and logo_path:
        try:
            with open(logo_path, "rb") as handle:
                logo_bytes = handle.read()
        except OSError as exc:
            logger.warning("Failed to read logo file: %s", exc)

    _LOGO_CACHE_KEY = cache_key
    _LOGO_CACHE_BYTES = logo_bytes
    return logo_bytes


def _build_image_bytes(color_hex: str, size: Tuple[int, int]) -> bytes:
    rgb = _hex_to_rgb(color_hex)
    image = Image.new("RGB", size, rgb)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _mix_rgb(left: Tuple[int, int, int], right: Tuple[int, int, int], ratio: float) -> Tuple[int, int, int]:
    ratio = max(0.0, min(1.0, ratio))
    return tuple(int(left[i] * (1 - ratio) + right[i] * ratio) for i in range(3))


def _build_gradient_image(
    size: Tuple[int, int], start_rgb: Tuple[int, int, int], end_rgb: Tuple[int, int, int]
) -> Image.Image:
    base = Image.new("RGB", size, start_rgb)
    top = Image.new("RGB", size, end_rgb)
    mask = Image.linear_gradient("L").resize(size)
    return Image.composite(top, base, mask)


def _build_strip_image(
    size: Tuple[int, int],
    base_hex: str,
    accent_hex: str,
    logo_bytes: Optional[bytes],
) -> bytes:
    base_rgb = _hex_to_rgb(base_hex)
    accent_rgb = _hex_to_rgb(accent_hex)
    accent_rgb = _mix_rgb(base_rgb, accent_rgb, 0.55)
    gradient = _build_gradient_image(size, base_rgb, accent_rgb).convert("RGBA")

    if logo_bytes:
        try:
            logo = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
            max_w = int(size[0] * 0.75)
            max_h = int(size[1] * 0.7)
            logo.thumbnail((max_w, max_h), Image.LANCZOS)
            x = (size[0] - logo.width) // 2
            y = (size[1] - logo.height) // 2
            gradient.paste(logo, (x, y), logo)
        except Exception as exc:
            logger.warning("Failed to compose strip logo: %s", exc)

    buffer = io.BytesIO()
    gradient.save(buffer, format="PNG")
    return buffer.getvalue()


def _build_strip_images(
    loyalty_settings: LoyaltySettings, logo_bytes: Optional[bytes]
) -> Dict[str, bytes]:
    base_color = loyalty_settings.pass_primary_color or "#0b0f19"
    accent_color = loyalty_settings.pass_label_color or "#f59e0b"
    return {
        "strip.png": _build_strip_image((320, 123), base_color, accent_color, logo_bytes),
        "strip@2x.png": _build_strip_image((640, 246), base_color, accent_color, logo_bytes),
    }


def _prepare_pass_images(settings_obj: StoreSettings, loyalty_settings: LoyaltySettings) -> Dict[str, bytes]:
    logo_bytes = _load_logo_bytes(settings_obj, loyalty_settings)
    images: Dict[str, bytes] = {}

    if logo_bytes:
        try:
            base = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
            images["logo.png"] = _resize_image(base, (160, 50))
            images["logo@2x.png"] = _resize_image(base, (320, 100))
            images["icon.png"] = _resize_image(base, (29, 29))
            images["icon@2x.png"] = _resize_image(base, (58, 58))
            images.update(_build_strip_images(loyalty_settings, logo_bytes))
            return images
        except Exception as exc:
            logger.warning("Failed to process pass logo: %s", exc)

    primary = loyalty_settings.pass_primary_color or "#000000"
    images["logo.png"] = _build_image_bytes(primary, (160, 50))
    images["logo@2x.png"] = _build_image_bytes(primary, (320, 100))
    images["icon.png"] = _build_image_bytes(primary, (29, 29))
    images["icon@2x.png"] = _build_image_bytes(primary, (58, 58))
    images.update(_build_strip_images(loyalty_settings, None))
    return images


def _resize_image(image: Image.Image, size: Tuple[int, int]) -> bytes:
    resized = image.copy()
    resized.thumbnail(size, Image.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    offset = ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2)
    canvas.paste(resized, offset)
    buffer = io.BytesIO()
    canvas.save(buffer, format="PNG")
    return buffer.getvalue()


def _parse_pass_template(settings_obj: StoreSettings) -> Dict:
    template_raw = (settings_obj.apple_pass_template or "").strip()
    if not template_raw:
        return {}
    try:
        parsed = json.loads(template_raw)
    except json.JSONDecodeError as exc:
        raise PassKitConfigError(f"Invalid apple_pass_template JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise PassKitConfigError("apple_pass_template must be a JSON object.")
    return parsed


def _ensure_auth_token(profile: LoyaltyProfile) -> str:
    if profile.apple_wallet_auth_token:
        return profile.apple_wallet_auth_token
    token = secrets.token_hex(16)
    profile.apple_wallet_auth_token = token
    profile.save(update_fields=["apple_wallet_auth_token"])
    return token


def _wallet_base_url(settings_obj: StoreSettings) -> str:
    base = settings_obj.wallet_pass_base_url or "https://example.invalid"
    return base.rstrip("/")


def _web_service_url(settings_obj: StoreSettings) -> str:
    configured = getattr(settings, "APPLE_WALLET_WEB_SERVICE_URL", "").strip()
    if configured:
        return configured.rstrip("/")
    return f"{_wallet_base_url(settings_obj)}/api/loyalty/passkit"


def _upsert_field(fields: Iterable[Dict], key: str, label: str, value) -> None:
    for field in fields:
        if field.get("key") == key:
            field["value"] = value
            field.setdefault("label", label)
            return
    fields.append({"key": key, "label": label, "value": value})


def build_pass_payload(profile: LoyaltyProfile) -> Dict:
    settings_obj = StoreSettings.objects.first() or StoreSettings.objects.create()
    loyalty_settings = LoyaltySettings.load()
    payload = _parse_pass_template(settings_obj)

    payload.setdefault("formatVersion", 1)
    payload.setdefault("organizationName", settings_obj.store_name)
    payload.setdefault("description", "Loyalty Card")
    if "logoText" not in payload:
        logo_available = bool(_load_logo_bytes(settings_obj, loyalty_settings))
        payload["logoText"] = "" if logo_available else settings_obj.store_name
    payload.setdefault("suppressStripShine", True)

    payload["serialNumber"] = profile.membership_id
    payload["authenticationToken"] = _ensure_auth_token(profile)
    payload["webServiceURL"] = _web_service_url(settings_obj)

    payload.setdefault("backgroundColor", loyalty_settings.pass_primary_color or "#000000")
    payload.setdefault("foregroundColor", loyalty_settings.pass_secondary_color or "#ffffff")
    payload.setdefault("labelColor", loyalty_settings.pass_label_color or "#ffffff")

    pass_type_identifier = payload.get("passTypeIdentifier")
    team_identifier = payload.get("teamIdentifier")
    if not pass_type_identifier or not team_identifier:
        raise PassKitConfigError("passTypeIdentifier/teamIdentifier must be set in apple_pass_template.")

    section = None
    for key in ("storeCard", "generic", "coupon", "eventTicket", "boardingPass"):
        if key in payload and isinstance(payload.get(key), dict):
            section = payload[key]
            break
    if section is None:
        payload["storeCard"] = {}
        section = payload["storeCard"]

    primary_fields = section.setdefault("primaryFields", [])
    secondary_fields = section.setdefault("secondaryFields", [])

    _upsert_field(primary_fields, "points", "Points", profile.points_balance or 0)
    _upsert_field(secondary_fields, "membership", "Member ID", profile.membership_id)

    barcode_message = profile.membership_id
    barcode = {
        "format": "PKBarcodeFormatQR",
        "message": barcode_message,
        "messageEncoding": "iso-8859-1",
    }
    if isinstance(payload.get("barcodes"), list):
        for entry in payload["barcodes"]:
            entry.update(barcode)
    else:
        payload["barcodes"] = [barcode]
    payload.setdefault("barcode", barcode)

    return payload


def build_pkpass(profile: LoyaltyProfile) -> Tuple[bytes, datetime]:
    payload = build_pass_payload(profile)
    settings_obj = StoreSettings.objects.first() or StoreSettings.objects.create()
    loyalty_settings = LoyaltySettings.load()

    pass_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    images = _prepare_pass_images(settings_obj, loyalty_settings)

    manifest = {"pass.json": hashlib.sha1(pass_json).hexdigest()}
    for name, data in images.items():
        manifest[name] = hashlib.sha1(data).hexdigest()

    manifest_json = json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode("utf-8")
    signature = _sign_manifest(manifest_json)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("pass.json", pass_json)
        for name, data in images.items():
            zf.writestr(name, data)
        zf.writestr("manifest.json", manifest_json)
        zf.writestr("signature", signature)

    last_modified = profile.updated_at or timezone.now()
    return buffer.getvalue(), last_modified


def _sign_manifest(manifest_json: bytes) -> bytes:
    key, cert, extra = _load_pass_certificate()
    wwdr = _load_wwdr_certificate()
    builder = PKCS7SignatureBuilder().set_data(manifest_json)
    builder = builder.add_signer(cert, key, hashes.SHA256())
    for extra_cert in extra:
        builder = builder.add_certificate(extra_cert)
    builder = builder.add_certificate(wwdr)
    return builder.sign(
        encoding=serialization.Encoding.DER,
        options=[PKCS7Options.DetachedSignature],
    )


def build_pass_response(pkpass_bytes: bytes, last_modified: datetime) -> Tuple[bytes, Dict[str, str]]:
    if timezone.is_naive(last_modified):
        last_modified = last_modified.replace(tzinfo=timezone.utc)
    headers = {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="loyalty.pkpass"',
        "Last-Modified": http_date(last_modified.timestamp()),
        "Cache-Control": "no-cache",
    }
    return pkpass_bytes, headers


def is_pass_modified_since(last_modified: datetime, if_modified_since: Optional[str]) -> bool:
    if not if_modified_since:
        return True
    try:
        since = parsedate_to_datetime(if_modified_since)
    except (TypeError, ValueError):
        return True
    if timezone.is_naive(since):
        since = since.replace(tzinfo=timezone.utc)
    else:
        since = since.astimezone(timezone.utc)
    return last_modified > since


def parse_passes_updated_since(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.isdigit():
            return datetime.fromtimestamp(int(value), tz=timezone.utc)
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if timezone.is_naive(parsed):
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None


def format_last_updated(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def get_expected_pass_type_identifier() -> Optional[str]:
    settings_obj = StoreSettings.objects.first()
    if not settings_obj:
        return None
    try:
        payload = _parse_pass_template(settings_obj)
    except PassKitConfigError as exc:
        logger.warning("Pass template error: %s", exc)
        return None
    return payload.get("passTypeIdentifier")


def verify_auth_token(profile: LoyaltyProfile, token: Optional[str]) -> bool:
    if not token:
        return False
    return profile.apple_wallet_auth_token == token


def extract_auth_token(auth_header: Optional[str]) -> Optional[str]:
    if not auth_header:
        return None
    parts = auth_header.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "applepass":
        return parts[1].strip()
    return auth_header.strip()


def send_apns_push(push_token: str, pass_type_identifier: str) -> None:
    if not push_token:
        return

    apns_host = getattr(settings, "APPLE_WALLET_APNS_HOST", "").strip()
    if not apns_host:
        apns_host = (
            "api.sandbox.push.apple.com"
            if getattr(settings, "APPLE_WALLET_APNS_SANDBOX", False)
            else "api.push.apple.com"
        )

    cert_file, key_file = _get_apns_cert_files()
    url = f"https://{apns_host}/3/device/{push_token}"
    headers = {
        "apns-topic": pass_type_identifier,
        "apns-push-type": "background",
        "apns-priority": "5",
    }
    try:
        with httpx.Client(http2=True, cert=(cert_file, key_file), timeout=5) as client:
            resp = client.post(url, json={"aps": {}}, headers=headers)
        if resp.status_code not in (200, 201):
            logger.warning("APNS push failed (%s): %s", resp.status_code, resp.text)
    except httpx.HTTPError as exc:
        logger.warning("APNS push error: %s", exc)


def _get_apns_cert_files() -> Tuple[str, str]:
    global _APNS_CERT_FILES
    if _APNS_CERT_FILES is not None:
        return _APNS_CERT_FILES

    key, cert, _extra = _load_pass_certificate()
    cert_pem = cert.public_bytes(encoding=serialization.Encoding.PEM)
    key_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    )

    cert_file = tempfile.NamedTemporaryFile(delete=False)
    key_file = tempfile.NamedTemporaryFile(delete=False)
    cert_file.write(cert_pem)
    key_file.write(key_pem)
    cert_file.flush()
    key_file.flush()
    cert_file.close()
    key_file.close()
    try:
        os.chmod(cert_file.name, 0o600)
        os.chmod(key_file.name, 0o600)
    except OSError:
        pass

    _APNS_CERT_FILES = (cert_file.name, key_file.name)
    return _APNS_CERT_FILES


def notify_pass_update(profile: LoyaltyProfile) -> None:
    registrations = LoyaltyPassRegistration.objects.filter(profile=profile)
    if not registrations:
        return
    for registration in registrations:
        send_apns_push(registration.push_token, registration.pass_type_identifier)
