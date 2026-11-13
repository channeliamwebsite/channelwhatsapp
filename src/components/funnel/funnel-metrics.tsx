import { Card } from "@/components/ui/card";
import { BRANCHES, BRANCH_LABEL, EXIT_LABEL } from "@/lib/funnel/engine";
import type { FunnelMetrics } from "@/lib/funnel/metrics";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { ExitReason } from "@/types/funnel";

const KPIS: { key: keyof FunnelMetrics["rates"]; label: string; hint: string }[] = [
  { key: "delivery", label: "Delivery rate", hint: "Delivered ÷ sent" },
  { key: "read", label: "Read rate", hint: "Read ÷ delivered" },
  { key: "clickThrough", label: "Click-through", hint: "Clicked ÷ delivered" },
  { key: "reply", label: "Reply rate", hint: "Replied ÷ reached" },
  { key: "conversion", label: "Conversion", hint: "Converted ÷ started" },
  { key: "m1ToM2", label: "M1 → M2", hint: "Got Message 2 ÷ got Message 1" },
  { key: "m2ToM3", label: "M2 → M3", hint: "Got Message 3 ÷ got Message 2" },
  { key: "completion", label: "Funnel completion", hint: "Finished or converted ÷ started" },
];

export function FunnelKpis({ metrics }: { metrics: FunnelMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {KPIS.map((k) => (
        <Card key={k.key} className="gap-1 p-4">
          <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
          <p className="text-xl font-semibold tabular-nums">{formatPercent(metrics.rates[k.key])}</p>
          <p className="text-[11px] text-muted-foreground">{k.hint}</p>
        </Card>
      ))}
    </div>
  );
}

/** Horizontal bars: audience → M1 → M2 → M3 → converted. */
export function FunnelProgression({ metrics }: { metrics: FunnelMetrics }) {
  const rows = [
    { label: "In audience", value: metrics.audience, note: `${formatNumber(metrics.excluded)} excluded (consent / opt-out)` },
    { label: "Message 1 sent", value: metrics.steps[0].sent },
    { label: "Message 2 sent", value: metrics.steps[1].sent },
    { label: "Message 3 sent", value: metrics.steps[2].sent },
    { label: "Converted", value: metrics.converted },
  ];
  const max = Math.max(1, metrics.audience);
  return (
    <ol className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="font-medium text-foreground">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{formatNumber(r.value)}</span>
              {r.note && ` · ${r.note}`}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function BranchBreakdown({ metrics }: { metrics: FunnelMetrics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {([2, 3] as const).map((step) => (
        <table key={step} className="w-full text-xs">
          <caption className="mb-1.5 text-left text-xs font-semibold">Message {step} sends by behaviour</caption>
          <tbody>
            {BRANCHES.map((b) => (
              <tr key={b} className="border-b border-border last:border-0">
                <th scope="row" className="py-1.5 text-left font-normal text-muted-foreground">{BRANCH_LABEL[b]}</th>
                <td className="py-1.5 text-right font-semibold tabular-nums">{formatNumber(metrics.branches[step][b])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}

export function ExitBreakdown({ metrics }: { metrics: FunnelMetrics }) {
  const entries = Object.entries(metrics.exits) as [ExitReason, number][];
  if (!entries.length) return <p className="text-sm text-muted-foreground">No recipients have exited yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {entries.sort((a, b) => b[1] - a[1]).map(([reason, n]) => (
        <li key={reason} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs">
          {EXIT_LABEL[reason]} <span className="font-semibold tabular-nums">{formatNumber(n)}</span>
        </li>
      ))}
      {metrics.completed > 0 && <li className="rounded-lg bg-success-soft px-2.5 py-1.5 text-xs text-success">Completed <span className="font-semibold tabular-nums">{formatNumber(metrics.completed)}</span></li>}
      {metrics.waiting > 0 && <li className="rounded-lg bg-info-soft px-2.5 py-1.5 text-xs text-info">Waiting <span className="font-semibold tabular-nums">{formatNumber(metrics.waiting)}</span></li>}
    </ul>
  );
}
