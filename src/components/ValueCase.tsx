"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ForecastChart } from "@/components/charts";
import { Stat } from "@/components/ui";
import { gbp, gbpFull, pct, score, whole } from "@/lib/format";
import {
  leversFromSearchParams,
  leversToSearchParams,
  recommendedLevers,
  STORAGE_KEY,
} from "@/lib/levers";
import { doNothingLevers, runScenario } from "@/lib/scenario";
import type { Baseline, Levers } from "@/lib/types";

export function ValueCase({ baseline }: { baseline: Baseline }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const levers = leversFromSearchParams(
    baseline,
    new URLSearchParams(searchParams.toString()),
  );

  const update = (next: Levers) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    router.replace(`${pathname}?${leversToSearchParams(next).toString()}`, {
      scroll: false,
    });
  };

  const scenario = useMemo(() => runScenario(baseline, levers), [baseline, levers]);
  const nothing = useMemo(
    () => runScenario(baseline, doNothingLevers(baseline)),
    [baseline],
  );
  const roomHref = `/?${leversToSearchParams(levers).toString()}`;

  return (
    <div className="print-sheet min-h-screen px-4 py-6 sm:px-8">
      <div className="no-print mx-auto flex max-w-5xl items-center justify-between gap-4 text-sm">
        <Link href={roomHref} className="text-muted hover:text-cream">
          ← Decision room
        </Link>
        <div className="flex gap-3">
          <button
            type="button"
            className="text-muted hover:text-cream"
            onClick={() => update(recommendedLevers(baseline))}
          >
            Recommended path
          </button>
          <button type="button" className="text-gold" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <article className="mx-auto mt-6 max-w-5xl rounded-3xl border border-line bg-panel/90 p-6 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Northwind Energy · one page</p>
        <h1 className="mt-2 font-serif text-4xl text-cream">Value case for the current scenario</h1>
        <p className="mt-3 max-w-3xl text-muted">
          Cost, benefit, and payback against do-nothing. Only the slice tied to a lever is claimed —
          avoided complaint handling, avoided transfer premium, the AskNorthwind contract, labelled
          build costs, and penalty quarters. Not the whole £9.3m cost-to-serve rise.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-muted">
          <Chip on={levers.restartAskNorthwind} label="AskNorthwind" />
          <Chip on={levers.readToBillApi} label="Read-to-bill API" />
          <Chip on={levers.estimationFeedback} label="Feedback loop" />
          <Chip on={levers.smartMeterCatchup} label="Smart meters" />
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <Stat
            label="Year-1 net vs do-nothing"
            value={gbp(scenario.vsDoNothing.year1Net)}
            tone={scenario.vsDoNothing.year1Net > 0 ? "good" : "danger"}
            assumption="Do-nothing keeps +56 cases a month and four penalty quarters."
          />
          <Stat
            label="Month-12 score"
            value={score(scenario.chosen.month12Score)}
            tone={scenario.chosen.month12Score >= 4 ? "good" : "gold"}
            assumption={`FCR ${pct(scenario.chosen.month12Fcr, 1)}. Backlog ${whole(scenario.chosen.month12Backlog)} versus ${whole(scenario.doNothing.month12Backlog)} if we do nothing.`}
          />
          <Stat
            label="Payback"
            value={scenario.vsDoNothing.paybackLabel}
            assumption="Turning the bot off saves £640k immediately. The API pays back inside a year if one penalty quarter is avoided. The £76.8m rollout does not."
          />
        </div>

        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.16em] text-muted">
              <th className="py-2 font-normal">Cash line</th>
              <th className="py-2 text-right font-normal">This path</th>
              <th className="py-2 text-right font-normal">Do-nothing</th>
              <th className="py-2 text-right font-normal">Delta</th>
            </tr>
          </thead>
          <tbody>
            <CashRow
              label="Complaint handling at £68"
              chosen={scenario.chosen.year1ComplaintHandling}
              none={scenario.doNothing.year1ComplaintHandling}
              note="Unit-cost file"
            />
            <CashRow
              label="Transfer premium at £53"
              chosen={scenario.chosen.year1TransferPremium}
              none={scenario.doNothing.year1TransferPremium}
              note="£121 transferred minus £68"
            />
            <CashRow
              label="AskNorthwind contract"
              chosen={scenario.chosen.year1Bot}
              none={scenario.doNothing.year1Bot}
              note="SYS-15, £640k/year"
            />
            <CashRow
              label="API build + run"
              chosen={scenario.chosen.year1Api}
              none={scenario.doNothing.year1Api}
              note="Team assumption: £900k + £180k"
            />
            <CashRow
              label="Smart-meter capex"
              chosen={scenario.chosen.year1Smart}
              none={scenario.doNothing.year1Smart}
              note="519,000 × £148, first 12 months"
            />
            <CashRow
              label="Regulator penalty"
              chosen={scenario.chosen.year1Penalties}
              none={scenario.doNothing.year1Penalties}
              note="£2.4m per quarter in breach"
            />
            <CashRow
              label="Year-1 total"
              chosen={scenario.chosen.year1Cost}
              none={scenario.doNothing.year1Cost}
              note="Lower is better"
              strong
            />
          </tbody>
        </table>

        <div className="mt-8 rounded-2xl border border-line bg-ink/40 p-4">
          <ForecastChart
            chosen={scenario.months}
            doNothing={nothing.months}
            smart={scenario.months24}
          />
        </div>

        <section className="mt-10">
          <h2 className="font-serif text-2xl text-cream">What if we are wrong</h2>
          <p className="mt-2 text-sm text-muted">
            Click a case. Payback updates from the same engine. These are not new data.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SensitivityCard
              active={levers.fcrRecoveryScale === 1 && levers.penaltyPerQuarter > 0}
              title="Base case"
              score={scenario.chosen.month12Score}
              payback={scenario.vsDoNothing.paybackLabel}
              net={scenario.vsDoNothing.year1Net}
              onClick={() =>
                update({
                  ...levers,
                  fcrRecoveryScale: 1,
                  penaltyPerQuarter: baseline.unitCosts.penaltyPerQuarter,
                })
              }
            />
            {scenario.sensitivity.map((item) => (
              <SensitivityCard
                key={item.id}
                active={
                  item.id === "halfFcr"
                    ? levers.fcrRecoveryScale < 1
                    : levers.penaltyPerQuarter === 0
                }
                title={item.label}
                score={item.month12Score}
                payback={item.paybackLabel}
                net={item.year1Net}
                onClick={() =>
                  update({
                    ...levers,
                    fcrRecoveryScale: item.id === "halfFcr" ? 0.5 : 1,
                    penaltyPerQuarter:
                      item.id === "zeroPenalty" ? 0 : baseline.unitCosts.penaltyPerQuarter,
                  })
                }
              />
            ))}
          </div>
        </section>

        <ul className="mt-8 space-y-2 text-sm text-muted">
          {scenario.assumptions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}

function Chip({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`rounded-full border px-3 py-1 ${on ? "border-gold text-gold" : "border-line"}`}>
      {label} {on ? "on" : "off"}
    </span>
  );
}

function CashRow({
  label,
  chosen,
  none,
  note,
  strong,
}: {
  label: string;
  chosen: number;
  none: number;
  note: string;
  strong?: boolean;
}) {
  const delta = none - chosen;
  return (
    <tr className={`border-b border-line/70 ${strong ? "text-cream" : "text-muted"}`}>
      <td className="py-3">
        <div className={strong ? "text-cream" : "text-cream"}>{label}</div>
        <div className="text-xs">{note}</div>
      </td>
      <td className="py-3 text-right text-cream">{gbpFull(chosen)}</td>
      <td className="py-3 text-right">{gbpFull(none)}</td>
      <td className={`py-3 text-right ${delta > 0 ? "text-good" : delta < 0 ? "text-danger" : ""}`}>
        {delta === 0 ? "—" : gbp(delta)}
      </td>
    </tr>
  );
}

function SensitivityCard({
  title,
  score: scoreValue,
  payback,
  net,
  active,
  onClick,
}: {
  title: string;
  score: number;
  payback: string;
  net: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left ${
        active ? "border-gold bg-gold/10" : "border-line hover:border-gold/40"
      }`}
    >
      <div className="text-xs text-muted">{title}</div>
      <div className="mt-2 font-serif text-2xl text-cream">{payback}</div>
      <p className="mt-2 text-sm text-muted">
        Score {score(scoreValue)} · year-1 net {gbp(net)}
      </p>
    </button>
  );
}
