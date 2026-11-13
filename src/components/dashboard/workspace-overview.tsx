"use client";

import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import { AudienceDistribution } from "@/components/dashboard/audience-distribution";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { MessagePerformanceChart } from "@/components/dashboard/message-performance-chart";
import { MockDataNotice } from "@/components/dashboard/mock-data-notice";
import { PageHeader } from "@/components/dashboard/page-header";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RecentCampaigns } from "@/components/dashboard/recent-campaigns";
import { SampleDataBadge } from "@/components/dashboard/sample-data-badge";
import { ScheduledCampaigns } from "@/components/dashboard/scheduled-campaigns";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { WhatsAppStatusCard } from "@/components/dashboard/whatsapp-status-card";
import { buttonVariants } from "@/components/ui/button";
import { buildDashboardData } from "@/lib/dashboard/build-dashboard-data";
import { mockCurrentUser } from "@/lib/mock-data/workspace";
import { useHub } from "@/lib/store/hub-store";
import { cn } from "@/lib/utils";

export function WorkspaceOverview() {
  const { workspace, data: store } = useHub();
  const data = buildDashboardData(workspace, store, "Admin");
  const sample = data.isMockData;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={sample ? <SampleDataBadge /> : undefined}
        title={`${workspace.name} overview`}
        description={`Welcome back, ${mockCurrentUser.name}. Here\u2019s how ${workspace.name}\u2019s WhatsApp funnels are performing.`}
        actions={
          <>
            <Link
              href="/contacts"
              className={cn(buttonVariants({ variant: "outline" }), "h-9 gap-2 px-4")}
            >
              <Upload aria-hidden="true" />
              Import contacts
            </Link>
            <Link href="/campaigns" className={cn(buttonVariants(), "h-9 gap-2 px-4")}>
              <Plus aria-hidden="true" />
              Create campaign
            </Link>
          </>
        }
      />

      {sample && <MockDataNotice />}

      <section aria-labelledby="key-metrics-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="key-metrics-heading" className="text-sm font-semibold text-foreground">
            Key metrics <span className="font-normal text-muted-foreground">· {data.periodLabel}</span>
          </h2>
          {sample && <SampleDataBadge label="Sample" />}
        </div>
        <StatsGrid stats={data.stats} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardCard
          className="xl:col-span-2"
          title="Message performance"
          description={`Daily sent, delivered and read · ${data.periodLabel}`}
          sample={sample}
          contentClassName="pt-4"
        >
          <MessagePerformanceChart data={data.performance} />
        </DashboardCard>
        <WhatsAppStatusCard account={data.whatsappAccount} isMockData={sample} />
      </div>

      <RecentCampaigns campaigns={data.recentCampaigns} sample={sample} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <AudienceDistribution audience={data.audience} sample={sample} />
        <ScheduledCampaigns campaigns={data.scheduledCampaigns} sample={sample} />
        <div className="lg:col-span-2 xl:col-span-1 [&>*]:h-full">
          <RecentActivity items={data.activity} sample={sample} />
        </div>
      </div>
    </div>
  );
}
