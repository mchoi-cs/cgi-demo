#!/usr/bin/env python3
"""Aggregate the six Northwind CSVs into src/data/baseline.json.

The UI and forecast never hand-type historical numbers. Re-run:

    python3 scripts/build_baseline.py
"""

from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = ROOT / "src" / "data" / "baseline.json"

DAYS_PER_MONTH = 30.4
BILLING_CATS = {
    "Billing - disputed amount",
    "Billing - estimated read",
    "Metering - no read taken",
}
EST_NO_READ_CATS = {
    "Billing - estimated read",
    "Metering - no read taken",
}
LEGACY_REGIONS = ("Barrowdale", "Dunmoor")
SMART_REGIONS = ("Ashford", "Calderfield", "Eastmarch", "Fenwick")
HIGHLIGHT_SYSTEMS = ("SYS-03", "SYS-05", "SYS-06", "SYS-15")


def read_csv(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def ols(xs: list[float], ys: list[float]) -> tuple[float, float, float]:
    n = len(xs)
    mx, my = mean(xs), mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den = sum((x - mx) ** 2 for x in xs)
    slope = num / den
    intercept = my - slope * mx
    ss_res = sum((y - (intercept + slope * x)) ** 2 for x, y in zip(xs, ys))
    ss_tot = sum((y - my) ** 2 for y in ys)
    r2 = 1 - ss_res / ss_tot if ss_tot else 0.0
    return intercept, slope, r2


def fnum(value: float, digits: int = 6) -> float:
    return round(float(value), digits)


def main() -> None:
    kpis = read_csv("northwind_monthly_kpis.csv")
    complaints = read_csv("northwind_complaints.csv")
    meters = read_csv("northwind_meter_reads.csv")
    pilot_rows = read_csv("northwind_ai_pilot_2025.csv")
    systems = read_csv("northwind_systems.csv")
    unit_rows = read_csv("northwind_unit_costs.csv")

    stock = 0
    stock_flow = []
    nets: list[int] = []
    for row in kpis:
        opened = int(row["complaints_opened"])
        closed = int(row["complaints_closed"])
        net = opened - closed
        stock += net
        nets.append(net)
        stock_flow.append(
            {
                "month": row["month"],
                "opened": opened,
                "closed": closed,
                "net": net,
                "openStock": stock,
                "avgDays": float(row["avg_days_to_close"]),
                "fcr": float(row["first_contact_resolution_rate"]),
                "score": float(row["regulator_satisfaction_score_of_5"]),
                "inboundCalls": int(row["inbound_calls"]),
                "costToServePerAccount": float(row["cost_to_serve_per_account"]),
            }
        )

    latest = stock_flow[-1]
    first = stock_flow[0]
    opened_total = sum(m["opened"] for m in stock_flow)
    closed_total = sum(m["closed"] for m in stock_flow)
    last6 = stock_flow[-6:]
    last12_months = [m["month"] for m in stock_flow[-12:]]

    fcrs = [m["fcr"] for m in stock_flow]
    scores = [m["score"] for m in stock_flow]
    intercept, slope, r2 = ols(fcrs, scores)
    fcr_for_4 = (4.0 - intercept) / slope
    months_span = len(stock_flow) - 1
    fcr_slope = (latest["fcr"] - first["fcr"]) / months_span
    days_slope = (latest["avgDays"] - first["avgDays"]) / months_span
    score_slope = (latest["score"] - first["score"]) / months_span

    implied_days = latest["openStock"] / latest["closed"] * DAYS_PER_MONTH
    days_calibration = latest["avgDays"] / implied_days

    open_rows = [r for r in complaints if r["status"] == "Open"]
    open_by_category = Counter(r["category"] for r in open_rows)
    billing_open = sum(open_by_category[c] for c in BILLING_CATS)
    info_only_open = sum(
        1 for r in open_rows if r["resolvable_by_information_only"] == "1"
    )
    transfer_rate = mean(
        1.0 if r["transferred_between_systems"] == "1" else 0.0 for r in complaints
    )
    last12_complaints = [
        r for r in complaints if r["date_opened"][:7] in last12_months
    ]
    transfer_last12 = mean(
        1.0 if r["transferred_between_systems"] == "1" else 0.0
        for r in last12_complaints
    )

    accounts_by_region: dict[str, int] = {}
    systems_by_region: dict[str, str] = {}
    first_meter: dict[str, dict[str, str]] = {}
    last_meter: dict[str, dict[str, str]] = {}
    for row in meters:
        region = row["region"]
        accounts_by_region[region] = int(row["accounts"])
        systems_by_region[region] = row["systems_serving_region"]
        if region not in first_meter:
            first_meter[region] = row
        last_meter[region] = row

    est_no_read_last12: dict[str, int] = defaultdict(int)
    for row in last12_complaints:
        if row["category"] in EST_NO_READ_CATS:
            est_no_read_last12[row["region"]] += 1

    regions = []
    for region in sorted(accounts_by_region):
        accounts = accounts_by_region[region]
        per_1000 = est_no_read_last12[region] / accounts * 1000
        estate = "legacy" if region in LEGACY_REGIONS else "smart"
        regions.append(
            {
                "region": region,
                "estate": estate,
                "accounts": accounts,
                "systems": systems_by_region[region],
                "smartPenetrationFirst": float(first_meter[region]["smart_meter_penetration"]),
                "smartPenetrationLatest": float(last_meter[region]["smart_meter_penetration"]),
                "estimatedReadFirst": float(first_meter[region]["estimated_read_rate"]),
                "estimatedReadLatest": float(last_meter[region]["estimated_read_rate"]),
                "estNoReadComplaintsLast12": est_no_read_last12[region],
                "estNoReadPer1000": fnum(per_1000, 4),
            }
        )

    ashford = next(r for r in regions if r["region"] == "Ashford")
    legacy_regions = [r for r in regions if r["estate"] == "legacy"]
    smart_regions = [r for r in regions if r["estate"] == "smart"]
    legacy_accounts = sum(r["accounts"] for r in legacy_regions)
    excess_vs_ashford = 0.0
    for row in legacy_regions:
        rate = row["estNoReadPer1000"]
        excess_vs_ashford += (rate - ashford["estNoReadPer1000"]) / 1000 * row["accounts"]

    pilot = []
    implied = []
    for row in pilot_rows:
        sessions = int(row["assistant_sessions"])
        after_rate = float(row["complaint_raised_after_session_rate"])
        implied_complaints = sessions * after_rate
        implied.append(implied_complaints)
        opened_that_month = next(
            m["opened"] for m in stock_flow if m["month"] == row["month"]
        )
        pilot.append(
            {
                "month": row["month"],
                "sessions": sessions,
                "containment": float(row["fully_contained_rate"]),
                "escalation": float(row["escalated_to_agent_rate"]),
                "abandoned": float(row["abandoned_rate"]),
                "repeat7d": float(row["repeat_contact_within_7_days_rate"]),
                "csat": float(row["assistant_csat_of_5"]),
                "complaintAfterSession": after_rate,
                "impliedComplaints": fnum(implied_complaints, 1),
                "complaintsOpenedThatMonth": opened_that_month,
            }
        )

    unit_costs = {row["item"]: float(row["unit_cost"]) for row in unit_rows}
    system_index = {row["system_id"]: row for row in systems}
    highlighted = {
        sid: {
            "id": sid,
            "name": system_index[sid]["system_name"],
            "purpose": system_index[sid]["purpose"],
            "yearInstalled": int(system_index[sid]["year_installed"]),
            "annualRunCost": float(system_index[sid]["annual_run_cost"]),
            "notes": system_index[sid]["notes"],
        }
        for sid in HIGHLIGHT_SYSTEMS
    }

    accounts_total = sum(accounts_by_region.values())
    cost_rise = latest["costToServePerAccount"] - first["costToServePerAccount"]
    smart_unit = unit_costs["Smart meter installation"]
    smart_capex = legacy_accounts * smart_unit
    api_people = 6
    api_months = 6
    api_rate = 25000
    api_build = api_people * api_months * api_rate

    containment_slope = (pilot[-1]["containment"] - pilot[0]["containment"]) / (
        len(pilot) - 1
    )

    baseline = {
        "sourceFiles": [
            "northwind_monthly_kpis.csv",
            "northwind_complaints.csv",
            "northwind_meter_reads.csv",
            "northwind_ai_pilot_2025.csv",
            "northwind_systems.csv",
            "northwind_unit_costs.csv",
        ],
        "stockFlow": stock_flow,
        "totals": {
            "opened": opened_total,
            "closed": closed_total,
            "openBook": latest["openStock"],
            "startStock": 0,
        },
        "latest": {
            "month": latest["month"],
            "openStock": latest["openStock"],
            "avgDays": latest["avgDays"],
            "fcr": latest["fcr"],
            "score": latest["score"],
            "opened": latest["opened"],
            "closed": latest["closed"],
            "inboundCalls": latest["inboundCalls"],
            "costToServePerAccount": latest["costToServePerAccount"],
        },
        "recentNet": {
            "last6": [m["net"] for m in last6],
            "average": fnum(mean(m["net"] for m in last6), 4),
        },
        "doNothing": {
            "avgOpenedLast6": fnum(mean(m["opened"] for m in last6), 4),
            "avgClosedLast6": fnum(mean(m["closed"] for m in last6), 4),
            "netLast6": fnum(mean(m["net"] for m in last6), 4),
            "fcrMonthlySlope": fnum(fcr_slope, 6),
            "daysMonthlySlope": fnum(days_slope, 6),
            "scoreMonthlySlope": fnum(score_slope, 6),
        },
        "scoreFit": {
            "intercept": fnum(intercept, 6),
            "slope": fnum(slope, 6),
            "r2": fnum(r2, 6),
            "fcrForScore4": fnum(fcr_for_4, 6),
        },
        "littlesLaw": {
            "impliedDays": fnum(implied_days, 4),
            "reportedDays": latest["avgDays"],
            "closesLastMonth": latest["closed"],
            "daysPerMonth": DAYS_PER_MONTH,
            "calibration": fnum(days_calibration, 6),
        },
        "transferRate": fnum(transfer_rate, 6),
        "transferRateLast12": fnum(transfer_last12, 6),
        "openCases": {
            "total": len(open_rows),
            "billingRelated": billing_open,
            "infoOnly": info_only_open,
            "byCategory": dict(open_by_category),
        },
        "accountsTotal": accounts_total,
        "regions": regions,
        "legacy": {
            "regions": list(LEGACY_REGIONS),
            "accounts": legacy_accounts,
            "smartPenetration": 0.0,
            "estimatedReadLatestAvg": fnum(
                mean(r["estimatedReadLatest"] for r in legacy_regions), 4
            ),
            "estNoReadPer1000": {
                r["region"]: r["estNoReadPer1000"] for r in legacy_regions
            },
            "excessVsAshfordAnnual": fnum(excess_vs_ashford, 2),
        },
        "smartEstate": {
            "regions": list(SMART_REGIONS),
            "smartPenetrationFirst": smart_regions[0]["smartPenetrationFirst"],
            "smartPenetrationLatest": fnum(
                mean(r["smartPenetrationLatest"] for r in smart_regions), 4
            ),
        },
        "ashford": {
            "estNoReadPer1000": ashford["estNoReadPer1000"],
            "estimatedReadFirst": ashford["estimatedReadFirst"],
            "estimatedReadLatest": ashford["estimatedReadLatest"],
        },
        "pilot": {
            "months": pilot,
            "impliedComplaintsMonthlyAvg": fnum(mean(implied), 1),
            "actualOpenedDuringPilotAvg": fnum(
                mean(m["complaintsOpenedThatMonth"] for m in pilot), 1
            ),
            "containmentMonthlySlope": fnum(containment_slope, 6),
            "caveat": (
                "Do not add the pilot's complaint-after-session volume on top of "
                "the complaint file. Implied volume exceeds complaints actually opened."
            ),
        },
        "systems": highlighted,
        "unitCosts": {
            "complaint": unit_costs["Complaint handled end to end (average)"],
            "complaintTransferred": unit_costs[
                "Complaint handled end to end (transferred between systems)"
            ],
            "billCorrection": unit_costs["Manual bill correction and re-issue"],
            "meterVisit": unit_costs["Field meter visit"],
            "call": unit_costs["Inbound call handled by agent"],
            "penaltyPerQuarter": unit_costs[
                "Regulator penalty, enhanced monitoring"
            ],
            "askNorthwindAnnual": unit_costs["AskNorthwind assistant pilot"],
            "smartMeterInstall": smart_unit,
            "costToServeFirst": first["costToServePerAccount"],
            "costToServeLatest": latest["costToServePerAccount"],
            "costToServeRisePerAccount": fnum(cost_rise, 4),
            "costToServeRiseAnnual": fnum(cost_rise * accounts_total, 2),
        },
        "assumptions": {
            "label": "Team assumptions, not client data",
            "apiBuildPeople": api_people,
            "apiBuildMonths": api_months,
            "apiBuildRatePerPersonMonth": api_rate,
            "apiBuildCost": api_build,
            "apiRunAnnual": 180000,
            "smartMeterCount": legacy_accounts,
            "smartMeterCapex": smart_capex,
            "smartMeterMonths": 24,
            "transferTarget": 0.05,
            "fcrTarget": fnum(fcr_for_4, 6),
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(baseline, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(
        f"open book {baseline['totals']['openBook']}, "
        f"score fit FCR@4.0 {baseline['scoreFit']['fcrForScore4']}, "
        f"legacy excess {baseline['legacy']['excessVsAshfordAnnual']}"
    )


if __name__ == "__main__":
    main()
