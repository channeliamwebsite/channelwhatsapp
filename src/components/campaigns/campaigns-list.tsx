"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone, Plus } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { SampleDataBadge } from "@/components/dashboard/sample-data-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { computeFunnelMetrics } from "@/lib/funnel/metrics";
import { useHub } from "@/lib/store/hub-store";
import { cn, formatDate, formatNumber, formatPercent } from "@/lib/utils";

import { CampaignStatusBadge } from "./campaign-status-badge";

export function CampaignsList() {
  const { workspace, data } = useHub();
  const router = useRouter();
  const campaigns = [...data.campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<SampleDataBadge />}
        title="Campaigns"
        description={`Three-message behaviour funnels for ${workspace.name}.`}
        actions={
          <Link href="/campaigns/new" className={cn(buttonVariants({ size: "lg" }))}>
            <Plus aria-hidden="true" />
            New campaign
          </Link>
        }
      />
      <Card className="gap-0 overflow-hidden py-0">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Megaphone className="size-6 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">No campaigns in {workspace.name} yet</p>
            <Link href="/campaigns/new" className="mt-2 text-sm font-semibold text-primary hover:underline">Create the first funnel</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 font-semibold">Campaign</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Recipients</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Delivered</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Read</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">CTR</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">M1 → M2 → M3</th>
                  <th scope="col" className="px-5 py-2.5 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const m = computeFunnelMetrics(data.recipients.filter((r) => r.campaignId === c.id));
                  return (
                    <tr key={c.id} onClick={() => router.push(`/campaigns/${c.id}`)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <Link href={`/campaigns/${c.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-primary">{c.name}</Link>
                        <p className="text-xs text-muted-foreground">{c.audienceGroups.join(", ") || "No audience"}</p>
                      </td>
                      <td className="px-3 py-3"><CampaignStatusBadge status={c.status} /></td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(m.started)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{m.totals.sent ? formatPercent(m.rates.delivery) : "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{m.totals.sent ? formatPercent(m.rates.read) : "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{m.totals.sent ? formatPercent(m.rates.clickThrough) : "—"}</td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {m.steps.map((s) => formatNumber(s.sent)).join(" → ")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
