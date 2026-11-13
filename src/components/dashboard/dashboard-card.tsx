import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { SampleDataBadge } from "./sample-data-badge";

type DashboardCardProps = {
  title: string;
  description?: string;
  /** Right side of the header: a badge, link or menu. */
  action?: React.ReactNode;
  /** Shows a "Sample" badge — use while the widget renders mock data. */
  sample?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Standard titled card used for every dashboard widget. */
export function DashboardCard({
  title,
  description,
  action,
  sample = false,
  footer,
  children,
  className,
  contentClassName,
}: DashboardCardProps) {
  return (
    <Card className={cn("min-w-0 gap-0 py-0", className)}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 p-5 pb-0">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
          {description && <CardDescription className="mt-1 text-xs">{description}</CardDescription>}
        </div>
        {(action || sample) && (
          <div className="flex shrink-0 items-center gap-3">
            {sample && <SampleDataBadge label="Sample" />}
            {action}
          </div>
        )}
      </CardHeader>
      <CardContent className={cn("flex-1 p-5", contentClassName)}>{children}</CardContent>
      {footer}
    </Card>
  );
}
