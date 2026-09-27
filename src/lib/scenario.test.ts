import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { defaultLevers, doNothingLevers, recommendedLevers } from "./levers";
import { fcrForScore, replayHistory, runScenario, scoreFromFcr } from "./scenario";
import type { Baseline } from "./types";

const baseline = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../data/baseline.json"),
    "utf8",
  ),
) as Baseline;

describe("historical reconstruction", () => {
  it("replays the 24 KPI months and ends at 1,599 open", () => {
    const result = replayHistory(baseline);
    expect(result.months).toBe(24);
    expect(result.openStock).toBe(1599);
    expect(baseline.totals.openBook).toBe(1599);
    expect(baseline.totals.opened).toBe(25416);
    expect(baseline.totals.closed).toBe(23817);
  });

  it("recovers a regulator score of 4.0 at about 58% FCR", () => {
    const fcr = fcrForScore(baseline, 4.0);
    expect(fcr).toBeGreaterThan(0.57);
    expect(fcr).toBeLessThan(0.59);
    expect(scoreFromFcr(baseline, fcr)).toBeCloseTo(4.0, 3);
    expect(baseline.scoreFit.fcrForScore4).toBeCloseTo(0.5842, 3);
  });
});

describe("forward paths", () => {
  it("keeps the default client-ask path in breach and more expensive than do-nothing", () => {
    const result = runScenario(baseline, defaultLevers(baseline));
    expect(result.levers.restartAskNorthwind).toBe(true);
    expect(result.chosen.month12Score).toBeLessThan(4);
    expect(result.chosen.month12Backlog).toBeGreaterThan(baseline.latest.openStock);
    expect(result.chosen.year1Bot).toBe(640000);
    expect(result.vsDoNothing.year1Net).toBeLessThan(0);
  });

  it("lets the recommended path avoid a penalty quarter and pay back inside a year", () => {
    const result = runScenario(baseline, recommendedLevers(baseline));
    expect(result.levers.restartAskNorthwind).toBe(false);
    expect(result.levers.readToBillApi).toBe(true);
    expect(result.levers.estimationFeedback).toBe(true);
    expect(result.chosen.month12Score).toBeGreaterThanOrEqual(3.95);
    expect(result.chosen.month12Backlog).toBeLessThan(result.doNothing.month12Backlog);
    expect(result.vsDoNothing.penaltyQuartersAvoided).toBeGreaterThanOrEqual(1);
    expect(result.vsDoNothing.paybackMonths).not.toBeNull();
    expect(result.vsDoNothing.paybackMonths ?? 99).toBeLessThanOrEqual(12);
  });

  it("does not pay back a smart-meter catch-up in twelve months", () => {
    const result = runScenario(baseline, {
      ...doNothingLevers(baseline),
      smartMeterCatchup: true,
    });
    expect(result.months24).toHaveLength(24);
    expect(result.chosen.year1Smart).toBeGreaterThan(30_000_000);
    expect(result.vsDoNothing.paybackMonths).toBeNull();
  });

  it("updates payback when FCR recovery is halved or the penalty is zero", () => {
    const recommendedPath = runScenario(baseline, recommendedLevers(baseline));
    const half = recommendedPath.sensitivity.find((item) => item.id === "halfFcr");
    const zero = recommendedPath.sensitivity.find((item) => item.id === "zeroPenalty");
    expect(half).toBeTruthy();
    expect(zero).toBeTruthy();
    expect(half?.month12Score).toBeLessThan(recommendedPath.chosen.month12Score);
    expect(zero?.paybackLabel).not.toBe(recommendedPath.vsDoNothing.paybackLabel);
  });
});
