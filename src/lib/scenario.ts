import type {
  Baseline,
  Comparison,
  ForecastMonth,
  Levers,
  MonthCash,
  PathSummary,
  ScenarioResult,
  SensitivityCase,
} from "./types";
import { defaultLevers, doNothingLevers, parseLevers } from "./levers";

export { defaultLevers, doNothingLevers, parseLevers };

const SCORE_THRESHOLD = 4.0;
const MIN_FCR = 0.2;
const MAX_FCR = 0.72;
const BOT_INTERFERENCE = 0.85;

export function scoreFromFcr(baseline: Baseline, fcr: number): number {
  const raw = baseline.scoreFit.intercept + baseline.scoreFit.slope * fcr;
  return clamp(raw, 1, 5);
}

export function fcrForScore(baseline: Baseline, score: number): number {
  return (score - baseline.scoreFit.intercept) / baseline.scoreFit.slope;
}

export function replayHistory(baseline: Baseline): {
  openStock: number;
  months: number;
} {
  let openStock = baseline.totals.startStock;
  for (const month of baseline.stockFlow) {
    openStock += month.opened - month.closed;
  }
  return { openStock, months: baseline.stockFlow.length };
}

export function addMonths(ym: string, count: number): string {
  const [year, month] = ym.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function allocate(total: number, span: number, index: number): number {
  if (total === 0 || index < 1 || index > span) return 0;
  const per = Math.round(total / span);
  return index < span ? per : total - per * (span - 1);
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function paybackLabel(months: number | null): string {
  if (months === null) return "Does not pay back in 12 months";
  if (months <= 1) return "Immediate";
  return `${months} months`;
}

function summarize(months: ForecastMonth[]): PathSummary {
  const year = months.slice(0, 12);
  const last = year[year.length - 1];
  return {
    month12Backlog: Math.round(last.backlog),
    month12Days: round(last.days, 1),
    month12Fcr: round(last.fcr, 4),
    month12Score: round(last.score, 2),
    year1Cost: round(year.reduce((sum, month) => sum + month.cash.total, 0)),
    year1Penalties: round(year.reduce((sum, month) => sum + month.cash.penalty, 0)),
    penaltyQuarters: year.filter((month) => month.cash.penalty > 0).length,
    year1ComplaintHandling: round(
      year.reduce((sum, month) => sum + month.cash.complaintHandling, 0),
    ),
    year1TransferPremium: round(
      year.reduce((sum, month) => sum + month.cash.transferPremium, 0),
    ),
    year1Bot: round(year.reduce((sum, month) => sum + month.cash.bot, 0)),
    year1Api: round(
      year.reduce((sum, month) => sum + month.cash.apiBuild + month.cash.apiRun, 0),
    ),
    year1Smart: round(year.reduce((sum, month) => sum + month.cash.smartMeter, 0)),
  };
}

function compare(doNothing: PathSummary, chosen: PathSummary): Comparison {
  const year1Net = round(doNothing.year1Cost - chosen.year1Cost);
  const penaltyQuartersAvoided = doNothing.penaltyQuarters - chosen.penaltyQuarters;
  const avoidedComplaintHandling = round(
    doNothing.year1ComplaintHandling - chosen.year1ComplaintHandling,
  );
  const avoidedTransferPremium = round(
    doNothing.year1TransferPremium - chosen.year1TransferPremium,
  );
  const botSavings = round(doNothing.year1Bot - chosen.year1Bot);
  return {
    year1Net,
    paybackMonths: null,
    paybackLabel: paybackLabel(null),
    penaltyQuartersAvoided,
    avoidedComplaintHandling,
    avoidedTransferPremium,
    botSavings,
  };
}

function compareWithMonths(
  baselineMonths: ForecastMonth[],
  chosenMonths: ForecastMonth[],
  summaries: Comparison,
): Comparison {
  let cumulative = 0;
  let paybackMonths: number | null = null;
  const horizon = Math.min(12, baselineMonths.length, chosenMonths.length);
  for (let i = 0; i < horizon; i += 1) {
    cumulative += baselineMonths[i].cash.total - chosenMonths[i].cash.total;
    if (paybackMonths === null && cumulative >= 0 && i > 0) {
      // Month 0 can be trivially zero; require a real crossing or a saving path.
      paybackMonths = i + 1;
    }
    if (paybackMonths === null && cumulative > 0) {
      paybackMonths = i + 1;
    }
  }
  if (cumulative < 0) paybackMonths = null;
  if (summaries.year1Net > 0 && paybackMonths === null) {
    paybackMonths = 12;
  }
  if (summaries.year1Net <= 0) paybackMonths = null;
  return {
    ...summaries,
    paybackMonths,
    paybackLabel: paybackLabel(paybackMonths),
  };
}

function projectMonths(
  baseline: Baseline,
  levers: Levers,
  horizon: number,
): ForecastMonth[] {
  const baseArrivals = baseline.doNothing.avgOpenedLast6;
  const baseClosures = baseline.doNothing.avgClosedLast6;
  const baseFcr = baseline.latest.fcr;
  const transferStart = levers.transferStart;
  const transferGap = levers.transferTarget - transferStart;
  const fcrGap = levers.fcrTarget - baseFcr;
  const annualExcess = baseline.legacy.excessVsAshfordAnnual;
  const monthlyEndAvoided = annualExcess / 12;
  const transferPremiumUnit =
    baseline.unitCosts.complaintTransferred - baseline.unitCosts.complaint;
  const apiBuildMonths = baseline.assumptions.apiBuildMonths;
  const smartMonths = baseline.assumptions.smartMeterMonths;

  const months: ForecastMonth[] = [];
  let backlog = baseline.latest.openStock;

  for (let i = 1; i <= horizon; i += 1) {
    const apiProgress = levers.readToBillApi ? clamp(i / 12, 0, 1) : 0;
    const feedbackProgress = levers.estimationFeedback ? clamp(i / 12, 0, 1) : 0;
    const smartProgress = levers.smartMeterCatchup
      ? clamp(i / smartMonths, 0, 1)
      : 0;
    const gapClosed = Math.max(feedbackProgress, smartProgress);
    const arrivalReduction = monthlyEndAvoided * gapClosed;
    const arrivals = Math.max(400, baseArrivals - arrivalReduction);

    let fcr: number;
    if (levers.readToBillApi) {
      const interference = levers.restartAskNorthwind ? BOT_INTERFERENCE : 1;
      fcr = baseFcr + fcrGap * apiProgress * levers.fcrRecoveryScale * interference;
    } else if (levers.restartAskNorthwind) {
      fcr = baseFcr + (baseline.doNothing.fcrMonthlySlope + baseline.pilot.containmentMonthlySlope) * i;
    } else {
      fcr = baseFcr + baseline.doNothing.fcrMonthlySlope * i;
    }
    fcr = clamp(fcr, MIN_FCR, MAX_FCR);

    const score = scoreFromFcr(baseline, fcr);
    const capacityFactor = Math.sqrt(fcr / baseFcr);
    const closures = Math.max(500, baseClosures * capacityFactor);
    backlog = Math.max(0, backlog + arrivals - closures);
    const days = clamp(
      (backlog / closures) * baseline.littlesLaw.daysPerMonth * baseline.littlesLaw.calibration,
      baseline.stockFlow[0].avgDays,
      120,
    );
    const transferRate = levers.readToBillApi
      ? clamp(transferStart + transferGap * apiProgress, 0.02, 0.6)
      : transferStart;

    const quarterEnd = i % 3 === 0;
    const inBreach = score < SCORE_THRESHOLD;
    const penalty =
      quarterEnd && inBreach && levers.penaltyPerQuarter > 0
        ? levers.penaltyPerQuarter
        : 0;
    const apiBuild = levers.readToBillApi
      ? allocate(levers.apiBuildCost, apiBuildMonths, i)
      : 0;
    const smartMeter = levers.smartMeterCatchup
      ? allocate(baseline.assumptions.smartMeterCapex, smartMonths, i)
      : 0;
    const botMonthly = levers.restartAskNorthwind
      ? allocate(baseline.unitCosts.askNorthwindAnnual, 12, ((i - 1) % 12) + 1)
      : 0;
    const apiRunMonthly = levers.readToBillApi
      ? allocate(levers.apiRunAnnual, 12, ((i - 1) % 12) + 1)
      : 0;
    const complaintHandling = arrivals * baseline.unitCosts.complaint;
    const transferPremium = arrivals * transferRate * transferPremiumUnit;
    const cash: MonthCash = {
      complaintHandling: round(complaintHandling),
      transferPremium: round(transferPremium),
      bot: round(botMonthly),
      apiBuild: round(apiBuild),
      apiRun: round(apiRunMonthly),
      smartMeter: round(smartMeter),
      penalty: round(penalty),
      total: 0,
    };
    cash.total = round(
      cash.complaintHandling +
        cash.transferPremium +
        cash.bot +
        cash.apiBuild +
        cash.apiRun +
        cash.smartMeter +
        cash.penalty,
    );

    months.push({
      month: addMonths(baseline.latest.month, i),
      index: i,
      arrivals: round(arrivals, 1),
      closures: round(closures, 1),
      backlog: round(backlog, 1),
      days: round(days, 1),
      fcr: round(fcr, 4),
      score: round(score, 2),
      transferRate: round(transferRate, 4),
      arrivalReduction: round(arrivalReduction, 1),
      inBreach,
      cash,
    });
  }

  return months;
}

function assumptionsFor(baseline: Baseline, levers: Levers): string[] {
  const lines = [
    `Do-nothing arrivals stay at the last-six-month average of ${Math.round(baseline.doNothing.avgOpenedLast6)} cases, with net growth of +${baseline.doNothing.netLast6.toFixed(0)} a month.`,
    `Regulator score uses the fitted line score = ${baseline.scoreFit.intercept.toFixed(2)} + ${baseline.scoreFit.slope.toFixed(2)} × FCR (R² ${baseline.scoreFit.r2.toFixed(3)}).`,
    `A score of 4.0 needs FCR of ${(baseline.scoreFit.fcrForScore4 * 100).toFixed(1)}%. Days use Little's law, calibrated to the reported 38.2.`,
    `Complaint cash is £${baseline.unitCosts.complaint} plus a £${baseline.unitCosts.complaintTransferred - baseline.unitCosts.complaint} transfer premium when work hops systems. Penalty is £${(levers.penaltyPerQuarter / 1_000_000).toFixed(1)}m per quarter while the score is below 4.0.`,
  ];
  if (levers.restartAskNorthwind) {
    lines.push(
      `AskNorthwind is on: £${(baseline.unitCosts.askNorthwindAnnual / 1000).toFixed(0)}k a year, and FCR follows the 2025 pilot slope. The backlog does not clear.`,
    );
  } else {
    lines.push("AskNorthwind stays paused, so the £640k vendor contract is not restarted.");
  }
  if (levers.readToBillApi) {
    lines.push(
      `Read-to-bill API (team assumption): transfer share of new cases moves from ${(levers.transferStart * 100).toFixed(0)}% toward ${(levers.transferTarget * 100).toFixed(0)}%, and FCR climbs toward ${(levers.fcrTarget * 100).toFixed(1)}% over 12 months. Build is 6 × 6 × £25k = £900k, plus £180k/year to run.`,
    );
  }
  if (levers.estimationFeedback) {
    lines.push(
      `Feedback loop: Barrowdale and Dunmoor estimated-read + no-read rates move toward Ashford's ${baseline.ashford.estNoReadPer1000.toFixed(2)} per 1,000 accounts (${Math.round(baseline.legacy.excessVsAshfordAnnual)} fewer complaints a year at the far end).`,
    );
  }
  if (levers.smartMeterCatchup) {
    lines.push(
      `Smart-meter catch-up: ${baseline.assumptions.smartMeterCount.toLocaleString("en-GB")} meters × £${baseline.unitCosts.smartMeterInstall} = £${(baseline.assumptions.smartMeterCapex / 1_000_000).toFixed(1)}m over 24 months.`,
    );
  }
  lines.push(
    `Cost-to-serve rose £${baseline.unitCosts.costToServeRisePerAccount.toFixed(2)}/account (£${(baseline.unitCosts.costToServeRiseAnnual / 1_000_000).toFixed(1)}m/year). This model claims only the slice tied to a lever — never that whole £9.3m.`,
  );
  return lines;
}

function sensitivityCases(
  baseline: Baseline,
  levers: Levers,
  doNothingMonths: ForecastMonth[],
): SensitivityCase[] {
  const half = { ...levers, fcrRecoveryScale: levers.fcrRecoveryScale * 0.5 };
  const zero = { ...levers, penaltyPerQuarter: 0 };
  const halfMonths = projectMonths(baseline, half, 12);
  const zeroMonths = projectMonths(baseline, zero, 12);
  const nothingZero = projectMonths(
    baseline,
    { ...doNothingLevers(baseline), penaltyPerQuarter: 0 },
    12,
  );
  const halfSummary = compareWithMonths(
    doNothingMonths,
    halfMonths,
    compare(summarize(doNothingMonths), summarize(halfMonths)),
  );
  const zeroSummary = compareWithMonths(
    nothingZero,
    zeroMonths,
    compare(summarize(nothingZero), summarize(zeroMonths)),
  );
  return [
    {
      id: "halfFcr",
      label: "If FCR recovery is half as large",
      month12Score: summarize(halfMonths).month12Score,
      year1Net: halfSummary.year1Net,
      paybackMonths: halfSummary.paybackMonths,
      paybackLabel: halfSummary.paybackLabel,
      penaltyQuarters: summarize(halfMonths).penaltyQuarters,
    },
    {
      id: "zeroPenalty",
      label: "If the penalty is zero",
      month12Score: summarize(zeroMonths).month12Score,
      year1Net: zeroSummary.year1Net,
      paybackMonths: zeroSummary.paybackMonths,
      paybackLabel: zeroSummary.paybackLabel,
      penaltyQuarters: 0,
    },
  ];
}

export function runScenario(
  baseline: Baseline,
  leversInput?: Partial<Levers> | Record<string, unknown> | null,
): ScenarioResult {
  const levers = parseLevers(baseline, leversInput ?? defaultLevers(baseline));
  const horizon = levers.smartMeterCatchup ? 24 : 12;
  const chosenAll = projectMonths(baseline, levers, horizon);
  const nothingAll = projectMonths(baseline, doNothingLevers(baseline), horizon);
  const months = chosenAll.slice(0, 12);
  const doNothingMonths = nothingAll.slice(0, 12);
  const chosen = summarize(months);
  const doNothing = summarize(doNothingMonths);
  const vsDoNothing = compareWithMonths(
    doNothingMonths,
    months,
    compare(doNothing, chosen),
  );

  return {
    levers,
    months,
    months24: levers.smartMeterCatchup ? chosenAll : null,
    chosen,
    doNothing,
    vsDoNothing,
    assumptions: assumptionsFor(baseline, levers),
    sensitivity: sensitivityCases(
      baseline,
      {
        ...levers,
        fcrRecoveryScale: 1,
        penaltyPerQuarter: baseline.unitCosts.penaltyPerQuarter,
      },
      doNothingMonths,
    ),
  };
}
