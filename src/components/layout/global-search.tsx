"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useHub } from "@/lib/store/hub-store";

type Result = { id: string; label: string; hint: string; href: string; kind: string };

/** Searches the current workspace's contacts, campaigns, templates and groups. ⌘K / Ctrl+K to focus. */
export function GlobalSearch() {
  const { data } = useHub();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);

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

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const results: Result[] = q.length < 2 ? [] : [
    ...data.contacts.filter((c) => c.fullName.toLowerCase().includes(q) || c.email.includes(q) || (digits.length >= 3 && c.phone.includes(digits))).slice(0, 5)
      .map((c) => ({ id: c.id, label: c.fullName, hint: c.phone, href: `/contacts?contact=${encodeURIComponent(c.id)}`, kind: "Contact" })),
    ...data.campaigns.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 4).map((c) => ({ id: c.id, label: c.name, hint: c.status, href: `/campaigns/${c.id}`, kind: "Campaign" })),
    ...data.templates.filter((t) => t.name.includes(q)).slice(0, 3).map((t) => ({ id: t.id, label: t.name, hint: t.status, href: "/templates", kind: "Template" })),
    ...data.audienceGroups.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 3).map((g) => ({ id: g.id, label: g.name, hint: "Audience group", href: "/audience-groups", kind: "Group" })),
  ];

  return (
    <div className="relative w-full max-w-md" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <label htmlFor="global-search" className="sr-only">Search contacts, campaigns, templates and groups</label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        id="global-search"
        type="search"
        role="combobox"
        aria-expanded={open && q.length >= 2}
        aria-controls="global-search-results"
        autoComplete="off"
        placeholder="Search contacts, campaigns…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="bg-background pl-9 pr-14 shadow-none"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:block">⌘K</kbd>
      {open && q.length >= 2 && (
        <ul id="global-search-results" role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {results.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">No matches in this workspace.</li>}
          {results.map((r) => (
            <li key={`${r.kind}-${r.id}`} role="option" aria-selected="false">
              <Link href={r.href} onClick={() => { setOpen(false); setQuery(""); }} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                <span className="min-w-0"><span className="block truncate font-medium">{r.label}</span><span className="block truncate text-xs text-muted-foreground">{r.hint}</span></span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{r.kind}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
