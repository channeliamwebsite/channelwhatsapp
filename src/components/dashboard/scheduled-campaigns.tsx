import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";

import type { ScheduledCampaign } from "@/types/dashboard";
import { formatNumber } from "@/lib/utils";

import { DashboardCard } from "./dashboard-card";

export function ScheduledCampaigns({
  campaigns,
}: {
  campaigns: ScheduledCampaign[];
}) {
  return (
    <DashboardCard
      title="Scheduled campaigns"
      description="Upcoming broadcasts in the queue"
      action={
        <Link href="/campaigns" className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
          View calendar
        </Link>
      }
      contentClassName="pt-4"
    >
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
          <CalendarClock className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium">Nothing scheduled</p>
          <p className="text-xs text-muted-foreground">Scheduled campaigns will appear here.</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {campaigns.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-lg border border-border p-3">
              <time
                dateTime={c.scheduledFor}
                className="flex w-[84px] shrink-0 flex-col items-center justify-center rounded-md bg-accent px-1 py-2 text-center"
              >
                <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                  {c.dayLabel}
                </span>
                <span className="mt-0.5 text-xs font-semibold text-foreground">{c.timeLabel}</span>
              </time>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{c.template}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {c.audience} · <span className="tabular-nums">{formatNumber(c.recipients)}</span>
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}
