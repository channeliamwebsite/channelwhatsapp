"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

/** Top-bar search. Press ⌘K / Ctrl+K to focus. Not wired to data yet. */
export function GlobalSearch() {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form role="search" className="relative w-full max-w-md" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="global-search" className="sr-only">
        Search contacts, campaigns and templates
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={inputRef}
        id="global-search"
        type="search"
        placeholder="Search contacts, campaigns…"
        className="bg-background pl-9 pr-14 shadow-none"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:block">
        ⌘K
      </kbd>
    </form>
  );
}
