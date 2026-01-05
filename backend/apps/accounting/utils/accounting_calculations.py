from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable, List, Sequence


def quantize_amount(value: Decimal) -> Decimal:
    return (value or Decimal("0")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_vat(amount: Decimal, rate: Decimal) -> Decimal:
    return quantize_amount((amount or Decimal("0")) * (rate or Decimal("0")) / Decimal("100"))


@dataclass
class JournalLinePayload:
    account_id: int
    debit: Decimal = Decimal("0.00")
    credit: Decimal = Decimal("0.00")
    description: str = ""


def validate_double_entry(lines: Sequence[JournalLinePayload]) -> None:
    debit_total = quantize_amount(sum((line.debit or Decimal("0.00")) for line in lines))
    credit_total = quantize_amount(sum((line.credit or Decimal("0.00")) for line in lines))
    if debit_total != credit_total:
        raise ValueError(
            f"Unbalanced journal: debit {debit_total} does not equal credit {credit_total}"
        )


def average_cost_valuation(costs: Iterable[Decimal], quantities: Iterable[Decimal]) -> Decimal:
    total_cost = sum(costs) if costs else Decimal("0")
    total_qty = sum(quantities) if quantities else Decimal("0")
    if not total_qty:
        return Decimal("0.00")
    return quantize_amount(total_cost / total_qty)


def fifo_valuation(layers: List[tuple[Decimal, Decimal]]) -> Decimal:
    """
    layers: List of tuples (quantity, unit_cost) ordered from oldest to newest.
    Returns weighted average of remaining layers.
    """
    total_cost = Decimal("0")
    total_qty = Decimal("0")
    for qty, cost in layers:
        total_qty += qty
        total_cost += qty * cost
    if not total_qty:
        return Decimal("0.00")
    return quantize_amount(total_cost / total_qty)
