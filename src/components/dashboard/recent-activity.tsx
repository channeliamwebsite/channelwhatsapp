import { CircleSlash, FilePen, Megaphone, PauseCircle, PlayCircle, Settings2, Upload, UserCheck, UserMinus, UserPen, UserPlus, XCircle, Zap, type LucideIcon } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import type { ActivityEvent } from "@/types/activity";

import { DashboardCard } from "./dashboard-card";

const META: Record<ActivityEvent["type"], { icon: LucideIcon; className: string }> = {
  contact_created: { icon: UserPlus, className: "bg-muted text-foreground" },
  contact_updated: { icon: UserPen, className: "bg-muted text-foreground" },
  contact_deleted: { icon: UserMinus, className: "bg-muted text-foreground" },
  contact_opted_in: { icon: UserCheck, className: "bg-success-soft text-success" },
  contact_opted_out: { icon: CircleSlash, className: "bg-accent text-destructive" },
  contacts_imported: { icon: Upload, className: "bg-info-soft text-info" },
  campaign_created: { icon: FilePen, className: "bg-muted text-foreground" },
  campaign_launched: { icon: Megaphone, className: "bg-accent text-primary" },
  campaign_paused: { icon: PauseCircle, className: "bg-muted text-foreground" },
  campaign_resumed: { icon: PlayCircle, className: "bg-success-soft text-success" },
  campaign_cancelled: { icon: XCircle, className: "bg-accent text-destructive" },
  workspace_updated: { icon: Settings2, className: "bg-muted text-foreground" },
  message_event: { icon: Zap, className: "bg-info-soft text-info" },
};

/** Workspace activity from the server-written audit log. */
export function RecentActivity({ items }: { items: ActivityEvent[] }) {
  return (
    <DashboardCard title="Workspace activity" description="Latest changes recorded by the server" contentClassName="pt-4">
      {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet.</p>}
      <ol className="flex flex-col gap-3">
        {items.map((item) => {
          const { icon: Icon, className } = META[item.type] ?? META.message_event;
          return (
            <li key={item.id} className="flex gap-3">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", className)}><Icon className="size-4" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] leading-snug text-foreground">{item.message}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(item.at)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </DashboardCard>
  );
}
