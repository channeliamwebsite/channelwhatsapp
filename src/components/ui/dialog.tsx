"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "center" = modal dialog, "right" = side sheet. */
  side?: "center" | "right";
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
};

/**
 * Modal built on the native <dialog> element: focus trapping, Escape to close,
 * top-layer rendering and inert background come from the browser.
 */
export function Dialog({ open, onOpenChange, side = "center", className, children, ...aria }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={aria["aria-label"]}
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false); // backdrop click
      }}
      className={cn(
        "bg-transparent p-0 text-foreground backdrop:bg-[#1a0a0d]/45 backdrop:backdrop-blur-[2px] open:flex",
        side === "center" && "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg",
        side === "right" && "ml-auto mr-0 h-dvh max-h-dvh w-full max-w-md",
        className,
      )}
    >
      {open && (
        <div
          className={cn(
            "flex w-full flex-col overflow-hidden bg-card shadow-2xl",
            side === "center" ? "rounded-xl border border-border" : "h-full border-l border-border",
          )}
        >
          {children}
        </div>
      )}
    </dialog>
  );
}

export function DialogHeader({
  title,
  description,
  onClose,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
