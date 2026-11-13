import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** Percentage change vs. previous period. */
  change?: number;
  /** Set false when a rise is bad (e.g. failed messages). */
  positiveIsGood?: boolean;
  helper?: React.ReactNode;
  tone?: "brand" | "success" | "info" | "danger" | "neutral";
  className?: string;
};

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "bg-accent text-primary",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  danger: "bg-accent text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  positiveIsGood = true,
  helper,
  tone = "neutral",
  className,
}: StatCardProps) {
  const hasChange = typeof change === "number";
  const isUp = hasChange && change >= 0;
  const isGood = hasChange && (isUp === positiveIsGood);
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <Card className={cn("gap-3 p-4 sm:gap-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9", toneStyles[tone])}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <div>
        <p className="text-[22px] font-semibold leading-none sm:text-[26px] tracking-tight tabular-nums text-foreground">
          {typeof value === "number" ? formatNumber(value) : value}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {hasChange && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold tabular-nums",
                isGood ? "text-success" : "text-destructive",
              )}
            >
              <TrendIcon className="size-3.5" aria-hidden="true" />
              {isUp ? "+" : ""}
              {change.toFixed(1)}%
              <span className="sr-only">{isUp ? "increase" : "decrease"} vs previous period</span>
            </span>
          )}
          {helper && <span className="text-muted-foreground">{helper}</span>}
        </div>
      </div>
    </Card>
  );
}
