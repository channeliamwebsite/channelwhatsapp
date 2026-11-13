"use client";

import * as React from "react";
import { CircleCheck, CircleSlash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ineligibleReasonLabel, splitByEligibility, type IneligibleReason } from "@/lib/contacts/eligibility";
import { formatNumber } from "@/lib/utils";
import type { Contact } from "@/types/contact";

/**
 * Shows which selected contacts can receive a campaign. Only eligible
 * (opted-in, valid number) contacts can be saved as a campaign audience.
 */
export function CampaignEligibilityDialog({
  contacts,
  onClose,
  onSaveAudience,
}: {
  contacts: Contact[] | null;
  onClose: () => void;
  onSaveAudience: (groupName: string, eligible: Contact[]) => void;
}) {
  return (
    <Dialog open={contacts !== null} onOpenChange={(o) => !o && onClose()}>
      {contacts && <Body contacts={contacts} onClose={onClose} onSaveAudience={onSaveAudience} />}
    </Dialog>
  );
}

function Body({ contacts, onClose, onSaveAudience }: { contacts: Contact[]; onClose: () => void; onSaveAudience: (g: string, e: Contact[]) => void }) {
  const { eligible, excluded } = splitByEligibility(contacts);
  const [name, setName] = React.useState("");
  const counts = excluded.reduce<Record<IneligibleReason, number>>(
    (acc, { reason }) => ({ ...acc, [reason]: acc[reason] + 1 }),
    { opted_out: 0, pending_consent: 0, invalid_phone: 0 },
  );

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && eligible.length) onSaveAudience(name.trim(), eligible);
      }}
    >
      <DialogHeader title="Use in campaign" description={`${formatNumber(contacts.length)} contacts selected`} onClose={onClose} />
      <DialogBody className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-success/20 bg-success-soft p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-success">
              <CircleCheck className="size-3.5" aria-hidden="true" /> Eligible
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(eligible.length)}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/60 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <CircleSlash className="size-3.5" aria-hidden="true" /> Excluded
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(excluded.length)}</p>
          </div>
        </div>

        {excluded.length > 0 && (
          <div className="text-sm">
            <p className="font-medium">Why some contacts are excluded</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-muted-foreground">
              {(Object.keys(counts) as IneligibleReason[]).filter((r) => counts[r]).map((r) => (
                <li key={r} className="flex justify-between">
                  <span>{ineligibleReasonLabel[r]}</span>
                  <span className="tabular-nums">{formatNumber(counts[r])}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Opted-out and pending contacts are never added to a campaign audience.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audienceName">Save eligible contacts as an audience group</Label>
          <Input id="audienceName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summit 2026 — Invite list" />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="lg" disabled={!name.trim() || eligible.length === 0}>
          Save {formatNumber(eligible.length)} eligible
        </Button>
      </DialogFooter>
    </form>
  );
}
