"use client";

import * as React from "react";
import { Merge } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import type { DuplicateGroup } from "@/lib/contacts/duplicates";
import { formatPhone } from "@/lib/contacts/phone";
import { cn, formatDate } from "@/lib/utils";

import { OptInBadge } from "./opt-in-badge";

export function DuplicatesDialog({
  open,
  groups,
  onClose,
  onMerge,
  onDismiss,
}: {
  open: boolean;
  groups: DuplicateGroup[];
  onClose: () => void;
  onMerge: (primaryId: string, otherIds: string[]) => void;
  onDismiss: (key: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} className="max-w-2xl">
      {open && (
        <>
          <DialogHeader
            title="Review possible duplicates"
            description="Merging keeps the selected contact, combines groups and tags, and permanently deletes the other records together with their messages and campaign history. An opt-out on any record is kept."
            onClose={onClose}
          />
          <DialogBody className="flex flex-col gap-4">
            {groups.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No duplicates left to review.</p>
            ) : (
              groups.map((g) => <GroupCard key={`${g.matchedOn}:${g.key}`} group={g} onMerge={onMerge} onDismiss={onDismiss} />)
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={onClose}>Done</Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}

function GroupCard({ group, onMerge, onDismiss }: { group: DuplicateGroup; onMerge: (p: string, o: string[]) => void; onDismiss: (key: string) => void }) {
  const [primary, setPrimary] = React.useState(group.contacts[0].id);
  return (
    <fieldset className="rounded-xl border border-border">
      <legend className="sr-only">Duplicate group</legend>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-xs">
        <span className="text-muted-foreground">
          Same {group.matchedOn === "phone" ? "WhatsApp number" : "email"}:{" "}
          <span className="font-medium text-foreground">{group.matchedOn === "phone" ? formatPhone(group.key) : group.key}</span>
        </span>
      </div>
      <ul>
        {group.contacts.map((c) => (
          <li key={c.id}>
            <label className={cn("flex cursor-pointer items-center gap-3 px-4 py-3 text-sm", primary === c.id && "bg-accent/40")}>
              <input type="radio" name={`primary-${group.key}`} checked={primary === c.id} onChange={() => setPrimary(c.id)} className="accent-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.fullName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {c.email || "No email"} · {c.audienceGroups.length} groups · added {formatDate(c.createdAt)}
                </span>
              </span>
              <OptInBadge status={c.optInStatus} />
            </label>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2 border-t border-border px-4 py-2.5">
        <Button variant="ghost" size="sm" onClick={() => onDismiss(`${group.matchedOn}:${group.key}`)}>Not a duplicate</Button>
        <Button size="sm" onClick={() => onMerge(primary, group.contacts.filter((c) => c.id !== primary).map((c) => c.id))}>
          <Merge aria-hidden="true" />
          Merge into selected
        </Button>
      </div>
    </fieldset>
  );
}
