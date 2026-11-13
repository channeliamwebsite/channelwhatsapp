"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, navSections } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

/** usePathname suspends on dynamic routes under Cache Components, so the
 *  links render without highlighting until the pathname is known. */
export function SidebarNav(props: SidebarNavProps) {
  return (
    <Suspense fallback={<NavLinks {...props} pathname="" />}>
      <SidebarNavWithPathname {...props} />
    </Suspense>
  );
}

function SidebarNavWithPathname(props: SidebarNavProps) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

function NavLinks({ collapsed = false, onNavigate, pathname }: SidebarNavProps & { pathname: string }) {

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-5">
      {navSections.map((section) => (
        <div key={section.label} className="flex flex-col gap-0.5">
          {collapsed ? (
            <div className="mx-auto mb-1 h-px w-6 bg-sidebar-border first:hidden" aria-hidden="true" />
          ) : (
            <p className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted-foreground/70">
              {section.label}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = isNavItemActive(item.href, pathname);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors focus-visible:outline-sidebar-primary",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-sidebar-accent text-white"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-white",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-sidebar-primary"
                      />
                    )}
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "size-[18px] shrink-0 transition-colors",
                        active ? "text-sidebar-primary" : "text-sidebar-muted-foreground group-hover:text-white",
                      )}
                    />
                    {collapsed ? (
                      <span className="sr-only">{item.title}</span>
                    ) : (
                      <span className="truncate">{item.title}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
