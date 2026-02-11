from __future__ import annotations

from typing import Final

from .models import StoreSettings

DEFAULT_STORE_NAME: Final[str] = "لاڤـا كافيـه"


def get_store_name(default: str = DEFAULT_STORE_NAME) -> str:
    try:
        obj, _ = StoreSettings.objects.get_or_create(id=1)
        name = (obj.store_name or "").strip()
        return name or default
    except Exception:
        return default

