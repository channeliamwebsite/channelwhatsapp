"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  contentId: string;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("Dropdown components must be used inside <Dropdown>.");
  return ctx;
}

/**
 * Lightweight popover/dropdown: closes on outside click, Escape and item
 * selection. Kept dependency-free until a fuller menu primitive is needed.
 */
export function Dropdown({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current
          ?.querySelector<HTMLElement>("[data-slot='dropdown-trigger']")
          ?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const value = React.useMemo(
    () => ({ open, setOpen, triggerId: `${id}-trigger`, contentId: `${id}-content` }),
    [open, id],
  );

  return (
    <DropdownContext.Provider value={value}>
      <div ref={rootRef} className={cn("relative", className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { open, setOpen, triggerId, contentId } = useDropdown();
  return (
    <button
      type="button"
      id={triggerId}
      data-slot="dropdown-trigger"
      aria-haspopup="true"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      onClick={(event) => {
        onClick?.(event);
        setOpen(!open);
      }}
      className={className}
      {...props}
    />
  );
}

export function DropdownContent({
  className,
  align = "end",
  ...props
}: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  const { open, triggerId, contentId } = useDropdown();
  if (!open) return null;
  return (
    <div
      id={contentId}
      role="menu"
      aria-labelledby={triggerId}
      data-slot="dropdown-content"
      className={cn(
        "absolute top-full z-50 mt-2 min-w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-[#260d12]/8",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownItem({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { setOpen } = useDropdown();
  return (
    <button
      type="button"
      role="menuitem"
      data-slot="dropdown-item"
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none [&_svg]:size-4 [&_svg]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-label"
      className={cn("px-2.5 py-2 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DropdownSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      data-slot="dropdown-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
