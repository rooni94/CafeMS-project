from __future__ import annotations

import logging
import math
import uuid
from typing import Optional

from django.db import transaction
from django.utils import timezone

from .models import LoyaltyProfile, LoyaltySettings, LoyaltyTransaction

logger = logging.getLogger(__name__)

def get_or_create_profile(user) -> LoyaltyProfile:
    profile, created = LoyaltyProfile.objects.get_or_create(
        user=user,
        defaults={
            "membership_id": generate_membership_id(),
            "qr_token": uuid.uuid4().hex,
        },
    )
    if not created:
        profile.ensure_ids()
    return profile


def generate_membership_id() -> str:
    settings_obj = LoyaltySettings.load()
    prefix = settings_obj.qr_prefix or "LOYAL"
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


@transaction.atomic
def apply_points_change(
    profile: LoyaltyProfile,
    delta: int,
    source: str,
    note: str = "",
    order=None,
) -> LoyaltyTransaction:
    profile.points_balance = max(0, profile.points_balance + delta)
    profile.save(update_fields=["points_balance", "updated_at"])
    txn = LoyaltyTransaction.objects.create(
        profile=profile,
        points_delta=delta,
        source=source,
        note=note,
        order=order,
    )
    try:
        from .passkit import notify_pass_update

        notify_pass_update(profile)
    except Exception as exc:
        logger.warning("pass update notify failed: %s", exc)
    return txn


def award_points_for_order(order):
    if not order or not order.user_id:
        return

    settings_obj = LoyaltySettings.load()
    earn_rate = float(settings_obj.earn_rate or 0)
    if earn_rate <= 0:
        return

    points = int(math.floor(float(order.total or 0) * earn_rate))
    if points <= 0:
        return

    profile = get_or_create_profile(order.user)
    txn = apply_points_change(
        profile,
        points,
        source="order",
        note=f"Order #{order.id}",
        order=order,
    )
    auto_reward_if_needed(profile, settings_obj)
    return txn


def auto_reward_if_needed(
    profile: LoyaltyProfile, settings_obj: Optional[LoyaltySettings] = None
):
    settings_obj = settings_obj or LoyaltySettings.load()
    threshold = settings_obj.auto_reward_threshold
    if not threshold or profile.points_balance < threshold:
        return

    profile.points_balance -= threshold
    profile.last_reward_at = timezone.now()
    profile.save(update_fields=["points_balance", "last_reward_at", "updated_at"])
    LoyaltyTransaction.objects.create(
        profile=profile,
        points_delta=-threshold,
        source="reward",
        note=settings_obj.auto_reward_message,
    )
    try:
        from .passkit import notify_pass_update

        notify_pass_update(profile)
    except Exception as exc:
        logger.warning("pass update notify failed: %s", exc)


def adjust_points_by_membership(membership_id: str, delta: int, note: str = ""):
    try:
        profile = LoyaltyProfile.objects.select_for_update().get(
            membership_id=membership_id
        )
    except LoyaltyProfile.DoesNotExist:
        return None
    txn = apply_points_change(profile, delta, source="scan", note=note)
    return profile, txn
