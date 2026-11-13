"use client";

import * as React from "react";
import { AlertTriangle, CircleSlash, Copy, Mail, MapPin, Pencil, Phone, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { findMatches } from "@/lib/contacts/duplicates";
import { getIneligibleReason, ineligibleReasonLabel } from "@/lib/contacts/eligibility";
import { formatPhone, isValidPhone } from "@/lib/contacts/phone";
import { formatDate } from "@/lib/utils";
import type { ActivityEvent } from "@/types/activity";
import type { Contact } from "@/types/contact";

import { OptInBadge } from "./opt-in-badge";

type Props = {
  contact: Contact | null;
  contacts: Contact[];
  activity: ActivityEvent[];
  onClose: () => void;
  onEdit: (c: Contact) => void;
  onDelete: (c: Contact) => void;
  onOptOut: (c: Contact) => void;
  onReviewDuplicates: () => void;
  onCopied: (text: string) => void;
};

export function ContactDetailsSheet({ contact, contacts, activity, onClose, onEdit, onDelete, onOptOut, onReviewDuplicates, onCopied }: Props) {
  return (
    <Dialog open={contact !== null} onOpenChange={(o) => !o && onClose()} side="right" aria-label="Contact details">
      {contact && <Details {...{ contact, contacts, activity, onClose, onEdit, onDelete, onOptOut, onReviewDuplicates, onCopied }} />}
    </Dialog>
  );
}

function Details({ contact, contacts, activity, onClose, onEdit, onDelete, onOptOut, onReviewDuplicates, onCopied }: Props & { contact: Contact }) {
  const reason = getIneligibleReason(contact);
  const dup = findMatches(contacts, contact, contact.id);
  const duplicate = dup.phone ?? dup.email;
  const initials = contact.fullName.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  return (
    <>
      <DialogHeader title="Contact details" onClose={onClose} />
      <DialogBody className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback className="bg-accent font-semibold text-accent-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold leading-tight">{contact.fullName}</p>
            <p className="truncate text-sm text-muted-foreground">
              {[contact.designation, contact.organisation].filter(Boolean).join(" · ") || "No organisation"}
            </p>
          </div>
        </div>

        <div className={reason ? "rounded-lg border border-border bg-muted/50 p-3" : "rounded-lg border border-success/20 bg-success-soft p-3"}>
          <div className="flex items-center justify-between gap-2">
            <OptInBadge status={contact.optInStatus} />
            <span className={reason ? "text-xs font-semibold text-destructive" : "text-xs font-semibold text-success"}>
              {reason ? `Not campaign eligible · ${ineligibleReasonLabel[reason]}` : "Campaign eligible"}
            </span>
          </div>
          {contact.optInStatus !== "pending" && (
            <p className="mt-2 text-xs text-muted-foreground">
              {contact.optInStatus === "opted_out" ? "Opted out" : "Consent"} via {contact.consentSource || "unknown source"}
              {contact.consentDate && ` on ${formatDate(contact.consentDate)}`}
            </p>
          )}
        </div>

        {duplicate && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm text-[#7a3306]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="flex-1">
              Possible duplicate of <strong>{duplicate.fullName}</strong> (same {dup.phone ? "number" : "email"}).
            </p>
            <button type="button" onClick={onReviewDuplicates} className="shrink-0 font-semibold hover:underline">Review</button>
          </div>
        )}

        <dl className="flex flex-col gap-3 text-sm">
          <InfoRow icon={Phone} label="WhatsApp">
            <span className="flex items-center gap-2">
              <span className={isValidPhone(contact.phone) ? "tabular-nums" : "tabular-nums text-destructive"}>
                {isValidPhone(contact.phone) ? formatPhone(contact.phone) : `${contact.phone} (invalid)`}
              </span>
              <button
                type="button"
                aria-label="Copy number"
                onClick={() => navigator.clipboard?.writeText(contact.phone).then(() => onCopied("Number copied"))}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Copy className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          </InfoRow>
          <InfoRow icon={Mail} label="Email">{contact.email || "—"}</InfoRow>
          <InfoRow icon={MapPin} label="Location">{[contact.city, contact.country].filter(Boolean).join(", ") || "—"}</InfoRow>
        </dl>

        <Section title="Audience groups" items={contact.audienceGroups} />
        <Section title="Tags" items={contact.tags} />

        {Object.keys(contact.customFields ?? {}).length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {Object.entries(contact.customFields!).map(([k, v]) => (
              <React.Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{v || "—"}</dd></React.Fragment>
            ))}
          </dl>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consent history</p>
          {contact.consentHistory?.length ? (
            <ol className="flex flex-col gap-1 text-xs">
              {[...contact.consentHistory].reverse().map((h, i) => (
                <li key={i}><span className="font-medium">{h.status.replace("_", " ")}</span> · {h.source} · {formatDate(h.at)}</li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted-foreground">No changes recorded yet.</p>}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {contact.countryCode && `Country code +${contact.countryCode} · `}
            {contact.optedInAt && `Opted in ${formatDate(contact.optedInAt)} · `}
            {contact.optedOutAt && `Opted out ${formatDate(contact.optedOutAt)}`}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity</p>
          {activity.filter((a) => a.contactId === contact.id).length ? (
            <ol className="flex flex-col gap-1 text-xs">
              {activity.filter((a) => a.contactId === contact.id).slice(0, 20).map((a) => (
                <li key={a.id}>{a.message} · <span className="text-muted-foreground">{formatDate(a.at)}</span></li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted-foreground">No activity yet.</p>}
        </div>

        <p className="text-xs text-muted-foreground">Created {formatDate(contact.createdAt)}{contact.updatedAt && ` · Updated ${formatDate(contact.updatedAt)}`} · ID {contact.id}</p>
      </DialogBody>
      <DialogFooter className="sm:justify-between">
        <Button variant="ghost" size="lg" className="text-destructive hover:bg-accent hover:text-destructive" onClick={() => onDelete(contact)}>
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {contact.optInStatus !== "opted_out" && (
            <Button variant="outline" size="lg" onClick={() => onOptOut(contact)}>
              <CircleSlash aria-hidden="true" />
              Opt out
            </Button>
          )}
          <Button size="lg" onClick={() => onEdit(contact)}>
            <Pencil aria-hidden="true" />
            Edit contact
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <span key={i} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{i}</span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">None</p>
      )}
    </div>
  );
}
