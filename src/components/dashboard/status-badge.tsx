import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { CampaignStatus } from "@/types/dashboard";

const statusConfig: Record<CampaignStatus, { label: string; variant: BadgeProps["variant"] }> = {
  draft: { label: "Draft", variant: "neutral" },
  scheduled: { label: "Scheduled", variant: "info" },
  sending: { label: "Running", variant: "warning" },
  paused: { label: "Paused", variant: "neutral" },
  stopped: { label: "Stopped", variant: "outline" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const { label, variant } = statusConfig[status];
  return (
    <Badge variant={variant}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
