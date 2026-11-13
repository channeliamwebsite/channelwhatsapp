"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";

import { BrandLogo } from "./brand-logo";
import { useSidebar } from "./sidebar-context";
import { SidebarFooterCard } from "./sidebar-footer-card";
import { SidebarNav } from "./sidebar-nav";

/** Slide-in navigation drawer for screens below lg. */
export function MobileNav() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setMobileOpen(false), [setMobileOpen]);

  React.useEffect(() => {
    if (!mobileOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    // Close if the viewport grows into the desktop layout.
    const desktop = window.matchMedia("(min-width: 1024px)");
    function onBreakpoint(event: MediaQueryListEvent) {
      if (event.matches) close();
    }

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
      previouslyFocused?.focus();
    };
  }, [mobileOpen, close]);

  return (
    <div
      className={cn("fixed inset-0 z-50 lg:hidden", !mobileOpen && "pointer-events-none")}
      aria-hidden={!mobileOpen}
      inert={!mobileOpen}
    >
      <div
        onClick={close}
        className={cn(
          "absolute inset-0 bg-[#1a0a0d]/50 backdrop-blur-[2px] transition-opacity duration-200",
          mobileOpen ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <BrandLogo />
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation"
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-white"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>
        <div className="shrink-0 px-3 pb-1">
          <WorkspaceSwitcher onSwitch={close} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav onNavigate={close} />
        </div>
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <SidebarFooterCard />
        </div>
      </div>
    </div>
  );
}
