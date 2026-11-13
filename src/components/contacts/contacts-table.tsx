"use client";

import { AlertTriangle, ArrowDown, ArrowUp, Eye, Pencil, Trash2, UsersRound } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { isValidPhone, formatPhone } from "@/lib/contacts/phone";
import { cn, formatDate } from "@/lib/utils";
import type { Contact } from "@/types/contact";

import { ChipList } from "./chip-list";
import { OptInBadge } from "./opt-in-badge";

export type SortKey = "fullName" | "createdAt";
export type Sort = { key: SortKey; dir: "asc" | "desc" };

type ContactsTableProps = {
  contacts: Contact[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onTogglePage: (checked: boolean) => void;
  sort: Sort;
  onSort: (key: SortKey) => void;
  onView: (c: Contact) => void;
  onEdit: (c: Contact) => void;
  onDelete: (c: Contact) => void;
  emptyState: React.ReactNode;
};

function SortHeader({ label, k, sort, onSort, className }: { label: string; k: SortKey; sort: Sort; onSort: (k: SortKey) => void; className?: string }) {
  const active = sort.key === k;
  const Icon = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("px-3 py-2.5 font-semibold", className)}>
      <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
        {label}
        {active && <Icon className="size-3" aria-hidden="true" />}
      </button>
    </th>
  );
}

export function ContactsTable({ contacts, selected, onToggle, onTogglePage, sort, onSort, onView, onEdit, onDelete, emptyState }: ContactsTableProps) {
  const pageIds = contacts.map((c) => c.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allOnPage = pageIds.length > 0 && selectedOnPage === pageIds.length;

  if (contacts.length === 0) return <>{emptyState}</>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-y border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="w-10 py-2.5 pl-5 pr-2">
              <Checkbox
                aria-label="Select all contacts on this page"
                checked={allOnPage}
                indeterminate={selectedOnPage > 0 && !allOnPage}
                onChange={(e) => onTogglePage(e.target.checked)}
              />
            </th>
            <SortHeader label="Contact" k="fullName" sort={sort} onSort={onSort} />
            <th scope="col" className="px-3 py-2.5 font-semibold">WhatsApp number</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Organisation</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Groups</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Tags</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Opt-in</th>
            <SortHeader label="Created" k="createdAt" sort={sort} onSort={onSort} />
            <th scope="col" className="px-5 py-2.5 text-right font-semibold"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => {
            const isSelected = selected.has(c.id);
            const validPhone = isValidPhone(c.phone);
            return (
              <tr
                key={c.id}
                onClick={() => onView(c)}
                className={cn("cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/50", isSelected && "bg-accent/40 hover:bg-accent/50")}
              >
                <td className="py-3 pl-5 pr-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox aria-label={`Select ${c.fullName}`} checked={isSelected} onChange={() => onToggle(c.id)} />
                </td>
                <td className="max-w-56 px-3 py-3">
                  <p className="truncate font-medium text-foreground">{c.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.email || "No email"}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                  {validPhone ? (
                    formatPhone(c.phone)
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-destructive" title="Invalid WhatsApp number">
                      <AlertTriangle className="size-3.5" aria-hidden="true" />
                      {c.phone}
                      <span className="sr-only">(invalid number)</span>
                    </span>
                  )}
                </td>
                <td className="max-w-48 px-3 py-3">
                  <p className="truncate text-foreground">{c.organisation || "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.designation}</p>
                </td>
                <td className="px-3 py-3"><ChipList items={c.audienceGroups} max={1} /></td>
                <td className="px-3 py-3"><ChipList items={c.tags} max={1} /></td>
                <td className="px-3 py-3"><OptInBadge status={c.optInStatus} /></td>
                <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                  <time dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>
                </td>
                <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-0.5">
                    <IconAction label={`View ${c.fullName}`} onClick={() => onView(c)} icon={Eye} />
                    <IconAction label={`Edit ${c.fullName}`} onClick={() => onEdit(c)} icon={Pencil} />
                    <IconAction label={`Delete ${c.fullName}`} onClick={() => onDelete(c)} icon={Trash2} danger />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IconAction({ label, onClick, icon: Icon, danger }: { label: string; onClick: () => void; icon: typeof Eye; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label.split(" ")[0]}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        danger && "hover:bg-accent hover:text-destructive",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

export function ContactsEmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
        <UsersRound className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold">{filtered ? "No contacts match these filters" : "No contacts yet"}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtered ? "Try a different search or clear the filters." : "Add a contact or import a spreadsheet to get started."}
      </p>
      {filtered && (
        <button type="button" onClick={onClear} className="mt-3 text-sm font-semibold text-primary hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
