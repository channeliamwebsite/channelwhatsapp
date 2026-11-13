import {
  CalendarClock,
  CheckCheck,
  FileCheck2,
  FileX2,
  Upload,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import type { ActivityItem, ActivityType } from "@/types/dashboard";
import { cn } from "@/lib/utils";

import { DashboardCard } from "./dashboard-card";

const activityMeta: Record<ActivityType, { icon: LucideIcon; className: string }> = {
  campaign_completed: { icon: CheckCheck, className: "bg-success-soft text-success" },
  campaign_scheduled: { icon: CalendarClock, className: "bg-info-soft text-info" },
  contacts_imported: { icon: Upload, className: "bg-muted text-foreground" },
  template_approved: { icon: FileCheck2, className: "bg-success-soft text-success" },
  template_rejected: { icon: FileX2, className: "bg-accent text-destructive" },
  member_joined: { icon: UserPlus, className: "bg-muted text-foreground" },
};

export function RecentActivity({
  items,
  sample = false,
}: {
  items: ActivityItem[];
  sample?: boolean;
}) {
  return (
    <DashboardCard
      title="Recent activity"
      description="What changed across your workspace"
      sample={sample}
      contentClassName="pt-4"
    >
      <ol className="relative flex flex-col">
        {items.map((item, index) => {
          const { icon: Icon, className } = activityMeta[item.type];
          const isLast = index === items.length - 1;
          return (
            <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && (
                <span aria-hidden="true" className="absolute left-4 top-9 bottom-1 w-px -translate-x-1/2 bg-border" />
              )}
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", className)}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] leading-snug text-muted-foreground">
                  <span className="font-semibold text-foreground">{item.actor}</span> {item.message}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/80">{item.timeLabel}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </DashboardCard>
  );
}
