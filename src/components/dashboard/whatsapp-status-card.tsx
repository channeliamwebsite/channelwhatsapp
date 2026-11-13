import Link from "next/link";
import { BadgeCheck, CircleAlert, Clock, Smartphone } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { ConnectionStatus, WhatsAppAccountStatus } from "@/types/dashboard";
import { cn } from "@/lib/utils";

import { DashboardCard } from "./dashboard-card";

const statusConfig: Record<
  ConnectionStatus,
  { label: string; variant: BadgeProps["variant"]; icon: typeof BadgeCheck }
> = {
  connected: { label: "Connected", variant: "success", icon: BadgeCheck },
  pending: { label: "Pending verification", variant: "warning", icon: Clock },
  disconnected: { label: "Not connected", variant: "danger", icon: CircleAlert },
};

const qualityLabel: Record<WhatsAppAccountStatus["qualityRating"], { label: string; className: string }> = {
  high: { label: "High", className: "text-success" },
  medium: { label: "Medium", className: "text-warning" },
  low: { label: "Low", className: "text-destructive" },
};

export function WhatsAppStatusCard({
  account,
  isMockData,
}: {
  account: WhatsAppAccountStatus;
  isMockData: boolean;
}) {
  const status = statusConfig[account.status];
  const StatusIcon = status.icon;
  const quality = qualityLabel[account.qualityRating];

  return (
    <DashboardCard
      title="WhatsApp account"
      description="Business API connection"
      sample={isMockData}
      contentClassName="pt-4"
    >
      <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-xs">
          <Smartphone className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{account.businessName}</p>
          <p className="truncate text-xs tabular-nums text-muted-foreground">{account.displayNumber}</p>
        </div>
        <Badge variant={status.variant}>
          <StatusIcon aria-hidden="true" />
          {status.label}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Quality rating</dt>
          <dd className={cn("mt-0.5 text-sm font-semibold", quality.className)}>{quality.label}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Messaging limit</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">{account.messagingLimit}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Last synced</dt>
          <dd className="mt-0.5 font-medium text-foreground">{account.lastSyncedLabel}</dd>
        </div>
      </dl>

      <Link
        href="/whatsapp-account"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")}
      >
        Manage account
      </Link>
    </DashboardCard>
  );
}
