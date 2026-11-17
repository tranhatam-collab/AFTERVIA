"""Recompute AFTERVIA scenarios from explicit assumptions. No external services.
Usage: python finance/06_RECOMPUTE_MODEL.py
This is a planning model, not accounting or a forecast guarantee.
"""
from __future__ import annotations
import json
from pathlib import Path

def compute(inputs: dict) -> dict[str, dict[str, float]]:
    base = inputs["base_new_merchants"]
    c = inputs["common"]
    if len(base) != 24:
        raise ValueError("Expected exactly 24 acquisition inputs.")
    lag = c["settlement_lag_months"]
    if not isinstance(lag, int) or not 0 <= lag <= 24:
        raise ValueError("settlement_lag_months must be an integer from 0 to 24.")
    out = {}
    for name, s in inputs["scenarios"].items():
        m_end = f_end = cumulative = 0.0
        rows = []
        for i, base_new in enumerate(base):
            month = i + 1
            new_m = base_new * s["factor"]
            m_start = m_end
            m_end = m_start * (1 - s["merchant_churn"]) + new_m
            m_avg = (m_start + m_end) / 2
            registrations = m_avg * c["eligible_purchases_per_merchant_month"] * c["owner_registration_rate"]
            new_f = registrations * s["conversion"]
            f_start = f_end
            f_end = f_start * (1 - s["family_churn"]) + new_f
            f_avg = (f_start + f_end) / 2
            gross_m = m_avg * s["merchant_arpa"]
            gross_f = f_avg * c["family_monthly_price"]
            net = gross_m * (1-c["merchant_refunds"]) + gross_f * (1-c["family_refunds"])
            fees = gross_m*(1-c["merchant_refunds"])*c["merchant_fee"] + gross_f*(1-c["family_refunds"])*c["family_fee"]
            cogs = m_avg*c["merchant_direct_cost"] + f_avg*c["family_direct_cost"] + registrations*c["free_registration_cost"] + c["fixed_infra_cost"]
            base_opex = inputs["base_opex_monthly"][i]
            opex = base_opex * s["opex_factor"]
            acquisition = new_m*s["cac_m"] + new_f*s["cac_f"]
            operating = net-fees-cogs-opex-acquisition
            cash_in = net if lag == 0 else rows[i-lag]["net_revenue"] if i >= lag else 0
            cash_out = fees+cogs+opex+acquisition
            cumulative += cash_in-cash_out
            arr = (m_end*s["merchant_arpa"]*(1-c["merchant_refunds"]) + f_end*c["family_monthly_price"]*(1-c["family_refunds"]))*12
            rows.append({"net_revenue":net,"operating_result":operating,
                         "cumulative":cumulative,"net_arr":arr,
                         "merchants":m_end,"families":f_end})
        deficit = max(0, -min(r["cumulative"] for r in rows))
        out[name] = {
            "net_revenue_y1":sum(r["net_revenue"] for r in rows[:12]),
            "net_revenue_y2":sum(r["net_revenue"] for r in rows[12:]),
            "operating_result_y2":sum(r["operating_result"] for r in rows[12:]),
            "net_arr_m24":rows[-1]["net_arr"],
            "merchants_m24":m_end,"families_m24":f_end,
            "peak_deficit":deficit,"capital_with_buffer":deficit*(1+c["buffer"])
        }
    return out

if __name__ == "__main__":
    path = Path(__file__).with_name("03_MODEL_INPUTS.json")
    try:
        inputs = json.loads(path.read_text(encoding="utf-8"))
        print(json.dumps(compute(inputs),ensure_ascii=False,indent=2))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise SystemExit(f"Cannot recompute planning model: {exc}") from exc
