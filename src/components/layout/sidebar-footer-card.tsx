"use client";

import Link from "next/link";
import { Smartphone } from "lucide-react";

import { useHub } from "@/lib/store/hub-store";
import { cn } from "@/lib/utils";

const STATUS = {
  connected: { label: "WhatsApp connected", dot: "bg-emerald-400" },
  pending: { label: "Verification pending", dot: "bg-amber-400" },
  disconnected: { label: "WhatsApp not connected", dot: "bg-sidebar-muted-foreground" },
} as const;

/** WhatsApp connection status of the current workspace. */
export function SidebarFooterCard({ collapsed = false }: { collapsed?: boolean }) {
  const { workspace } = useHub();
  const status = STATUS[workspace.whatsappAccount.status];
  if (collapsed) {
    return (
      <Link href="/whatsapp-account" title={status.label} className="relative mx-auto flex size-9 items-center justify-center rounded-lg text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-white">
        <Smartphone className="size-[18px]" aria-hidden="true" />
        <span className={cn("absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-sidebar", status.dot)} />
        <span className="sr-only">{status.label}</span>
      </Link>
    );
  }
  return (
    <>
    <Link href="/whatsapp-account" className="block rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3 transition-colors hover:bg-sidebar-accent">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", status.dot)} aria-hidden="true" />
        <span className="text-xs font-semibold text-white">{status.label}</span>
      </div>
      <p className="mt-1 truncate text-[11px] text-sidebar-muted-foreground">{workspace.whatsappAccount.phoneNumber || workspace.name}</p>
    </Link>
    <nav aria-label="Legal" className="mt-2 flex justify-center gap-3 text-[11px] text-sidebar-muted-foreground">
      <Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
      <Link href="/terms-of-service" className="hover:text-white">Terms</Link>
    </nav>
    </>
  );
}
