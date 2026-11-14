"use client";

import * as React from "react";
import { AlertTriangle, Download, Plus, Upload } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownTrigger } from "@/components/ui/dropdown";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { findDuplicateGroups, mergeContacts } from "@/lib/contacts/duplicates";
import { isCampaignEligible } from "@/lib/contacts/eligibility";
import { exportContacts } from "@/lib/contacts/export";
import { useHub, useWorkspaceContacts } from "@/lib/store/hub-store";
import { cn, formatNumber } from "@/lib/utils";
import type { Contact, ContactInput } from "@/types/contact";

import { BulkActionsBar } from "./bulk-actions-bar";
import { CampaignEligibilityDialog } from "./campaign-eligibility-dialog";
import { ContactDetailsSheet } from "./contact-details-sheet";
import { ContactFormDialog } from "./contact-form-dialog";
import { ContactsFilters, EMPTY_FILTERS, type ContactFilters } from "./contacts-filters";
import { ContactsStats } from "./contacts-stats";
import { ContactsEmptyState, ContactsTable, type Sort, type SortKey } from "./contacts-table";
import { DuplicatesDialog } from "./duplicates-dialog";
import { ImportContactsDialog, type ImportResult } from "./import-contacts-dialog";

/** Local calendar date as YYYY-MM-DD. Only call from event handlers. */
const todayISO = () => new Date().toLocaleDateString("en-CA");
const newId = () => `ct_${crypto.randomUUID().slice(0, 8)}`;
const plural = (n: number, word: string) => `${formatNumber(n)} ${word}${n === 1 ? "" : "s"}`;

function matchesFilters(c: Contact, f: ContactFilters) {
  if (f.query) {
    const q = f.query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const hit =
      c.fullName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (qDigits.length >= 3 && c.phone.replace(/\D/g, "").includes(qDigits));
    if (!hit) return false;
  }
  if (f.group && !c.audienceGroups.includes(f.group)) return false;
  if (f.tag && !c.tags.includes(f.tag)) return false;
  switch (f.consent) {
    case "opted_in":
    case "pending":
    case "opted_out":
      return c.optInStatus === f.consent;
    case "eligible":
      return isCampaignEligible(c);
    case "ineligible":
      return !isCampaignEligible(c);
    default:
      return true;
  }
}

/** Merge an imported row into an existing contact without weakening an opt-out. */
function applyImportUpdate(existing: Contact, input: ContactInput): Contact {
  const pick = (a: string, b: string) => b || a;
  let optInStatus = existing.optInStatus;
  let consentSource = existing.consentSource;
  let consentDate = existing.consentDate;
  if (existing.optInStatus !== "opted_out" && input.optInStatus !== "pending") {
    ({ optInStatus, consentSource, consentDate } = input);
  }
  return {
    ...existing,
    fullName: pick(existing.fullName, input.fullName),
    email: pick(existing.email, input.email),
    country: pick(existing.country, input.country),
    city: pick(existing.city, input.city),
    organisation: pick(existing.organisation, input.organisation),
    designation: pick(existing.designation, input.designation),
    audienceGroups: [...new Set([...existing.audienceGroups, ...input.audienceGroups])],
    tags: [...new Set([...existing.tags, ...input.tags])],
    optInStatus,
    consentSource,
    consentDate,
  };
}

export function ContactsManager({ initialViewId = null }: { initialViewId?: string | null }) {
  const { workspace, data } = useHub();
  const [contacts, setContacts] = useWorkspaceContacts();
  const [filters, setFilters] = React.useState(EMPTY_FILTERS);
  const [sort, setSort] = React.useState<Sort>({ key: "createdAt", dir: "desc" });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [form, setForm] = React.useState<{ contact?: Contact; today: string } | null>(null);
  const [viewId, setViewId] = React.useState<string | null>(initialViewId);
  const [importToday, setImportToday] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmOptions | null>(null);
  const [eligibilityFor, setEligibilityFor] = React.useState<Contact[] | null>(null);
  const [dupesOpen, setDupesOpen] = React.useState(false);
  const [dismissedDupes, setDismissedDupes] = React.useState<Set<string>>(new Set());
  const { toast, toastElement } = useToast();

  const groups = React.useMemo(() => [...new Set([...data.audienceGroups.map((g) => g.name), ...contacts.flatMap((c) => c.audienceGroups)])].sort(), [data.audienceGroups, contacts]);
  const tags = React.useMemo(() => [...new Set([...data.tags.map((t) => t.name), ...contacts.flatMap((c) => c.tags)])].sort(), [data.tags, contacts]);

  const filtered = React.useMemo(() => {
    const list = contacts.filter((c) => matchesFilters(c, filters));
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => a[sort.key].localeCompare(b[sort.key]) * dir);
  }, [contacts, filters, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const duplicateGroups = React.useMemo(
    () => findDuplicateGroups(contacts).filter((g) => !dismissedDupes.has(`${g.matchedOn}:${g.key}`)),
    [contacts, dismissedDupes],
  );

  const selectedContacts = contacts.filter((c) => selected.has(c.id));
  const allMatchingSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const viewing = viewId ? contacts.find((c) => c.id === viewId) ?? null : null;

  // ---- mutations -------------------------------------------------------
  const updateMany = (ids: Set<string>, fn: (c: Contact) => Contact) =>
    setContacts((list) => list.map((c) => (ids.has(c.id) ? fn(c) : c)));

  const removeMany = (ids: Set<string>) => {
    setContacts((list) => list.filter((c) => !ids.has(c.id)));
    setSelected((s) => new Set([...s].filter((id) => !ids.has(id))));
    if (viewId && ids.has(viewId)) setViewId(null);
  };

  function handleSubmit(input: ContactInput) {
    if (form?.contact) {
      const id = form.contact.id;
      setContacts((list) => list.map((c) => (c.id === id ? { ...c, ...input } : c)));
      toast(`${input.fullName} updated`);
    } else {
      setContacts((list) => [{ ...input, id: newId(), createdAt: new Date().toISOString() }, ...list]);
      setSort({ key: "createdAt", dir: "desc" });
      setPage(1);
      toast(`${input.fullName} added`);
    }
    setForm(null);
  }

  function handleImport(result: ImportResult) {
    const now = new Date().toISOString();
    const updates = new Map(result.update.map((u) => [u.id, u.input]));
    setContacts((list) => [
      ...result.create.map((input) => ({ ...input, id: newId(), createdAt: now })),
      ...list.map((c) => (updates.has(c.id) ? applyImportUpdate(c, updates.get(c.id)!) : c)),
    ]);
    toast(`Imported ${plural(result.create.length, "contact")}, updated ${formatNumber(result.update.length)}`);
  }

  function confirmDelete(ids: Set<string>, label: string) {
    setConfirm({
      title: `Delete ${label}?`,
      description: "This permanently deletes the contact and all linked data — conversation messages, campaign history, link clicks, automation history and activity entries. This can’t be undone.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        removeMany(ids);
        toast(`Deleted ${label}`);
      },
    });
  }

  function confirmOptOut(ids: Set<string>, label: string) {
    const today = todayISO();
    setConfirm({
      title: `Mark ${label} as opted out?`,
      description: "They will be excluded from every campaign. Changing them back to opted in requires recording new consent.",
      confirmLabel: "Mark opted out",
      onConfirm: () => {
        updateMany(ids, (c) =>
          c.optInStatus === "opted_out" ? c : { ...c, optInStatus: "opted_out", consentDate: today }, // consent source kept; server records history
        );
        toast(`${label[0].toUpperCase()}${label.slice(1)} marked as opted out`);
      },
    });
  }

  function handleMerge(primaryId: string, otherIds: string[]) {
    const primary = contacts.find((c) => c.id === primaryId);
    const others = contacts.filter((c) => otherIds.includes(c.id));
    if (!primary) return;
    const merged = mergeContacts(primary, others);
    const drop = new Set(otherIds);
    setContacts((list) => list.filter((c) => !drop.has(c.id)).map((c) => (c.id === primaryId ? merged : c)));
    setSelected((s) => new Set([...s].filter((id) => !drop.has(id))));
    toast(`Merged ${plural(others.length + 1, "record")} into ${merged.fullName}`);
  }

  function togglePage(checked: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      pageRows.forEach((c) => (checked ? next.add(c.id) : next.delete(c.id)));
      return next;
    });
  }

  const exportTrigger = cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-card");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contacts"
        description={`WhatsApp contacts, consent and audience groups for ${workspace.name}.`}
        actions={
          <>
            <Dropdown>
              <DropdownTrigger className={exportTrigger}>
                <Download aria-hidden="true" />
                Export
              </DropdownTrigger>
              <DropdownContent className="min-w-52">
                <DropdownLabel>{plural(filtered.length, "contact")} (current filters)</DropdownLabel>
                <DropdownItem disabled={!filtered.length} onClick={() => exportContacts(filtered, "csv").then(() => toast("CSV downloaded"))}>CSV (.csv)</DropdownItem>
                <DropdownItem disabled={!filtered.length} onClick={() => exportContacts(filtered, "xlsx").then(() => toast("Excel file downloaded"))}>Excel (.xlsx)</DropdownItem>
              </DropdownContent>
            </Dropdown>
            <Button variant="outline" size="lg" className="bg-card" onClick={() => setImportToday(todayISO())}>
              <Upload aria-hidden="true" />
              Import
            </Button>
            <Button size="lg" onClick={() => setForm({ today: todayISO() })}>
              <Plus aria-hidden="true" />
              Add contact
            </Button>
          </>
        }
      />

      <ContactsStats contacts={contacts} />

      {duplicateGroups.length > 0 && (
        <div role="status" className="flex flex-col gap-2 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-[#7a3306] sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold">{plural(duplicateGroups.length, "possible duplicate")} found.</strong>{" "}
              Contacts share a WhatsApp number or email address.
            </span>
          </p>
          <button type="button" onClick={() => setDupesOpen(true)} className="shrink-0 pl-6.5 font-semibold underline-offset-4 hover:underline sm:pl-0">
            Review duplicates
          </button>
        </div>
      )}

      <Card className="gap-0 overflow-visible py-0">
        <ContactsFilters
          filters={filters}
          groups={groups}
          tags={tags}
          onChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
        />
        {selected.size > 0 && (
          <BulkActionsBar
            count={selected.size}
            totalMatching={filtered.length}
            allMatchingSelected={allMatchingSelected}
            onSelectAllMatching={() => setSelected(new Set(filtered.map((c) => c.id)))}
            onClear={() => setSelected(new Set())}
            groups={groups}
            tags={tags}
            onAddToGroup={(g) => {
              updateMany(selected, (c) => (c.audienceGroups.includes(g) ? c : { ...c, audienceGroups: [...c.audienceGroups, g] }));
              toast(`Added ${plural(selected.size, "contact")} to ${g}`);
            }}
            onRemoveFromGroup={(g) => {
              updateMany(selected, (c) => ({ ...c, audienceGroups: c.audienceGroups.filter((x) => x !== g) }));
              toast(`Removed ${plural(selected.size, "contact")} from ${g}`);
            }}
            onAddTag={(t) => {
              updateMany(selected, (c) => (c.tags.includes(t) ? c : { ...c, tags: [...c.tags, t] }));
              toast(`Tagged ${plural(selected.size, "contact")} “${t}”`);
            }}
            onPrepareCampaign={() => setEligibilityFor(selectedContacts)}
            onOptOut={() => confirmOptOut(new Set(selected), plural(selected.size, "contact"))}
            onExport={(format) => exportContacts(selectedContacts, format, "channeliam-contacts-selected").then(() => toast("Export downloaded"))}
            onDelete={() => confirmDelete(new Set(selected), plural(selected.size, "contact"))}
          />
        )}
        <ContactsTable
          contacts={pageRows}
          selected={selected}
          onToggle={(id) =>
            setSelected((s) => {
              const next = new Set(s);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onTogglePage={togglePage}
          sort={sort}
          onSort={(key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))}
          onView={(c) => setViewId(c.id)}
          onEdit={(c) => setForm({ contact: c, today: todayISO() })}
          onDelete={(c) => confirmDelete(new Set([c.id]), c.fullName)}
          emptyState={<ContactsEmptyState filtered={contacts.length > 0} onClear={() => setFilters(EMPTY_FILTERS)} />}
        />
        {filtered.length > 0 && (
          <PaginationBar
            page={currentPage}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        )}
      </Card>

      <ContactFormDialog
        open={form !== null}
        contact={form?.contact}
        contacts={contacts}
        today={form?.today ?? ""}
        groups={groups}
        tags={tags}
        onClose={() => setForm(null)}
        onSubmit={handleSubmit}
        onViewContact={(id) => {
          setForm(null);
          setViewId(id);
        }}
      />
      <ContactDetailsSheet
        contact={form ? null : viewing}
        contacts={contacts}
        activity={data.activity}
        onClose={() => setViewId(null)}
        onEdit={(c) => setForm({ contact: c, today: todayISO() })}
        onDelete={(c) => confirmDelete(new Set([c.id]), c.fullName)}
        onOptOut={(c) => confirmOptOut(new Set([c.id]), c.fullName)}
        onReviewDuplicates={() => {
          setViewId(null);
          setDupesOpen(true);
        }}
        onCopied={toast}
      />
      <ImportContactsDialog
        open={importToday !== null}
        contacts={contacts}
        groups={groups}
        today={importToday ?? ""}
        onClose={() => setImportToday(null)}
        onImport={handleImport}
      />
      <CampaignEligibilityDialog
        contacts={eligibilityFor}
        onClose={() => setEligibilityFor(null)}
        onSaveAudience={(name, eligible) => {
          const ids = new Set(eligible.map((c) => c.id));
          updateMany(ids, (c) => (c.audienceGroups.includes(name) ? c : { ...c, audienceGroups: [...c.audienceGroups, name] }));
          setEligibilityFor(null);
          toast(`Saved ${plural(eligible.length, "eligible contact")} to “${name}”`);
        }}
      />
      <DuplicatesDialog
        open={dupesOpen}
        groups={duplicateGroups}
        onClose={() => setDupesOpen(false)}
        onMerge={handleMerge}
        onDismiss={(key) => setDismissedDupes((s) => new Set(s).add(key))}
      />
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
      {toastElement}
    </div>
  );
}
