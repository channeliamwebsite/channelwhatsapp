"use client";

import * as React from "react";
import { Bell } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { useHub } from "@/lib/store/hub-store";
import { cn, formatDate } from "@/lib/utils";
import type { ActivityEvent } from "@/types/activity";
import { DEFAULT_NOTIFICATIONS } from "@/types/workspace";

const KIND: Partial<Record<ActivityEvent["type"], "campaigns" | "failures" | "automations">> = {
  campaign_launched: "campaigns", campaign_paused: "campaigns", campaign_resumed: "campaigns",
  campaign_cancelled: "failures", contact_opted_out: "failures",
  contacts_imported: "automations", message_event: "automations",
};
const DOT = { campaigns: "bg-info", failures: "bg-destructive", automations: "bg-success" } as const;

// "Last seen" is a per-browser UI preference, not application data.
const key = (w: string) => `cwh:notifications-seen:${w}`;
const EVENT = "cwh:notifications-seen";
const subscribe = (cb: () => void) => { window.addEventListener(EVENT, cb); return () => window.removeEventListener(EVENT, cb); };

/** Notifications are the workspace's activity events the admin opted into in Settings. */
export function NotificationsMenu() {
  const { workspace, data } = useHub();
  const prefs = { ...DEFAULT_NOTIFICATIONS, ...workspace.settings?.notifications };
  const items = data.activity.filter((a) => { const k = KIND[a.type]; return k && prefs[k]; }).slice(0, 15);
  const seen = React.useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(key(workspace.id)) ?? ""; } catch { return ""; } }, () => "");
  const unread = items.filter((i) => i.at > seen).length;

  return (
    <Dropdown>
      <DropdownTrigger
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        onClick={() => { try { localStorage.setItem(key(workspace.id), new Date().toISOString()); } catch { /* ignore */ } window.dispatchEvent(new Event(EVENT)); }}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative text-muted-foreground")}
      >
        <Bell className="size-[18px]" aria-hidden="true" />
        {unread > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-card" />}
      </DropdownTrigger>
      <DropdownContent className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <p className="px-4 py-3 text-sm font-semibold">Notifications · {workspace.name}</p>
        <DropdownSeparator className="mx-0 my-0" />
        {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>}
        <ul className="max-h-80 overflow-y-auto py-1">
          {items.map((n) => (
            <li key={n.id} className="flex gap-3 px-4 py-2.5">
              <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[KIND[n.type]!])} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", n.at > seen ? "font-semibold" : "font-medium")}>{n.message}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(n.at)}</p>
              </div>
            </li>
          ))}
        </ul>
      </DropdownContent>
    </Dropdown>
  );
}
