import { Badge } from "@/components/ui/badge";
import type { CampaignStatus } from "@/types/campaign";

const config: Record<CampaignStatus, { label: string; variant: "neutral" | "info" | "warning" | "success" | "outline" | "danger" }> = {
  draft: { label: "Draft", variant: "neutral" },
  scheduled: { label: "Scheduled", variant: "info" },
  running: { label: "Running", variant: "warning" },
  paused: { label: "Paused", variant: "outline" },
  completed: { label: "Completed", variant: "success" },
  stopped: { label: "Stopped", variant: "danger" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const { label, variant } = config[status];
  return (
    <Badge variant={variant}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
