"use client";

import { Bell } from "lucide-react";

import {
  Dropdown,
  DropdownContent,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceNotification } from "@/lib/mock-data/workspace";
import { cn } from "@/lib/utils";

const toneDot: Record<WorkspaceNotification["tone"], string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
};

export function NotificationsMenu({
  notifications,
}: {
  notifications: WorkspaceNotification[];
}) {
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <Dropdown>
      <DropdownTrigger
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative text-muted-foreground")}
      >
        <Bell className="size-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-card" />
        )}
      </DropdownTrigger>
      <DropdownContent className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && <Badge variant="brand">{unreadCount} new</Badge>}
        </div>
        <DropdownSeparator className="mx-0 my-0" />
        <ul className="max-h-80 overflow-y-auto py-1">
          {notifications.map((notification) => (
            <li key={notification.id} className="flex gap-3 px-4 py-3 hover:bg-muted/60">
              <span
                aria-hidden="true"
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneDot[notification.tone])}
              />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", notification.unread ? "font-semibold" : "font-medium")}>
                  {notification.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{notification.description}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">{notification.timeLabel}</p>
              </div>
            </li>
          ))}
        </ul>
        <DropdownSeparator className="mx-0 my-0" />
        <p className="px-4 py-2.5 text-center text-[11px] text-muted-foreground">
          Sample notifications
        </p>
      </DropdownContent>
    </Dropdown>
  );
}
