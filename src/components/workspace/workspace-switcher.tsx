"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Settings2 } from "lucide-react";

import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { useHub } from "@/lib/store/hub-store";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/types/workspace";

export function WorkspaceAvatar({ workspace, className }: { workspace: Workspace; className?: string }) {
  if (workspace.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-provided logo hosts
    return <img src={workspace.logoUrl} alt="" className={cn("size-7 shrink-0 rounded-lg bg-white object-contain", className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white", className)}
      style={{ background: workspace.color }}
    >
      {workspace.initials}
    </span>
  );
}

/** Sidebar control for switching the active client workspace. */
export function WorkspaceSwitcher({ collapsed = false, onSwitch }: { collapsed?: boolean; onSwitch?: () => void }) {
  const { workspaces, workspace, setWorkspaceId } = useHub();
  return (
    <Dropdown>
      <DropdownTrigger
        aria-label={`Current workspace: ${workspace.name}. Switch workspace`}
        title={collapsed ? workspace.name : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-1.5 text-left transition-colors hover:bg-sidebar-accent",
          collapsed && "justify-center border-transparent bg-transparent",
        )}
      >
        <WorkspaceAvatar workspace={workspace} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-white">{workspace.name}</span>
              <span className="block truncate text-[11px] text-sidebar-muted-foreground">Client workspace</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-sidebar-muted-foreground" aria-hidden="true" />
          </>
        )}
      </DropdownTrigger>
      <DropdownContent align="start" className="w-64">
        <DropdownLabel>Switch workspace</DropdownLabel>
        {workspaces.map((w) => (
          <DropdownItem
            key={w.id}
            onClick={() => {
              setWorkspaceId(w.id);
              onSwitch?.();
            }}
          >
            <WorkspaceAvatar workspace={w} className="size-6 text-[10px]" />
            <span className="min-w-0 flex-1 truncate">{w.name}</span>
            {w.id === workspace.id && <Check className="text-primary!" aria-hidden="true" />}
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <Link href="/workspaces" onClick={onSwitch} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-muted">
          <Settings2 className="size-4 text-muted-foreground" aria-hidden="true" />
          Manage workspaces
        </Link>
      </DropdownContent>
    </Dropdown>
  );
}
