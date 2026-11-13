import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandLogo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[0_4px_12px_-2px_rgba(227,30,53,0.5)]">
        <MessageCircle className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[15px] font-semibold tracking-tight text-white">
            Channeliam
          </span>
          <span className="truncate text-[11px] font-medium text-sidebar-muted-foreground">
            WhatsApp Hub
          </span>
        </span>
      )}
    </div>
  );
}
