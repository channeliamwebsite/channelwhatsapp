import { HubProvider } from "@/lib/store/hub-store";

import { AppSidebar } from "./app-sidebar";
import { MobileNav } from "./mobile-nav";
import { SidebarProvider } from "./sidebar-context";
import { Topbar } from "./topbar";

/** App chrome: desktop sidebar, mobile drawer, top bar and content area. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <HubProvider>
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar />
        <MobileNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="main-content" className="flex-1">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
    </HubProvider>
  );
}
