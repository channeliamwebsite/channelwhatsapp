"use client";

import * as React from "react";

const STORAGE_KEY = "cwh:sidebar-collapsed";
const CHANGE_EVENT = "cwh:sidebar-collapsed-change";

function readCollapsed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Storage unavailable (private mode etc.) — state just won't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

type SidebarContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Persisted desktop collapse state. Server snapshot is "expanded".
  const collapsed = React.useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      collapsed,
      toggleCollapsed: () => writeCollapsed(!collapsed),
      mobileOpen,
      setMobileOpen,
    }),
    [collapsed, mobileOpen],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>.");
  return ctx;
}
