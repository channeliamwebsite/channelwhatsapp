"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { computeFunnelMetrics } from "@/lib/funnel/metrics";
import { useHub } from "@/lib/store/hub-store";
import { formatNumber, formatPercent } from "@/lib/utils";

import { FunnelKpis, FunnelProgression } from "./funnel-metrics";

export function FunnelsOverview() {
  const { workspace, data } = useHub();
  const all = computeFunnelMetrics(data.recipients);
  const launched = data.campaigns.filter((c) => c.launchedAt);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Funnels" description={`Behaviour-based three-message journeys across ${workspace.name} campaigns.`} />
      <FunnelKpis metrics={all} />
      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardCard className="xl:col-span-1" title="All funnels combined">
          <FunnelProgression metrics={all} />
        </DashboardCard>
        <div className="flex flex-col gap-3 xl:col-span-2">
          {launched.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No launched funnels in this workspace yet.</Card>}
          {launched.map((c) => {
            const m = computeFunnelMetrics(data.recipients.filter((r) => r.campaignId === c.id));
            return (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="group">
                <Card className="gap-3 p-4 transition-colors group-hover:ring-primary/30">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-semibold">{c.name}</p>
                    <CampaignStatusBadge status={c.status} />
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
                    {[
                      ["M1 sent", formatNumber(m.steps[0].sent)],
                      ["M2 sent", formatNumber(m.steps[1].sent)],
                      ["M3 sent", formatNumber(m.steps[2].sent)],
                      ["M1→M2", formatPercent(m.rates.m1ToM2, 0)],
                      ["M2→M3", formatPercent(m.rates.m2ToM3, 0)],
                      ["Converted", formatNumber(m.converted)],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-md bg-muted/60 py-1.5">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="font-semibold tabular-nums">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Open funnel <ArrowRight className="size-3" aria-hidden="true" /></span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
