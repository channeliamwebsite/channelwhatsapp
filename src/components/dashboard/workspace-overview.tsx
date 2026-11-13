"use client";

import * as React from "react";
import Link from "next/link";
import { MessagesSquare, Plus, Upload } from "lucide-react";

import { AudienceDistribution } from "@/components/dashboard/audience-distribution";
import { ContactGrowthChart } from "@/components/dashboard/contact-growth-chart";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { MessagePerformanceChart } from "@/components/dashboard/message-performance-chart";
import { PageHeader } from "@/components/dashboard/page-header";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RecentCampaigns } from "@/components/dashboard/recent-campaigns";
import { ScheduledCampaigns } from "@/components/dashboard/scheduled-campaigns";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { WhatsAppStatusCard } from "@/components/dashboard/whatsapp-status-card";
import { buttonVariants } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { buildDashboardData } from "@/lib/dashboard/build-dashboard-data";
import { useHub } from "@/lib/store/hub-store";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

export function WorkspaceOverview() {
  const { workspace, data: store } = useHub();
  const [now] = React.useState(() => Date.now());
  const [range, setRange] = React.useState<(typeof RANGES)[number]>(30);
  const data = buildDashboardData(workspace, store, now, range);
  const hasMessages = data.performance.some((p) => p.sent > 0);
  const connected = workspace.whatsappAccount.status === "connected";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${workspace.name} overview`}
        description={`How ${workspace.name}’s WhatsApp campaigns and funnels are performing.`}
        actions={
          <>
            <NativeSelect aria-label="Date range" value={range} onChange={(e) => setRange(Number(e.target.value) as (typeof RANGES)[number])} className="w-36">
              {RANGES.map((r) => <option key={r} value={r}>Last {r} days</option>)}
            </NativeSelect>
            <Link href="/contacts" className={cn(buttonVariants({ variant: "outline" }), "h-9 gap-2 px-4")}><Upload aria-hidden="true" /> Import contacts</Link>
            <Link href="/campaigns/new" className={cn(buttonVariants(), "h-9 gap-2 px-4")}><Plus aria-hidden="true" /> Create campaign</Link>
          </>
        }
      />

      <section aria-label="Key metrics"><StatsGrid stats={data.stats} /></section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardCard className="xl:col-span-2" title="Message performance" description={`Sent, delivered and read · ${data.periodLabel}`} contentClassName="pt-4">
          {hasMessages ? <MessagePerformanceChart data={data.performance} /> : (
            <p className="py-16 text-center text-sm text-muted-foreground">{connected ? "Analytics will appear when real campaign activity is available." : "No WhatsApp account connected — message analytics start once sending is live."}</p>
          )}
        </DashboardCard>
        <WhatsAppStatusCard account={data.whatsappAccount} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardCard className="xl:col-span-2" title="Contact growth" description={`New contacts per day · ${data.periodLabel}`} contentClassName="pt-4">
          {data.contactGrowth.some((d) => d.contacts > 0) ? <ContactGrowthChart data={data.contactGrowth} /> : <p className="py-16 text-center text-sm text-muted-foreground">No contacts added in this period.</p>}
        </DashboardCard>
        <DashboardCard title="Recent conversations" description="Customer replies and chats">
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MessagesSquare className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{connected ? "No conversations yet." : "Conversations appear once WhatsApp is connected."}</p>
          </div>
        </DashboardCard>
      </div>

      <RecentCampaigns campaigns={data.recentCampaigns} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <AudienceDistribution audience={data.audience} />
        <ScheduledCampaigns campaigns={data.scheduledCampaigns} />
        <div className="lg:col-span-2 xl:col-span-1 [&>*]:h-full"><RecentActivity items={data.activity} /></div>
      </div>
    </div>
  );
}
