"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthLabel } from "@/lib/format";
import type { ForecastMonth, PilotMonth, RegionRow, StockMonth } from "@/lib/types";

type TooltipPayload = { name?: string; value?: number; color?: string };

function ChartTip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-ink px-3 py-2 text-xs text-cream shadow-xl">
      <div className="mb-1 text-muted">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="flex gap-3">
          <span style={{ color: item.color }}>{item.name}</span>
          <span>{typeof item.value === "number" ? item.value.toLocaleString("en-GB") : item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function StockFlowChart({ months }: { months: StockMonth[] }) {
  const data = months.map((month) => ({
    label: monthLabel(month.month),
    Opened: month.opened,
    Closed: month.closed,
    "Open book": month.openStock,
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#2a3038" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8b8478", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#8b8478", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTip />} />
          <Bar dataKey="Opened" fill="#e8e2d6" fillOpacity={0.22} />
          <Bar dataKey="Closed" fill="#8aa37a" fillOpacity={0.45} />
          <Line type="monotone" dataKey="Open book" stroke="#c4a574" strokeWidth={2.4} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RegionRateChart({ regions }: { regions: RegionRow[] }) {
  const data = [...regions]
    .sort((a, b) => b.estNoReadPer1000 - a.estNoReadPer1000)
    .map((region) => ({
      label: region.region,
      Rate: Number(region.estNoReadPer1000.toFixed(2)),
      fill: region.estate === "legacy" ? "#c45c4a" : "#c4a574",
    }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
          <CartesianGrid stroke="#2a3038" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#8b8478", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tick={{ fill: "#e8e2d6", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTip />} />
          <Bar dataKey="Rate">
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PilotChart({ months }: { months: PilotMonth[] }) {
  const data = months.map((month) => ({
    label: monthLabel(month.month),
    Containment: Number((month.containment * 100).toFixed(1)),
    Escalation: Number((month.escalation * 100).toFixed(1)),
    Repeat: Number((month.repeat7d * 100).toFixed(1)),
    CSAT: month.csat,
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#2a3038" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8b8478", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="pct" tick={{ fill: "#8b8478", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="csat"
            orientation="right"
            domain={[1, 5]}
            tick={{ fill: "#8b8478", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTip />} />
          <Line yAxisId="pct" type="monotone" dataKey="Containment" stroke="#8aa37a" strokeWidth={2} dot={false} />
          <Line yAxisId="pct" type="monotone" dataKey="Escalation" stroke="#c45c4a" strokeWidth={2} dot={false} />
          <Line yAxisId="pct" type="monotone" dataKey="Repeat" stroke="#c4a574" strokeWidth={2} dot={false} />
          <Line yAxisId="csat" type="monotone" dataKey="CSAT" stroke="#e8e2d6" strokeDasharray="4 4" strokeWidth={1.6} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ForecastChart({
  chosen,
  doNothing,
  smart,
}: {
  chosen: ForecastMonth[];
  doNothing: ForecastMonth[];
  smart?: ForecastMonth[] | null;
}) {
  const series = (smart && smart.length > 12 ? smart : chosen).map((month, index) => ({
    label: monthLabel(month.month),
    Backlog: Math.round(month.backlog),
    Score: month.score,
    "Do-nothing backlog": Math.round(doNothing[Math.min(index, doNothing.length - 1)]?.backlog ?? 0),
    "Do-nothing score": doNothing[Math.min(index, doNothing.length - 1)]?.score ?? 0,
  }));
  const maxBacklog = Math.max(
    ...series.map((row) => Math.max(row.Backlog, row["Do-nothing backlog"])),
    100,
  );
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#2a3038" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8b8478", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="backlog"
            domain={[0, Math.ceil((maxBacklog * 1.15) / 100) * 100]}
            tick={{ fill: "#8b8478", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="score"
            orientation="right"
            domain={[1, 5]}
            tick={{ fill: "#8b8478", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTip />} />
          <Area
            yAxisId="backlog"
            type="monotone"
            dataKey="Do-nothing backlog"
            stroke="#8b8478"
            fill="#8b8478"
            fillOpacity={0.08}
            strokeDasharray="5 4"
          />
          <Area
            yAxisId="backlog"
            type="monotone"
            dataKey="Backlog"
            stroke="#c4a574"
            fill="#c4a574"
            fillOpacity={0.14}
            strokeWidth={2.2}
          />
          <Line yAxisId="score" type="monotone" dataKey="Score" stroke="#e8e2d6" strokeWidth={2} dot={false} />
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="Do-nothing score"
            stroke="#c45c4a"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
