export function gbp(value: number): string {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (abs >= 950_000) return `${sign}£${(abs / 1_000_000).toFixed(1)}m`;
  if (abs >= 950) return `${sign}£${Math.round(abs / 1000)}k`;
  return `${sign}£${Math.round(abs)}`;
}

export function gbpFull(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function whole(value: number): string {
  return Math.round(value).toLocaleString("en-GB");
}

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function score(value: number): string {
  return value.toFixed(2);
}

export function monthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}
