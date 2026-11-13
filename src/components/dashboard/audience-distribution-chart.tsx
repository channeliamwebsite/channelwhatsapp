"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import type { AudienceSegment } from "@/types/dashboard";
import { formatCompact, formatNumber, formatPercent, percentOf } from "@/lib/utils";

/**
 * Categorical palette, assigned in fixed order (validated for colour-vision
 * deficiency). Values are always shown as text too, so colour is never the
 * only cue.
 */
const SEGMENT_COLORS = ["#e31e35", "#2f6fde", "#1a9e8a", "#eda100", "#6250d6"] as const;

function colorAt(index: number) {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

function SegmentTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const entry = payload?.[0];
  if (!active || !entry) return null;
  const segment = entry.payload as AudienceSegment & { share: number };
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg shadow-[#260d12]/8">
      <p className="font-semibold text-foreground">{segment.name}</p>
      <p className="mt-0.5 tabular-nums text-muted-foreground">
        {formatNumber(segment.contacts)} contacts · {formatPercent(segment.share)}
      </p>
    </div>
  );
}

export function AudienceDistributionChart({ segments }: { segments: AudienceSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.contacts, 0);
  const data = segments.map((s) => ({ ...s, share: percentOf(s.contacts, total) }));

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
      <div className="relative size-44 shrink-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="contacts"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((segment, i) => (
                <Cell key={segment.id} fill={colorAt(i)} />
              ))}
            </Pie>
            <Tooltip content={SegmentTooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-foreground">{formatCompact(total)}</span>
          <span className="text-[11px] text-muted-foreground">contacts</span>
        </div>
      </div>

      {/* Legend doubles as the accessible data table */}
      <table className="w-full text-xs">
        <caption className="sr-only">Contacts by primary audience</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Audience</th>
            <th scope="col">Contacts</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((segment, i) => (
            <tr key={segment.id} className="border-b border-border last:border-0">
              <th scope="row" className="py-2 pr-2 text-left font-medium text-foreground">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ background: colorAt(i) }} aria-hidden="true" />
                  <span className="truncate">{segment.name}</span>
                </span>
              </th>
              <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">
                {formatNumber(segment.contacts)}
              </td>
              <td className="w-12 py-2 text-right font-semibold tabular-nums text-foreground">
                {formatPercent(segment.share, 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
