from __future__ import annotations

import re


_NON_DIGIT = re.compile(r"\D+")


def normalize_phone(raw: str) -> str:
    """
    Normalize phone numbers to E.164-like format.

    Supports common Saudi formats:
      - 05xxxxxxxx  -> +9665xxxxxxxx
      - 9665xxxxxxx -> +9665xxxxxxx
      - +9665xxxxxx -> +9665xxxxxx
      - 009665xxxxx -> +9665xxxxx
    """
    value = (raw or "").strip()
    if not value:
        return ""

    value = value.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if value.startswith("00"):
        value = "+" + value[2:]

    if value.startswith("+"):
        plus = "+"
        digits = _NON_DIGIT.sub("", value[1:])
        return plus + digits

    digits = _NON_DIGIT.sub("", value)

    if digits.startswith("966") and len(digits) in (12, 13):
        return "+" + digits

    # Saudi local mobile 05xxxxxxxx (10 digits)
    if digits.startswith("05") and len(digits) == 10:
        return "+966" + digits[1:]

    # Fallback: prefix with +
    return "+" + digits if digits else ""


def is_plausible_e164(value: str) -> bool:
    if not value or not value.startswith("+"):
        return False
    digits = value[1:]
    return digits.isdigit() and 8 <= len(digits) <= 15

