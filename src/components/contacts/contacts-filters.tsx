"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

export type ConsentFilter = "all" | "opted_in" | "pending" | "opted_out" | "eligible" | "ineligible";

export type ContactFilters = {
  query: string;
  group: string;
  consent: ConsentFilter;
  tag: string;
};

export const EMPTY_FILTERS: ContactFilters = { query: "", group: "", consent: "all", tag: "" };

export function ContactsFilters({
  filters,
  onChange,
  groups,
  tags,
}: {
  filters: ContactFilters;
  onChange: (filters: ContactFilters) => void;
  groups: string[];
  tags: string[];
}) {
  const active = filters.query || filters.group || filters.tag || filters.consent !== "all";
  const set = (patch: Partial<ContactFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-2 p-4 sm:px-5 xl:flex-row xl:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          aria-label="Search contacts by name, phone or email"
          placeholder="Search name, phone or email…"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          className="h-9 pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex">
        <NativeSelect aria-label="Filter by audience group" value={filters.group} onChange={(e) => set({ group: e.target.value })} className="xl:w-48">
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filter by consent status" value={filters.consent} onChange={(e) => set({ consent: e.target.value as ConsentFilter })} className="xl:w-48">
          <option value="all">All consent statuses</option>
          <option value="opted_in">Opted in</option>
          <option value="pending">Pending consent</option>
          <option value="opted_out">Opted out</option>
          <option value="eligible">Campaign eligible</option>
          <option value="ineligible">Not eligible</option>
        </NativeSelect>
        <NativeSelect aria-label="Filter by tag" value={filters.tag} onChange={(e) => set({ tag: e.target.value })} className="col-span-2 sm:col-span-1 xl:w-40">
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </NativeSelect>
      </div>
      {active && (
        <Button variant="ghost" size="lg" onClick={() => onChange(EMPTY_FILTERS)} className="self-start xl:self-auto">
          <X aria-hidden="true" />
          Clear
        </Button>
      )}
    </div>
  );
}
