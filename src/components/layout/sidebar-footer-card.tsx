import Link from "next/link";
import { Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";

/** Compact WhatsApp connection hint shown at the bottom of the sidebar. */
export function SidebarFooterCard({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <Link
        href="/whatsapp-account"
        title="Sample data mode"
        className="relative mx-auto flex size-9 items-center justify-center rounded-lg text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-white"
      >
        <Smartphone className="size-[18px]" aria-hidden="true" />
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-amber-400 ring-2 ring-sidebar" />
        <span className="sr-only">Sample data mode — WhatsApp API not connected</span>
      </Link>
    );
  }

  return (
    <Link
      href="/whatsapp-account"
      className={cn(
        "block rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3 transition-colors hover:bg-sidebar-accent",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-amber-400" aria-hidden="true" />
        <span className="text-xs font-semibold text-white">Sample data mode</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-sidebar-muted-foreground">
        Live figures appear once the WhatsApp Business API is connected.
      </p>
    </Link>
  );
}
