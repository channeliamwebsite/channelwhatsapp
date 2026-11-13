"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { OptInBadge } from "@/components/contacts/opt-in-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { matchesSegment } from "@/lib/audience/segments";
import { checkConsent } from "@/lib/funnel/engine";
import { useHub } from "@/lib/store/hub-store";
import { formatNumber } from "@/lib/utils";
import { EMPTY_SEGMENT_FILTER, type Segment, type SegmentFilter } from "@/types/audience";
import type { OptInStatus } from "@/types/contact";

export function SegmentsPanel() {
  const { data, update } = useHub();
  const [editing, setEditing] = React.useState<Segment | "new" | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmOptions | null>(null);
  const size = (s: Segment) => {
    const matched = data.contacts.filter((c) => matchesSegment(c, s.filter));
    return { total: matched.length, eligible: matched.filter((c) => checkConsent(c).ok).length };
  };

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <p className="text-sm text-muted-foreground">Saved, reusable audience filters. Sizes update live from your contacts.</p>
        <Button size="lg" onClick={() => setEditing("new")}><Plus aria-hidden="true" /> New segment</Button>
      </div>
      {data.segments.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted-foreground">No saved segments yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.segments.map((s) => {
            const n = size(s);
            return (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="flex-1">
                  <span className="block font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">{describe(s.filter)}</span>
                </span>
                <span className="text-right text-xs tabular-nums">
                  <span className="block font-semibold text-success">{formatNumber(n.eligible)} eligible</span>
                  <span className="text-muted-foreground">of {formatNumber(n.total)}</span>
                </span>
                <Button variant="ghost" size="icon-lg" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}><Pencil aria-hidden="true" /></Button>
                <Button variant="ghost" size="icon-lg" aria-label={`Delete ${s.name}`} onClick={() => setConfirm({
                  title: `Delete segment “${s.name}”?`,
                  description: data.campaigns.some((c) => c.segmentIds?.includes(s.id) && ["running", "paused", "scheduled"].includes(c.status)) ? "An active or scheduled campaign uses this segment — it will no longer resolve." : "Contacts are not affected.",
                  confirmLabel: "Delete",
                  destructive: true,
                  onConfirm: async () => { await update((d) => ({ ...d, segments: d.segments.filter((x) => x.id !== s.id) })); },
                })}><Trash2 aria-hidden="true" /></Button>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} className="max-w-2xl">
        {editing !== null && (
          <SegmentForm
            key={editing === "new" ? "new" : editing.id}
            segment={editing === "new" ? undefined : editing}
            onClose={() => setEditing(null)}
            onSave={async (seg) => {
              const ok = await update((d) => ({ ...d, segments: d.segments.some((x) => x.id === seg.id) ? d.segments.map((x) => (x.id === seg.id ? seg : x)) : [...d.segments, seg] }));
              if (ok) setEditing(null);
            }}
          />
        )}
      </Dialog>
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </Card>
  );
}

function describe(f: SegmentFilter) {
  const parts = [
    f.groups.length && `groups (${f.groupsMatch}): ${f.groups.join(", ")}`,
    f.tags.length && `tags (${f.tagsMatch}): ${f.tags.join(", ")}`,
    f.optInStatuses.length && `opt-in: ${f.optInStatuses.join(", ")}`,
    f.eligibleOnly && "eligible only",
    (f.addedAfter || f.addedBefore) && `added ${f.addedAfter || "…"} → ${f.addedBefore || "…"}`,
    f.customField?.key && `${f.customField.key} = ${f.customField.value}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "All contacts";
}

function SegmentForm({ segment, onClose, onSave }: { segment?: Segment; onClose: () => void; onSave: (s: Segment) => void }) {
  const { data } = useHub();
  const [name, setName] = React.useState(segment?.name ?? "");
  const [f, setF] = React.useState<SegmentFilter>(segment?.filter ?? EMPTY_SEGMENT_FILTER);
  const set = (patch: Partial<SegmentFilter>) => setF((x) => ({ ...x, ...patch }));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const matched = data.contacts.filter((c) => matchesSegment(c, f));
  const customKeys = [...new Set(data.contacts.flatMap((c) => Object.keys(c.customFields ?? {})))];

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave({ id: segment?.id ?? `seg_${crypto.randomUUID().slice(0, 8)}`, name: name.trim(), filter: f, createdAt: segment?.createdAt ?? new Date().toISOString() }); }}>
      <DialogHeader title={segment ? "Edit segment" : "New segment"} description={`${formatNumber(matched.length)} contacts match · ${formatNumber(matched.filter((c) => checkConsent(c).ok).length)} campaign eligible`} onClose={onClose} />
      <DialogBody className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seg-name">Name *</Label>
          <Input id="seg-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {([["groups", "groupsMatch", data.audienceGroups.map((g) => g.name), "Groups"], ["tags", "tagsMatch", data.tags.map((t) => t.name), "Tags"]] as const).map(([key, matchKey, options, label]) => (
          <fieldset key={key} className="flex flex-col gap-2">
            <legend className="mb-1 flex items-center gap-2 text-[13px] font-medium">
              {label}
              <NativeSelect aria-label={`${label} match`} value={f[matchKey]} onChange={(e) => set({ [matchKey]: e.target.value } as Partial<SegmentFilter>)} className="w-28">
                <option value="any">match any</option>
                <option value="all">match all</option>
              </NativeSelect>
            </legend>
            {options.length === 0 ? <p className="text-xs text-muted-foreground">None created yet.</p> : (
              <div className="flex flex-wrap gap-2">
                {options.map((o) => (
                  <label key={o} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs">
                    <Checkbox checked={f[key].includes(o)} onChange={() => set({ [key]: toggle(f[key], o) } as Partial<SegmentFilter>)} /> {o}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        ))}
        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="mb-1 text-[13px] font-medium">Opt-in status</legend>
          {(["opted_in", "pending", "opted_out"] as OptInStatus[]).map((s) => (
            <label key={s} className="flex items-center gap-1.5"><Checkbox checked={f.optInStatuses.includes(s)} onChange={() => set({ optInStatuses: toggle(f.optInStatuses, s) as OptInStatus[] })} /><OptInBadge status={s} /></label>
          ))}
          <label className="flex items-center gap-1.5 text-sm"><Checkbox checked={f.eligibleOnly} onChange={(e) => set({ eligibleOnly: e.target.checked })} /> Campaign eligible only</label>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5"><Label htmlFor="seg-after">Added on or after</Label><Input id="seg-after" type="date" value={f.addedAfter} onChange={(e) => set({ addedAfter: e.target.value })} /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="seg-before">Added on or before</Label><Input id="seg-before" type="date" value={f.addedBefore} onChange={(e) => set({ addedBefore: e.target.value })} /></div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seg-cf-key">Custom field</Label>
            <NativeSelect id="seg-cf-key" value={f.customField?.key ?? ""} onChange={(e) => set({ customField: e.target.value ? { key: e.target.value, value: f.customField?.value ?? "" } : null })}>
              <option value="">Any</option>
              {customKeys.map((k) => <option key={k} value={k}>{k}</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seg-cf-value">Equals</Label>
            <Input id="seg-cf-value" disabled={!f.customField} value={f.customField?.value ?? ""} onChange={(e) => f.customField && set({ customField: { ...f.customField, value: e.target.value } })} />
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="lg" disabled={!name.trim()}>Save segment</Button>
      </DialogFooter>
    </form>
  );
}
