"use client";

type StatProps = {
  label: string;
  value: string;
  assumption: string;
  tone?: "default" | "gold" | "danger" | "good";
};

const toneClass = {
  default: "text-cream",
  gold: "text-gold",
  danger: "text-danger",
  good: "text-good",
};

export function Stat({ label, value, assumption, tone = "default" }: StatProps) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted">{label}</div>
      <div className={`mt-1 font-serif text-4xl leading-none sm:text-5xl ${toneClass[tone]}`}>
        {value}
      </div>
      <p className="mt-3 max-w-sm text-sm leading-snug text-muted">{assumption}</p>
    </div>
  );
}

type ToggleProps = {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
  defaultNote?: string;
};

export function Toggle({ on, onChange, label, hint, defaultNote }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-start gap-4 rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-gold/40"
    >
      <span
        className={`mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full border ${
          on ? "border-gold bg-gold" : "border-line bg-panel-2"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-ink transition ${on ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-2">
          <span className="text-cream">{label}</span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-gold">
            {on ? "On" : "Off"}
          </span>
          {defaultNote ? (
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted">{defaultNote}</span>
          ) : null}
        </span>
        <span className="mt-1 block text-sm leading-snug text-muted">{hint}</span>
      </span>
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-muted">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ""))}
          className="w-16 rounded-md border border-line bg-ink px-2 py-1 text-right text-cream outline-none focus:border-gold"
        />
        {suffix ? <span>{suffix}</span> : null}
      </span>
    </label>
  );
}
