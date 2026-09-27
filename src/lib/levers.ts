import type { Baseline, Levers } from "./types";

export const STORAGE_KEY = "northwind-levers";

export function defaultLevers(baseline: Baseline): Levers {
  return {
    restartAskNorthwind: true,
    readToBillApi: false,
    estimationFeedback: false,
    smartMeterCatchup: false,
    transferStart: baseline.transferRate,
    transferTarget: baseline.assumptions.transferTarget,
    fcrTarget: baseline.scoreFit.fcrForScore4,
    fcrRecoveryScale: 1,
    penaltyPerQuarter: baseline.unitCosts.penaltyPerQuarter,
    apiBuildCost: baseline.assumptions.apiBuildCost,
    apiRunAnnual: baseline.assumptions.apiRunAnnual,
  };
}

export function doNothingLevers(baseline: Baseline): Levers {
  return {
    ...defaultLevers(baseline),
    restartAskNorthwind: false,
    readToBillApi: false,
    estimationFeedback: false,
    smartMeterCatchup: false,
    fcrRecoveryScale: 1,
    penaltyPerQuarter: baseline.unitCosts.penaltyPerQuarter,
  };
}

export function recommendedLevers(baseline: Baseline): Levers {
  return {
    ...defaultLevers(baseline),
    restartAskNorthwind: false,
    readToBillApi: true,
    estimationFeedback: true,
    smartMeterCatchup: false,
  };
}

export function parseLevers(
  baseline: Baseline,
  input: Partial<Levers> | Record<string, unknown> | null | undefined,
): Levers {
  const base = defaultLevers(baseline);
  if (!input || typeof input !== "object") return base;
  const raw = input as Record<string, unknown>;
  const bool = (key: string, fallback: boolean) => {
    const value = raw[key];
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
    return fallback;
  };
  const num = (key: string, fallback: number) => {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
    return fallback;
  };
  return {
    restartAskNorthwind: bool("restartAskNorthwind", bool("bot", base.restartAskNorthwind)),
    readToBillApi: bool("readToBillApi", bool("api", base.readToBillApi)),
    estimationFeedback: bool(
      "estimationFeedback",
      bool("loop", base.estimationFeedback),
    ),
    smartMeterCatchup: bool(
      "smartMeterCatchup",
      bool("smart", base.smartMeterCatchup),
    ),
    transferStart: num("transferStart", base.transferStart),
    transferTarget: num("transferTarget", num("xfer", base.transferTarget)),
    fcrTarget: num("fcrTarget", base.fcrTarget),
    fcrRecoveryScale: num("fcrRecoveryScale", num("fcrScale", base.fcrRecoveryScale)),
    penaltyPerQuarter: num("penaltyPerQuarter", num("penalty", base.penaltyPerQuarter)),
    apiBuildCost: num("apiBuildCost", base.apiBuildCost),
    apiRunAnnual: num("apiRunAnnual", base.apiRunAnnual),
  };
}

export function leversFromSearchParams(
  baseline: Baseline,
  params: URLSearchParams,
): Levers {
  const raw: Record<string, string> = {};
  params.forEach((value, key) => {
    raw[key] = value;
  });
  return parseLevers(baseline, raw);
}

export function leversToSearchParams(levers: Levers): URLSearchParams {
  const params = new URLSearchParams();
  params.set("bot", levers.restartAskNorthwind ? "1" : "0");
  params.set("api", levers.readToBillApi ? "1" : "0");
  params.set("loop", levers.estimationFeedback ? "1" : "0");
  params.set("smart", levers.smartMeterCatchup ? "1" : "0");
  params.set("xfer", String(levers.transferTarget));
  params.set("fcr", String(levers.fcrTarget));
  if (levers.fcrRecoveryScale !== 1) {
    params.set("fcrScale", String(levers.fcrRecoveryScale));
  }
  if (levers.penaltyPerQuarter === 0) {
    params.set("penalty", "0");
  }
  return params;
}

export function valueHref(levers: Levers): string {
  return `/value?${leversToSearchParams(levers).toString()}`;
}

export function sameLevers(a: Levers, b: Levers): boolean {
  return (
    a.restartAskNorthwind === b.restartAskNorthwind &&
    a.readToBillApi === b.readToBillApi &&
    a.estimationFeedback === b.estimationFeedback &&
    a.smartMeterCatchup === b.smartMeterCatchup &&
    a.transferTarget === b.transferTarget &&
    a.fcrTarget === b.fcrTarget &&
    a.fcrRecoveryScale === b.fcrRecoveryScale &&
    a.penaltyPerQuarter === b.penaltyPerQuarter
  );
}
