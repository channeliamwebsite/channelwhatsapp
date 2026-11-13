"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHub } from "@/lib/store/hub-store";

import { GlobalSearch } from "./global-search";
import { NotificationsMenu } from "./notifications-menu";
import { useSidebar } from "./sidebar-context";
import { UserMenu } from "./user-menu";

export function Topbar() {
  const { setMobileOpen } = useSidebar();
  const { user } = useHub();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-card/75 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1 text-muted-foreground lg:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationsMenu />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
        <UserMenu user={{ name: "Super Admin", email: user.email, role: "Super Admin" }} />
      </div>
    </header>
  );
}
