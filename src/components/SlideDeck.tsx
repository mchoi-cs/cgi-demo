"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { gbp, pct, score, whole } from "@/lib/format";
import type { Baseline, ScenarioResult } from "@/lib/types";

type SlideDeckProps = {
  baseline: Baseline;
  clientAsk: ScenarioResult;
  recommendedPath: ScenarioResult;
  demoHref: string;
  valueHref: string;
};

type Slide = {
  kicker: string;
  notes: string;
  body: ReactNode;
};

function boardMoney(value: number): string {
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(2)}m`;
  if (abs >= 950) return `${sign}£${Math.round(abs / 1000)}k`;
  return `${sign}£${Math.round(abs)}`;
}

export function SlideDeck({
  baseline,
  clientAsk,
  recommendedPath,
  demoHref,
  valueHref,
}: SlideDeckProps) {
  const slides = useMemo(
    () => buildSlides(baseline, clientAsk, recommendedPath, demoHref),
    [baseline, clientAsk, recommendedPath, demoHref],
  );
  const [index, setIndex] = useState(0);
  const [notesOn, setNotesOn] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const last = slides.length - 1;
  const slide = slides[index];

  const go = useCallback(
    (next: number) => {
      setIndex(Math.min(last, Math.max(0, next)));
    },
    [last],
  );

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        go(index + 1);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(index - 1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        go(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        go(last);
      }
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        setNotesOn((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [go, index, last]);

  return (
    <div className="room-grid flex h-dvh flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="hidden text-gold sm:inline">CGI · Northwind</span>
          <Link href={demoHref} className="hover:text-cream">
            Live demo
          </Link>
          <Link href={valueHref} className="hover:text-cream">
            Value case
          </Link>
        </div>
        <p className="font-mono text-sm text-muted" aria-live="polite">
          {index + 1} / {slides.length}
        </p>
      </header>

      <main
        ref={contentRef}
        className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-5 py-2 sm:px-8"
        aria-roledescription="slide"
        aria-label={`${slide.kicker}. Slide ${index + 1} of ${slides.length}`}
      >
        <div className="flex min-h-full w-full flex-col justify-center py-2">{slide.body}</div>
      </main>

      {notesOn ? (
        <aside className="mx-auto w-full max-w-6xl shrink-0 border-t border-gold/30 bg-gold/5 px-5 py-3 sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Speaker</p>
          <p className="mt-1 max-w-4xl text-sm leading-relaxed text-cream">{slide.notes}</p>
        </aside>
      ) : null}

      <footer className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-3 border-t border-line px-5 py-3 pl-14 text-sm text-muted sm:px-8">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="disabled:opacity-30 hover:text-cream"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => setNotesOn((current) => !current)}
          aria-pressed={notesOn}
          className={`uppercase tracking-[0.16em] ${notesOn ? "text-gold" : "hover:text-cream"}`}
        >
          {notesOn ? "Notes on" : "Notes"}
          <span className="ml-2 font-mono text-[11px]">N</span>
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === last}
          className="text-gold disabled:opacity-30 hover:text-cream"
        >
          Next →
        </button>
      </footer>
    </div>
  );
}

function buildSlides(
  baseline: Baseline,
  clientAsk: ScenarioResult,
  recommendedPath: ScenarioResult,
  demoHref: string,
): Slide[] {
  const first = baseline.stockFlow[0];
  const pilotFirst = baseline.pilot.months[0];
  const pilotLast = baseline.pilot.months[baseline.pilot.months.length - 1];
  const half = recommendedPath.sensitivity.find((item) => item.id === "halfFcr");
  const zero = recommendedPath.sensitivity.find((item) => item.id === "zeroPenalty");
  const barrowdale = baseline.legacy.estNoReadPer1000.Barrowdale;
  const dunmoor = baseline.legacy.estNoReadPer1000.Dunmoor;

  return [
    {
      kicker: "Title",
      notes:
        "We are not here to sell another assistant. The score is a queue problem and a billing-systems problem. Twelve months is enough if we join meter to bill to agent. It is not enough if we restart AskNorthwind.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">CGI · Northwind Utilities</p>
          <h1 className="mt-5 max-w-4xl font-serif text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.05] text-cream">
            The twelve-month score target is an integration problem.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted sm:text-xl">
            A pipe from meter to bill to agent. Not another assistant.
          </p>
        </section>
      ),
    },
    {
      kicker: "What the board can already see",
      notes:
        "These numbers are already in the pack. 1,599 still open. Days at 38.2. Seventy-seven percent of cases miss SLA. Score 2.6, and the enhanced-monitoring letter is already on the table. We are naming the mechanism, not discovering a crisis.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Already in the pack</p>
          <h2 className="mt-3 max-w-3xl font-serif text-[clamp(2rem,4.5vw,3.4rem)] leading-tight text-cream">
            The board can already see the letter.
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            <Figure label="Open book" value={whole(baseline.latest.openStock)} />
            <Figure label="Days to close" value={baseline.latest.avgDays.toFixed(1)} />
            <Figure label="SLA breach" value="77%" tone="text-danger" />
            <Figure label="Regulator score" value="2.6" tone="text-gold" />
          </div>
          <p className="mt-8 text-muted">
            1.8 million accounts. Six regions. Enhanced monitoring is already with the board.
          </p>
        </section>
      ),
    },
    {
      kicker: "Diagnosis",
      notes:
        "The open book is opened minus closed. It started at zero. Days rose in every region. Transfers stayed near 35 percent the whole time, so channel-hopping is not the slide. The backlog is the queue.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Diagnosis</p>
          <h2 className="mt-3 max-w-4xl font-serif text-[clamp(2rem,4.5vw,3.4rem)] leading-tight text-cream">
            The backlog is the queue.
          </h2>
          <div className="mt-8 grid grid-cols-3 gap-6">
            <Figure label="Opened" value={whole(baseline.totals.opened)} />
            <Figure label="Closed" value={whole(baseline.totals.closed)} />
            <Figure label="Still open" value={whole(baseline.totals.openBook)} tone="text-gold" />
          </div>
          <div className="mt-8 max-w-3xl space-y-3 text-lg text-cream sm:text-xl">
            <p>Opened minus closed equals {whole(baseline.totals.openBook)}. It started at zero.</p>
            <p>Days rose in every region. {first.avgDays.toFixed(1)} to {baseline.latest.avgDays.toFixed(1)}.</p>
            <p className="text-muted">
              Transfer rate stayed near {pct(baseline.transferRate, 1)}. It did not cause the slide.
            </p>
          </div>
        </section>
      ),
    },
    {
      kicker: "The join",
      notes:
        "Complaints and meter reads belong on the same page. Barrowdale and Dunmoor still sit on Aurora from 1998 and MeterHub. Zero smart meters, about 60 percent estimated reads. Ashford is 1.33 estimated-plus-no-read complaints per thousand. Dunmoor is 4.44. Of 1,599 open cases, 1,095 are billing.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Complaints × meter reads</p>
          <h2 className="mt-3 max-w-4xl font-serif text-[clamp(2rem,4.5vw,3.4rem)] leading-tight text-cream">
            Estimated bills. Not the contact channel.
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-muted">
            Barrowdale and Dunmoor run Aurora, 1998, and MeterHub. Zero smart meters. About 60% estimated reads.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6">
            <Figure label="Ashford / 1,000" value={baseline.ashford.estNoReadPer1000.toFixed(2)} />
            <Figure label="Barrowdale / 1,000" value={barrowdale.toFixed(2)} tone="text-gold" />
            <Figure label="Dunmoor / 1,000" value={dunmoor.toFixed(2)} tone="text-danger" />
          </div>
          <p className="mt-8 text-lg text-cream sm:text-xl">
            {whole(baseline.openCases.billingRelated)} of {whole(baseline.openCases.total)} open cases are billing.
            Information-only open: {baseline.openCases.infoOnly}.
          </p>
        </section>
      ),
    },
    {
      kicker: "The 2025 pilot",
      notes:
        "Nine months of AskNorthwind. Containment fell. Escalation rose. CSAT fell. Repeat contact rose. Northwind Connect cannot show a bill, so the bot escalates. Do not add the pilot's implied complaints on top of the complaint file. That would double-count.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Jan–Sep 2025</p>
          <h2 className="mt-3 max-w-4xl font-serif text-[clamp(2rem,4.5vw,3.4rem)] leading-tight text-cream">
            The pilot got worse. Connect cannot show a bill.
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            <Figure
              label="Containment"
              value={`${pct(pilotFirst.containment)} → ${pct(pilotLast.containment)}`}
              tone="text-danger"
            />
            <Figure
              label="Escalation"
              value={`${pct(pilotFirst.escalation)} → ${pct(pilotLast.escalation)}`}
            />
            <Figure
              label="CSAT"
              value={`${pilotFirst.csat.toFixed(1)} → ${pilotLast.csat.toFixed(1)}`}
            />
            <Figure label="Contract" value={gbp(baseline.unitCosts.askNorthwindAnnual)} tone="text-gold" />
          </div>
          <p className="mt-8 max-w-3xl text-lg text-cream">
            Restarting it repeats the failure. Repeat contact {pct(pilotFirst.repeat7d)} → {pct(pilotLast.repeat7d)}.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-muted">
            Do not add the pilot&apos;s complaints after session (~{whole(baseline.pilot.impliedComplaintsMonthlyAvg)}
            /month) on top of recorded openings (~{whole(baseline.pilot.actualOpenedDuringPilotAvg)}/month).
          </p>
        </section>
      ),
    },
    {
      kicker: "Recommendation",
      notes:
        "Four moves, in order. Stop the assistant. Build the read-to-bill API and one agent desktop. Close the MeterHub feedback loop. Leave the seventy-six million pound meter programme for a later board. Sequence matters. Hardware last.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Sequence</p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,4.5vw,3.4rem)] leading-tight text-cream">
            Stop the assistant. Build the pipe.
          </h2>
          <ol className="mt-8 max-w-3xl space-y-4 text-lg text-cream sm:text-xl">
            <li>
              <span className="mr-3 font-mono text-sm text-gold">01</span>
              Leave AskNorthwind off.
            </li>
            <li>
              <span className="mr-3 font-mono text-sm text-gold">02</span>
              Build the read-to-bill API and one agent desktop.
            </li>
            <li>
              <span className="mr-3 font-mono text-sm text-gold">03</span>
              Close the MeterHub feedback loop.
            </li>
            <li>
              <span className="mr-3 font-mono text-sm text-gold">04</span>
              Defer the {gbp(baseline.assumptions.smartMeterCapex)} smart-meter catch-up.
            </li>
          </ol>
        </section>
      ),
    },
    {
      kicker: "Twelve-month paths",
      notes:
        "Left is the client ask: bot on, everything else off. Month 12 is 4,150 open, days capped at 120, score 1. It costs £640k more than doing nothing. Right is the recommended path. Month 12 is 148 open, 9.1 days, score 4. Same engine as the room you will click next.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Month 12 · same engine</p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,4.5vw,3.4rem)] leading-tight text-cream">
            Client ask versus recommended.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <PathCard
              title="Client ask"
              note="AskNorthwind on. Other levers off."
              backlog={clientAsk.chosen.month12Backlog}
              days={clientAsk.chosen.month12Days}
              fcr={clientAsk.chosen.month12Fcr}
              scoreValue={clientAsk.chosen.month12Score}
              money={boardMoney(clientAsk.vsDoNothing.year1Net)}
              payback={clientAsk.vsDoNothing.paybackLabel}
              warn
            />
            <PathCard
              title="Recommended"
              note="Bot off. API on. Feedback on. Meters off."
              backlog={recommendedPath.chosen.month12Backlog}
              days={recommendedPath.chosen.month12Days}
              fcr={recommendedPath.chosen.month12Fcr}
              scoreValue={recommendedPath.chosen.month12Score}
              money={boardMoney(recommendedPath.vsDoNothing.year1Net)}
              payback={recommendedPath.vsDoNothing.paybackLabel}
            />
          </div>
          <p className="mt-5 text-sm text-muted">
            Score = {baseline.scoreFit.intercept.toFixed(6)} + {baseline.scoreFit.slope.toFixed(6)} × FCR.
            A 4.0 needs {pct(baseline.scoreFit.fcrForScore4, 2)} FCR.
          </p>
        </section>
      ),
    },
    {
      kicker: "Live demo",
      notes:
        "I will open the decision room with the recommended levers already on the URL. I will walk the five beats and stop on Console: AskNorthwind off, API on, feedback on, smart meters off. Then the one-page value case. If the toggles look wrong, click Recommended path.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Handoff</p>
          <h2 className="mt-3 max-w-3xl font-serif text-[clamp(2rem,4.5vw,3.4rem)] leading-tight text-cream">
            One control. Open the room with the recommended levers on.
          </h2>
          <ol className="mt-8 max-w-2xl space-y-3 text-lg text-cream">
            <li>
              <span className="mr-3 font-mono text-sm text-gold">01</span>
              Open the decision room. Bot off, API on, feedback on, meters off.
            </li>
            <li>
              <span className="mr-3 font-mono text-sm text-gold">02</span>
              Click the five beats. Stop on Console.
            </li>
            <li>
              <span className="mr-3 font-mono text-sm text-gold">03</span>
              Open the value case from the gold link.
            </li>
          </ol>
          <Link
            href={demoHref}
            className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 text-sm text-ink hover:bg-cream"
          >
            Open the decision room
          </Link>
        </section>
      ),
    },
    {
      kicker: "Value case",
      notes:
        "Year-1 net is plus £1.49 million versus do-nothing. Payback is 12 months because one penalty quarter is avoided. Avoided handling is about £48k. Avoided transfer premium about £127k. If FCR recovery is half, or if the penalty is zero, it does not pay back. Build cost is a team assumption: six people, six months, £25k.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Cost · benefit · payback</p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,4.5vw,3.4rem)] leading-tight text-cream">
            The pipe pays back. The assistant does not.
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            <Figure
              label="Year-1 net vs do-nothing"
              value={boardMoney(recommendedPath.vsDoNothing.year1Net)}
              tone="text-good"
            />
            <Figure label="Payback" value={recommendedPath.vsDoNothing.paybackLabel} tone="text-gold" />
            <Figure
              label="Avoided handling"
              value={gbp(recommendedPath.vsDoNothing.avoidedComplaintHandling)}
            />
            <Figure
              label="Avoided transfer premium"
              value={gbp(recommendedPath.vsDoNothing.avoidedTransferPremium)}
            />
          </div>
          <p className="mt-6 text-cream">
            API year-1: £900k build + £180k run. One penalty quarter avoided (£2.4m).
          </p>
          <p className="mt-2 text-sm text-muted">
            Team assumption, not client data: 6 people × 6 months × £25k = £900k, run £180k/year.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <p className="rounded-2xl border border-line bg-panel/80 px-4 py-3 text-sm text-muted">
              <span className="text-cream">Half FCR recovery.</span> Score{" "}
              {score(half?.month12Score ?? 0)}. Year-1 net {boardMoney(half?.year1Net ?? 0)}.{" "}
              {half?.paybackLabel}.
            </p>
            <p className="rounded-2xl border border-line bg-panel/80 px-4 py-3 text-sm text-muted">
              <span className="text-cream">Penalty = £0.</span> Score {score(zero?.month12Score ?? 0)}.
              Year-1 net {boardMoney(zero?.year1Net ?? 0)}. {zero?.paybackLabel}.
            </p>
          </div>
        </section>
      ),
    },
    {
      kicker: "Delivery",
      notes:
        "Six people, six months. Two COBOL developers still understand Aurora. Helix support ends in 18 months. The penalty may not be payable. FCR recovery may be half. We will not start another assistant, rip out 15 systems, or lead with 519,000 meters.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">A small team</p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,4.5vw,3.4rem)] leading-tight text-cream">
            Six people. Six months. Then the loop.
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gold">Phases</p>
              <ul className="mt-3 space-y-2 text-cream">
                <li>Pause the assistant now.</li>
                <li>API and one desktop in six months.</li>
                <li>MeterHub loop as corrections flow.</li>
                <li>Meters later. Not year one.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gold">Risks we will name</p>
              <ul className="mt-3 space-y-2 text-cream">
                <li>The penalty may not be payable.</li>
                <li>FCR recovery may be half.</li>
                <li>Two COBOL developers on Aurora.</li>
                <li>Helix support ends in 18 months.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gold">What we will not do</p>
              <ul className="mt-3 space-y-2 text-cream">
                <li>Another assistant.</li>
                <li>A big-bang replacement of 15 systems.</li>
                <li>Lead with 519,000 smart meters.</li>
              </ul>
            </div>
          </div>
        </section>
      ),
    },
    {
      kicker: "The ask",
      notes:
        "The ask is narrow. Approve the recommended path. Leave the assistant off. Fund the £900k pipe. Hold the £76.8 million meter programme. Review the live room tonight. That is the decision.",
      body: (
        <section>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">The ask of the board</p>
          <h2 className="mt-4 max-w-4xl font-serif text-[clamp(2.4rem,5.5vw,4.2rem)] leading-[1.08] text-cream">
            Fund the pipe. Leave the assistant off. Hold the meters.
          </h2>
          <p className="mt-8 max-w-2xl text-lg text-muted">
            Approve the recommended path tonight. Review it in the room. The score is an integration problem, and the pipe is the work.
          </p>
        </section>
      ),
    },
  ];
}

function Figure({
  label,
  value,
  tone = "text-cream",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className={`mt-2 font-serif text-[clamp(1.7rem,3.6vw,3.1rem)] leading-none ${tone}`}>
        {value}
      </div>
    </div>
  );
}

function PathCard({
  title,
  note,
  backlog,
  days,
  fcr,
  scoreValue,
  money,
  payback,
  warn,
}: {
  title: string;
  note: string;
  backlog: number;
  days: number;
  fcr: number;
  scoreValue: number;
  money: string;
  payback: string;
  warn?: boolean;
}) {
  return (
    <div className={`rounded-3xl border bg-panel/80 p-5 ${warn ? "border-danger/40" : "border-gold/40"}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-gold">{title}</p>
      <p className="mt-1 text-sm text-muted">{note}</p>
      <p className="mt-5 font-serif text-[clamp(1.8rem,3vw,2.6rem)] leading-tight text-cream">
        {whole(backlog)} open · {days === 120 ? "120 days capped" : `${days.toFixed(1)} days`}
      </p>
      <p className="mt-2 text-lg text-cream">
        FCR {pct(fcr, 1)} · score {score(scoreValue)}
      </p>
      <p className={`mt-4 text-lg ${warn ? "text-danger" : "text-good"}`}>
        Year-1 vs do-nothing {money}
      </p>
      <p className="mt-1 text-sm text-muted">{payback}</p>
    </div>
  );
}
