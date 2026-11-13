"use client";

import Link from "next/link";
import { ChevronDown, CircleHelp, LogOut, Settings, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import type { WorkspaceUser } from "@/lib/mock-data/workspace";

export function UserMenu({ user }: { user: WorkspaceUser }) {
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Dropdown>
      <DropdownTrigger
        aria-label="Account menu"
        className="flex items-center gap-2.5 rounded-lg p-1 pr-2 transition-colors hover:bg-muted"
      >
        <Avatar>
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 flex-col text-left leading-tight md:flex">
          <span className="truncate text-[13px] font-semibold">{user.name}</span>
          <span className="truncate text-[11px] text-muted-foreground">{user.role}</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground md:block" aria-hidden="true" />
      </DropdownTrigger>
      <DropdownContent>
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <Avatar size="lg">
            <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <DropdownSeparator />
        <DropdownItem disabled>
          <User aria-hidden="true" />
          Profile
        </DropdownItem>
        <Link
          href="/settings"
          role="menuitem"
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
          Settings
        </Link>
        <DropdownItem disabled>
          <CircleHelp aria-hidden="true" />
          Help & support
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem disabled className="text-destructive">
          <LogOut aria-hidden="true" className="text-destructive!" />
          Sign out
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
