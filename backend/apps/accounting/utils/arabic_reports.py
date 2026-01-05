import datetime
from typing import Any, Dict, List


def format_number_ar(value: float) -> str:
    # Basic Arabic/RTL friendly formatting without external deps.
    return f"{value:,.2f}".replace(",", "،")


def build_report_metadata(title: str, period: str, generated_by: str | None = None) -> Dict[str, Any]:
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    return {
        "title_ar": title,
        "period_label": period,
        "generated_at": now,
        "generated_by": generated_by or "النظام",
    }


def combine_sections(sections: List[Dict[str, Any]]) -> Dict[str, Any]:
    meta = {"sections": sections}
    totals = {}
    for section in sections:
        for key, value in section.get("totals", {}).items():
            totals[key] = totals.get(key, 0) + value
    meta["totals"] = totals
    return meta
