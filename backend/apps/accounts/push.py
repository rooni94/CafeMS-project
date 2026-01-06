# backend/apps/accounts/push.py
import logging
from typing import Iterable, List, Optional

import requests
from django.conf import settings

from .models import PushToken

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = getattr(settings, "EXPO_PUSH_URL", "https://exp.host/--/api/v2/push/send")


def _chunk(items: List[str], size: int) -> Iterable[List[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def send_expo_push(tokens: List[str], title: str, body: str, data: Optional[dict] = None) -> None:
    tokens = [token for token in tokens if token]
    if not tokens:
        return

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    access_token = getattr(settings, "EXPO_ACCESS_TOKEN", "").strip()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    for batch in _chunk(tokens, 100):
        payload = [
            {
                "to": token,
                "title": title,
                "body": body,
                "data": data or {},
                "sound": "default",
            }
            for token in batch
        ]
        try:
            resp = requests.post(EXPO_PUSH_URL, json=payload, headers=headers, timeout=15)
        except requests.RequestException as exc:
            logger.warning("expo push request failed: %s", exc)
            continue

        if resp.status_code >= 400:
            logger.warning("expo push error %s: %s", resp.status_code, resp.text)
            continue

        try:
            body_json = resp.json()
        except ValueError:
            logger.warning("expo push response not json: %s", resp.text)
            continue

        for token, ticket in zip(batch, body_json.get("data", [])):
            if ticket.get("status") != "error":
                continue
            if ticket.get("details", {}).get("error") == "DeviceNotRegistered":
                PushToken.objects.filter(token=token).update(is_active=False)


def notify_user(user, title: str, body: str, data: Optional[dict] = None) -> None:
    tokens = list(
        PushToken.objects.filter(user=user, is_active=True).values_list("token", flat=True)
    )
    send_expo_push(tokens, title, body, data)


def notify_roles(roles: List[str], title: str, body: str, data: Optional[dict] = None) -> None:
    tokens = list(
        PushToken.objects.filter(user__role__in=roles, is_active=True).values_list("token", flat=True)
    )
    send_expo_push(tokens, title, body, data)
