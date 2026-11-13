import { CircleCheck, CircleSlash, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { OptInStatus } from "@/types/contact";

export const optInLabel: Record<OptInStatus, string> = {
  opted_in: "Opted in",
  pending: "Pending",
  opted_out: "Opted out",
};

const config = {
  opted_in: { variant: "success", icon: CircleCheck },
  pending: { variant: "warning", icon: Clock },
  opted_out: { variant: "danger", icon: CircleSlash },
} as const;

export function OptInBadge({ status }: { status: OptInStatus }) {
  const { variant, icon: Icon } = config[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {optInLabel[status]}
    </Badge>
  );
}
