"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";

import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";

import { BrandLogo } from "./brand-logo";
import { useSidebar } from "./sidebar-context";
import { SidebarFooterCard } from "./sidebar-footer-card";
import { SidebarNav } from "./sidebar-nav";

/** Desktop sidebar (lg and up). Collapses to an icon rail. */
export function AppSidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center",
          collapsed ? "justify-center px-3" : "justify-between px-5",
        )}
      >
        <BrandLogo collapsed={collapsed} />
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-white"
          >
            <PanelLeftClose className="size-[18px]" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="shrink-0 px-3 pb-1">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
        <SidebarNav collapsed={collapsed} />
      </div>

      <div className={cn("shrink-0 border-t border-sidebar-border p-3", collapsed && "flex flex-col gap-2")}>
        <SidebarFooterCard collapsed={collapsed} />
        {collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="mx-auto flex size-9 items-center justify-center rounded-lg text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-white"
          >
            <PanelLeftOpen className="size-[18px]" aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );
}
