import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { RecentCampaign } from "@/types/dashboard";
import { cn, formatDate, formatNumber, formatPercent, percentOf } from "@/lib/utils";

import { DashboardCard } from "./dashboard-card";
import { CampaignStatusBadge } from "./status-badge";

function DeliveryRate({ campaign }: { campaign: RecentCampaign }) {
  const rate = percentOf(campaign.stats.delivered, campaign.stats.sent);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted md:block" aria-hidden="true">
        <span
          className={cn("block h-full rounded-full", rate >= 90 ? "bg-success" : rate >= 70 ? "bg-warning" : "bg-destructive")}
          style={{ width: `${rate}%` }}
        />
      </span>
      <span className="font-medium tabular-nums text-foreground">{formatPercent(rate)}</span>
    </span>
  );
}

export function RecentCampaigns({
  campaigns,
  sample = false,
}: {
  campaigns: RecentCampaign[];
  sample?: boolean;
}) {
  return (
    <DashboardCard
      title="Recent campaigns"
      description="Latest broadcasts and their delivery performance"
      sample={sample}
      action={
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          View all
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      }
      contentClassName="px-0 pb-2"
    >
      {/* Table on md+ */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-5 py-2.5 font-semibold">Campaign</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Audience</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Recipients</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Delivery rate</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-5 py-2.5 text-right font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/50">
                <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-3 py-3 text-muted-foreground">{c.audience}</td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatNumber(c.recipients)}</td>
                <td className="px-3 py-3">
                  <DeliveryRate campaign={c} />
                </td>
                <td className="px-3 py-3">
                  <CampaignStatusBadge status={c.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right text-muted-foreground">
                  <time dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked list below md */}
      <ul className="divide-y divide-border md:hidden">
        {campaigns.map((c) => (
          <li key={c.id} className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 font-medium text-foreground">{c.name}</p>
              <CampaignStatusBadge status={c.status} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {c.audience} · <time dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Recipients</dt>
                <dd className="font-semibold tabular-nums">{formatNumber(c.recipients)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Delivery rate</dt>
                <dd><DeliveryRate campaign={c} /></dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
