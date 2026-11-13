"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import type { MessagePerformancePoint } from "@/types/dashboard";
import { formatCompact, formatNumber } from "@/lib/utils";

type SeriesKey = "sent" | "delivered" | "read";

const series: { key: SeriesKey; label: string; color: string }[] = [
  { key: "sent", label: "Sent", color: "var(--chart-1)" },
  { key: "delivered", label: "Delivered", color: "var(--chart-2)" },
  { key: "read", label: "Read", color: "var(--chart-3)" },
];

function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-lg border border-border bg-popover px-3 py-2.5 text-xs shadow-lg shadow-[#260d12]/8">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      <ul className="flex flex-col gap-1">
        {series.map((s) => {
          const entry = payload.find((p) => p.dataKey === s.key);
          if (!entry) return null;
          return (
            <li key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatNumber(Number(entry.value))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MessagePerformanceChart({ data }: { data: MessagePerformancePoint[] }) {
  return (
    <div>
      <ul className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Chart legend">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="h-[280px] w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={24}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => formatCompact(v)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              content={ChartTooltip}
              cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.35, strokeDasharray: "4 4" }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--card)" }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible table equivalent of the chart */}
      <table className="sr-only">
        <caption>Daily messages sent, delivered and read (sample data)</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {series.map((s) => (
              <th key={s.key} scope="col">{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.label}</th>
              {series.map((s) => (
                <td key={s.key}>{point[s.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
