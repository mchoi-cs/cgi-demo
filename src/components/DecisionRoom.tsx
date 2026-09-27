"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ForecastChart, PilotChart, RegionRateChart, StockFlowChart } from "@/components/charts";
import { Field, Stat, Toggle } from "@/components/ui";
import { gbp, pct, score, whole } from "@/lib/format";
import {
  leversFromSearchParams,
  leversToSearchParams,
  recommendedLevers,
  sameLevers,
  STORAGE_KEY,
  valueHref,
} from "@/lib/levers";
import { doNothingLevers, runScenario } from "@/lib/scenario";
import type { Baseline, Levers } from "@/lib/types";

const BEATS = [
  { id: 1, label: "Brief" },
  { id: 2, label: "Estates" },
  { id: 3, label: "Pilot" },
  { id: 4, label: "Console" },
  { id: 5, label: "Value" },
] as const;

export function DecisionRoom({ baseline }: { baseline: Baseline }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [beat, setBeat] = useState(1);
  const levers = leversFromSearchParams(
    baseline,
    new URLSearchParams(searchParams.toString()),
  );

  const updateLevers = (next: Levers) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    router.replace(`${pathname}?${leversToSearchParams(next).toString()}`, {
      scroll: false,
    });
  };

  const patch = (partial: Partial<Levers>) => updateLevers({ ...levers, ...partial });

  const scenario = useMemo(() => runScenario(baseline, levers), [baseline, levers]);
  const nothing = useMemo(
    () => runScenario(baseline, doNothingLevers(baseline)),
    [baseline],
  );
  const recommended = recommendedLevers(baseline);
  const isRecommended = sameLevers(levers, recommended);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        setBeat((current) => Math.min(5, current + 1));
      }
      if (event.key === "ArrowLeft") {
        setBeat((current) => Math.max(1, current - 1));
      }
      if (event.key >= "1" && event.key <= "5") {
        setBeat(Number(event.key));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="room-grid min-h-screen px-4 py-5 sm:px-8">
      <header className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">
            Northwind Energy
            <Link href="/slides" className="ml-5 tracking-[0.2em] text-muted hover:text-gold">
              Slides
            </Link>
          </p>
          <h1 className="font-serif text-3xl text-cream sm:text-4xl">Decision Room</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            The board asked for a triage bot. The data asks for a pipe from meter to bill to agent.
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <Mini label="Open book" value={whole(baseline.latest.openStock)} />
          <Mini label="Days" value={baseline.latest.avgDays.toFixed(1)} />
          <Mini label="Score" value={score(baseline.latest.score)} />
        </div>
      </header>

      <nav className="mx-auto mt-6 flex max-w-6xl flex-wrap gap-2">
        {BEATS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setBeat(item.id)}
            className={`rounded-full border px-4 py-2 text-sm ${
              beat === item.id
                ? "border-gold bg-gold/10 text-gold"
                : "border-line text-muted hover:border-gold/40 hover:text-cream"
            }`}
          >
            <span className="mr-2 font-mono text-[11px]">0{item.id}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto mt-8 max-w-6xl">
        {beat === 1 ? <QueueBeat baseline={baseline} /> : null}
        {beat === 2 ? <EstatesBeat baseline={baseline} /> : null}
        {beat === 3 ? <PilotBeat baseline={baseline} /> : null}
        {beat === 4 ? (
          <ConsoleBeat
            baseline={baseline}
            levers={levers}
            patch={patch}
            updateLevers={updateLevers}
            scenario={scenario}
            nothing={nothing}
            isRecommended={isRecommended}
          />
        ) : null}
        {beat === 5 ? <ValueBeat scenario={scenario} levers={levers} /> : null}
      </main>

      <footer className="mx-auto mt-10 flex max-w-6xl items-center justify-between border-t border-line pt-5 text-sm text-muted">
        <button type="button" onClick={() => setBeat((current) => Math.max(1, current - 1))}>
          ← Back
        </button>
        <span>Click a beat, or use the arrow keys.</span>
        {beat === 5 ? (
          <Link href={valueHref(levers)} className="text-gold">
            Open the value case →
          </Link>
        ) : (
          <button
            type="button"
            className="text-gold"
            onClick={() => setBeat((current) => Math.min(5, current + 1))}
          >
            Continue →
          </button>
        )}
      </footer>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="font-serif text-2xl text-cream">{value}</div>
    </div>
  );
}

function QueueBeat({ baseline }: { baseline: Baseline }) {
  return (
    <section>
      <h2 className="max-w-3xl font-serif text-4xl leading-tight text-cream sm:text-5xl">
        Another assistant does not close a billing queue.
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        The brief is a writing problem. The file is a stock-flow problem. Opened
        {" "}{whole(baseline.totals.opened)}, closed {whole(baseline.totals.closed)}, still
        open {whole(baseline.totals.openBook)}. It started at zero.
      </p>
      <div className="mt-8 rounded-3xl border border-line bg-panel/80 p-5">
        <StockFlowChart months={baseline.stockFlow} />
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <Stat
          label="Days to close"
          value={`${baseline.stockFlow[0].avgDays.toFixed(1)} → ${baseline.latest.avgDays.toFixed(1)}`}
          assumption="KPI file, every region. Transfers stayed near 35% the whole time, so they did not cause the slide."
        />
        <Stat
          label="First-contact resolution"
          value={`${pct(baseline.stockFlow[0].fcr)} → ${pct(baseline.latest.fcr, 1)}`}
          assumption={`Score tracks FCR almost perfectly. A 4.0 needs FCR of ${pct(baseline.scoreFit.fcrForScore4, 1)}, not a better script.`}
          tone="gold"
        />
        <Stat
          label="Little's law"
          value={`${baseline.littlesLaw.impliedDays.toFixed(1)} days`}
          assumption={`${whole(baseline.latest.openStock)} open / ${whole(baseline.latest.closed)} closes in Sep 2026 × 30.4 days. Reported days were ${baseline.latest.avgDays}.`}
        />
      </div>
    </section>
  );
}

function EstatesBeat({ baseline }: { baseline: Baseline }) {
  const legacy = baseline.regions.filter((region) => region.estate === "legacy");
  const smart = baseline.regions.filter((region) => region.estate === "smart");
  return (
    <section>
      <h2 className="max-w-3xl font-serif text-4xl leading-tight text-cream sm:text-5xl">
        Two estates. The brief treats them as one.
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Barrowdale and Dunmoor still run Aurora and MeterHub. Zero smart meters, about 60% estimated reads.
        The other four went from 30% to 81% smart. Ashford&apos;s estimated-read rate still rose.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-panel/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            Estimated-read + no-read complaints / 1,000 accounts, last 12 months
          </p>
          <RegionRateChart regions={baseline.regions} />
        </div>
        <div className="grid gap-4">
          <EstateCard title="Legacy pair" regions={legacy} note="SYS-01 Aurora · SYS-06 MeterHub" />
          <EstateCard title="Smart four" regions={smart} note="SYS-02 Helix · SYS-07 SmartRead" />
        </div>
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <Stat
          label="Open billing cases"
          value={whole(baseline.openCases.billingRelated)}
          assumption={`Of ${whole(baseline.openCases.total)} open cases, ${whole(baseline.openCases.billingRelated)} are billing dispute, estimated read, or no read. Open information-only flags: ${baseline.openCases.infoOnly}.`}
          tone="danger"
        />
        <Stat
          label="Ashford estimated reads"
          value={`${pct(baseline.ashford.estimatedReadFirst, 1)} → ${pct(baseline.ashford.estimatedReadLatest, 1)}`}
          assumption="Smart meters rose and the estimate rate still climbed. Hardware is not the whole pipe."
        />
        <Stat
          label="Legacy excess"
          value={`${whole(baseline.legacy.excessVsAshfordAnnual)} / year`}
          assumption={`If Barrowdale and Dunmoor moved to Ashford's ${baseline.ashford.estNoReadPer1000.toFixed(2)} per 1,000, about ${whole(baseline.legacy.excessVsAshfordAnnual)} estimated-read and no-read complaints would not open.`}
          tone="gold"
        />
      </div>
    </section>
  );
}

function EstateCard({
  title,
  regions,
  note,
}: {
  title: string;
  regions: Baseline["regions"];
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-panel/80 p-5">
      <div className="text-[11px] uppercase tracking-[0.2em] text-gold">{title}</div>
      <p className="mt-1 text-sm text-muted">{note}</p>
      <div className="mt-4 grid gap-3">
        {regions.map((region) => (
          <div key={region.region} className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-cream">{region.region}</div>
              <div className="text-xs text-muted">
                {whole(region.accounts)} accounts · smart {pct(region.smartPenetrationLatest)}
              </div>
            </div>
            <div className="font-serif text-2xl text-cream">{region.estNoReadPer1000.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PilotBeat({ baseline }: { baseline: Baseline }) {
  const first = baseline.pilot.months[0];
  const last = baseline.pilot.months[baseline.pilot.months.length - 1];
  return (
    <section>
      <h2 className="max-w-3xl font-serif text-4xl leading-tight text-cream sm:text-5xl">
        Nine months of AskNorthwind. It got worse.
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Northwind Connect cannot show a bill breakdown. A triage bot on that estate escalates.
      </p>
      <div className="mt-8 rounded-3xl border border-line bg-panel/80 p-5">
        <PilotChart months={baseline.pilot.months} />
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-4">
        <Stat
          label="Containment"
          value={`${pct(first.containment)} → ${pct(last.containment, 1)}`}
          assumption="Pilot file, Jan–Sep 2025. Fully contained sessions fell every month."
          tone="danger"
        />
        <Stat
          label="Escalation"
          value={`${pct(first.escalation)} → ${pct(last.escalation, 1)}`}
          assumption="More work landed on agents, not less."
        />
        <Stat
          label="CSAT"
          value={`${first.csat.toFixed(1)} → ${last.csat.toFixed(2)}`}
          assumption="Assistant score of 5. Repeat contact rose from 31% to 45%."
        />
        <Stat
          label="Contract"
          value={gbp(baseline.unitCosts.askNorthwindAnnual)}
          assumption="SYS-15 vendor cost, paused. Restarting it is the client ask on the next screen."
          tone="gold"
        />
      </div>
      <aside className="mt-8 rounded-3xl border border-gold/30 bg-gold/5 p-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Treat the pilot as evidence of harm</p>
        <p className="mt-2 max-w-3xl text-cream">
          {baseline.pilot.caveat} Implied complaints after a session averaged{" "}
          {whole(baseline.pilot.impliedComplaintsMonthlyAvg)} a month. Complaints actually opened
          during those months averaged {whole(baseline.pilot.actualOpenedDuringPilotAvg)}.
        </p>
        <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2">
          <p>
            <span className="text-cream">SYS-03 Northwind Connect.</span> {baseline.systems["SYS-03"].notes}
          </p>
          <p>
            <span className="text-cream">SYS-06 MeterHub.</span> {baseline.systems["SYS-06"].notes}
          </p>
          <p>
            <span className="text-cream">SYS-05 CallCentre One.</span> {baseline.systems["SYS-05"].notes}
          </p>
          <p>
            <span className="text-cream">SYS-15 AskNorthwind.</span> {baseline.systems["SYS-15"].notes}
          </p>
        </div>
      </aside>
    </section>
  );
}

function ConsoleBeat({
  baseline,
  levers,
  patch,
  updateLevers,
  scenario,
  nothing,
  isRecommended,
}: {
  baseline: Baseline;
  levers: Levers;
  patch: (partial: Partial<Levers>) => void;
  updateLevers: (next: Levers) => void;
  scenario: ReturnType<typeof runScenario>;
  nothing: ReturnType<typeof runScenario>;
  isRecommended: boolean;
}) {
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-3xl text-cream">Levers</h2>
          <button
            type="button"
            onClick={() => updateLevers(recommendedLevers(baseline))}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${
              isRecommended ? "border-gold text-gold" : "border-line text-muted hover:text-cream"
            }`}
          >
            Recommended path
          </button>
        </div>
        <Toggle
          on={levers.restartAskNorthwind}
          onChange={(restartAskNorthwind) => patch({ restartAskNorthwind })}
          label="Restart AskNorthwind"
          defaultNote="Client ask · on by default"
          hint={`£640k a year. FCR follows the 2025 pilot slope. The backlog does not clear.`}
        />
        <div className="rounded-2xl border border-line bg-panel p-4">
          <Toggle
            on={levers.readToBillApi}
            onChange={(readToBillApi) => patch({ readToBillApi })}
            label="Read-to-bill API and one desktop"
            hint="Wraps MeterHub, SmartRead, Aurora, Helix, and CaseTrack. Team assumption, not client data: 6 people × 6 months × £25k = £900k, plus £180k/year."
          />
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            <Field
              label="Transfer share moves toward"
              suffix="%"
              value={(levers.transferTarget * 100).toFixed(0)}
              onChange={(value) => {
                const next = Number(value);
                if (Number.isFinite(next)) patch({ transferTarget: next / 100 });
              }}
            />
            <Field
              label="FCR climbs toward"
              suffix="%"
              value={(levers.fcrTarget * 100).toFixed(1)}
              onChange={(value) => {
                const next = Number(value);
                if (Number.isFinite(next)) patch({ fcrTarget: next / 100 });
              }}
            />
            <p className="text-xs text-muted">
              Starts at {pct(levers.transferStart)} transfers. Score 4.0 needs about{" "}
              {pct(baseline.scoreFit.fcrForScore4, 1)} FCR.
            </p>
          </div>
        </div>
        <Toggle
          on={levers.estimationFeedback}
          onChange={(estimationFeedback) => patch({ estimationFeedback })}
          label="Estimation feedback loop"
          hint={`Corrected bills go back into MeterHub. Legacy rates move toward Ashford's ${baseline.ashford.estNoReadPer1000.toFixed(2)} per 1,000 — about ${whole(baseline.legacy.excessVsAshfordAnnual)} fewer complaints a year at the far end.`}
        />
        <Toggle
          on={levers.smartMeterCatchup}
          onChange={(smartMeterCatchup) => patch({ smartMeterCatchup })}
          label="Smart-meter catch-up"
          defaultNote="Off by default"
          hint={`${whole(baseline.assumptions.smartMeterCount)} meters × £${baseline.unitCosts.smartMeterInstall} = ${gbp(baseline.assumptions.smartMeterCapex)}. 24-month install. Weak 12-month payback.`}
        />
      </div>
      <div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Stat
            label="Backlog in 12 months"
            value={whole(scenario.chosen.month12Backlog)}
            tone={scenario.chosen.month12Backlog < nothing.chosen.month12Backlog ? "good" : "danger"}
            assumption={`Do-nothing ends at ${whole(scenario.doNothing.month12Backlog)}. Arrivals start from the last-six-month average of ${whole(baseline.doNothing.avgOpenedLast6)}.`}
          />
          <Stat
            label="Regulator score"
            value={score(scenario.chosen.month12Score)}
            tone={scenario.chosen.month12Score >= 4 ? "good" : "gold"}
            assumption={`score = ${baseline.scoreFit.intercept.toFixed(2)} + ${baseline.scoreFit.slope.toFixed(2)} × FCR. Month-12 FCR ${pct(scenario.chosen.month12Fcr, 1)}.`}
          />
          <Stat
            label="Payback vs do-nothing"
            value={scenario.vsDoNothing.paybackLabel}
            tone={scenario.vsDoNothing.year1Net > 0 ? "good" : "danger"}
            assumption={`Year-1 net ${gbp(scenario.vsDoNothing.year1Net)}. Claims only avoided handling, transfer premium, bot cost, and penalty quarters — never the whole £9.3m cost-to-serve rise.`}
          />
        </div>
        <div className="mt-6 rounded-3xl border border-line bg-panel/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            Twelve-month path{levers.smartMeterCatchup ? " · smart-meter series to 24 months" : ""}
          </p>
          <ForecastChart
            chosen={scenario.months}
            doNothing={nothing.months}
            smart={scenario.months24}
          />
        </div>
        <p className="mt-4 text-sm text-muted">{scenario.assumptions[0]}</p>
      </div>
    </section>
  );
}

function ValueBeat({
  scenario,
  levers,
}: {
  scenario: ReturnType<typeof runScenario>;
  levers: Levers;
}) {
  return (
    <section>
      <h2 className="max-w-3xl font-serif text-4xl leading-tight text-cream sm:text-5xl">
        Pay for a pipe. Do not rent another assistant.
      </h2>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <Stat
          label="Year-1 net vs do-nothing"
          value={gbp(scenario.vsDoNothing.year1Net)}
          tone={scenario.vsDoNothing.year1Net > 0 ? "good" : "danger"}
          assumption="Avoided complaint handling, avoided transfer premium, bot contract, labelled API cost, smart-meter capex, and penalty quarters only."
        />
        <Stat
          label="Penalty quarters avoided"
          value={String(scenario.vsDoNothing.penaltyQuartersAvoided)}
          assumption="£2.4m per quarter already in breach, from the unit-cost file. The API pays back inside a year if even one quarter is avoided."
          tone="gold"
        />
        <Stat
          label="Payback"
          value={scenario.vsDoNothing.paybackLabel}
          assumption="Turning the bot off saves £640k a year immediately. The £76.8m rollout does not pay back in twelve months."
        />
      </div>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          href={valueHref(levers)}
          className="rounded-full bg-gold px-6 py-3 text-sm text-ink hover:bg-cream"
        >
          Open the one-page value case
        </Link>
        <p className="text-sm text-muted">Printable. Same levers as this console.</p>
      </div>
    </section>
  );
}
