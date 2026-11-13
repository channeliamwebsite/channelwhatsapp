"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { SampleDataBadge } from "@/components/dashboard/sample-data-badge";
import { OptInBadge } from "@/components/contacts/opt-in-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { getIneligibleReason, ineligibleReasonLabel } from "@/lib/contacts/eligibility";
import { formatPhone } from "@/lib/contacts/phone";
import { useHub } from "@/lib/store/hub-store";
import { formatDate, formatNumber } from "@/lib/utils";
import type { AudienceGroup } from "@/types/audience";

type GroupStats = { members: number; eligible: number; pending: number; optedOut: number };

export function AudienceGroupsManager() {
  const { workspace, data, update } = useHub();
  const { toast, toastElement } = useToast();
  const [editing, setEditing] = React.useState<AudienceGroup | "new" | null>(null);
  const [viewing, setViewing] = React.useState<AudienceGroup | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmOptions | null>(null);

  const stats = React.useMemo(() => {
    const map = new Map<string, GroupStats>();
    for (const g of data.audienceGroups) map.set(g.name, { members: 0, eligible: 0, pending: 0, optedOut: 0 });
    for (const c of data.contacts) {
      const reason = getIneligibleReason(c);
      for (const g of c.audienceGroups) {
        const s = map.get(g);
        if (!s) continue;
        s.members++;
        if (!reason) s.eligible++;
        if (c.optInStatus === "pending") s.pending++;
        if (c.optInStatus === "opted_out") s.optedOut++;
      }
    }
    return map;
  }, [data]);

  const usedBy = (name: string) => data.campaigns.filter((c) => c.audienceGroups.includes(name) && ["running", "scheduled", "paused"].includes(c.status));

  function save(input: { name: string; description: string }, original?: AudienceGroup) {
    update((d) => {
      if (!original) {
        return { ...d, audienceGroups: [...d.audienceGroups, { id: `grp_${crypto.randomUUID().slice(0, 8)}`, ...input, createdAt: new Date().toISOString() }] };
      }
      const rename = (n: string) => (n === original.name ? input.name : n);
      return {
        ...d,
        audienceGroups: d.audienceGroups.map((g) => (g.id === original.id ? { ...g, ...input } : g)),
        contacts: d.contacts.map((c) => (c.audienceGroups.includes(original.name) ? { ...c, audienceGroups: c.audienceGroups.map(rename) } : c)),
        campaigns: d.campaigns.map((c) => ({ ...c, audienceGroups: c.audienceGroups.map(rename) })),
      };
    });
    toast(original ? `Group “${input.name}” updated` : `Group “${input.name}” created`);
    setEditing(null);
  }

  function remove(group: AudienceGroup) {
    const active = usedBy(group.name);
    setConfirm({
      title: `Delete “${group.name}”?`,
      description: active.length
        ? `This group is used by ${active.length} active campaign(s). Remove it from those campaigns first.`
        : "Contacts stay in your workspace — only the group is removed from them.",
      confirmLabel: active.length ? "OK" : "Delete group",
      destructive: !active.length,
      onConfirm: () => {
        if (active.length) return;
        update((d) => ({
          ...d,
          audienceGroups: d.audienceGroups.filter((g) => g.id !== group.id),
          contacts: d.contacts.map((c) => ({ ...c, audienceGroups: c.audienceGroups.filter((n) => n !== group.name) })),
        }));
        toast(`Group “${group.name}” deleted`);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<SampleDataBadge />}
        title="Audience groups"
        description={`Reusable segments for ${workspace.name}. Only campaign-eligible members receive funnel messages.`}
        actions={
          <Button size="lg" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Create group
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        {data.audienceGroups.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Users className="size-6 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">No audience groups yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a group, then add contacts to it from the Contacts page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 font-semibold">Group</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Members</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Campaign eligible</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Pending</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Opted out</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Created</th>
                  <th scope="col" className="px-5 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.audienceGroups.map((g) => {
                  const s = stats.get(g.name) ?? { members: 0, eligible: 0, pending: 0, optedOut: 0 };
                  return (
                    <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <button type="button" onClick={() => setViewing(g)} className="text-left font-medium hover:text-primary">{g.name}</button>
                        <p className="text-xs text-muted-foreground">{g.description || "No description"}</p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(s.members)}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-success">{formatNumber(s.eligible)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatNumber(s.pending)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatNumber(s.optedOut)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{formatDate(g.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-lg" aria-label={`View members of ${g.name}`} onClick={() => setViewing(g)}><Users aria-hidden="true" /></Button>
                          <Button variant="ghost" size="icon-lg" aria-label={`Edit ${g.name}`} onClick={() => setEditing(g)}><Pencil aria-hidden="true" /></Button>
                          <Button variant="ghost" size="icon-lg" aria-label={`Delete ${g.name}`} onClick={() => remove(g)}><Trash2 aria-hidden="true" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <GroupFormDialog
        group={editing}
        existingNames={data.audienceGroups.map((g) => g.name)}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)} side="right" aria-label="Group members">
        {viewing && (
          <>
            <DialogHeader title={viewing.name} description={`${formatNumber(stats.get(viewing.name)?.members ?? 0)} members`} onClose={() => setViewing(null)} />
            <DialogBody className="px-0 py-0">
              <ul className="divide-y divide-border">
                {data.contacts.filter((c) => c.audienceGroups.includes(viewing.name)).map((c) => {
                  const reason = getIneligibleReason(c);
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.fullName}</p>
                        <p className="truncate text-xs tabular-nums text-muted-foreground">{formatPhone(c.phone)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <OptInBadge status={c.optInStatus} />
                        {reason && <span className="text-[11px] text-destructive">{ineligibleReasonLabel[reason]}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </DialogBody>
          </>
        )}
      </Dialog>

      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
      {toastElement}
    </div>
  );
}

function GroupFormDialog({
  group,
  existingNames,
  onClose,
  onSave,
}: {
  group: AudienceGroup | "new" | null;
  existingNames: string[];
  onClose: () => void;
  onSave: (input: { name: string; description: string }, original?: AudienceGroup) => void;
}) {
  return (
    <Dialog open={group !== null} onOpenChange={(o) => !o && onClose()}>
      {group !== null && <GroupForm key={group === "new" ? "new" : group.id} group={group === "new" ? undefined : group} existingNames={existingNames} onClose={onClose} onSave={onSave} />}
    </Dialog>
  );
}

function GroupForm({ group, existingNames, onClose, onSave }: { group?: AudienceGroup; existingNames: string[]; onClose: () => void; onSave: (i: { name: string; description: string }, o?: AudienceGroup) => void }) {
  const [name, setName] = React.useState(group?.name ?? "");
  const [description, setDescription] = React.useState(group?.description ?? "");
  const clash = existingNames.some((n) => n.toLowerCase() === name.trim().toLowerCase() && n !== group?.name);
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && !clash) onSave({ name: name.trim(), description: description.trim() }, group);
      }}
    >
      <DialogHeader title={group ? "Edit group" : "Create group"} onClose={onClose} />
      <DialogBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grp-name">Name <span className="text-primary">*</span></Label>
          <Input id="grp-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={clash} />
          {clash && <p className="text-xs text-destructive">A group with this name already exists.</p>}
          {group && <p className="text-xs text-muted-foreground">Renaming updates every contact and campaign that uses this group.</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grp-desc">Description</Label>
          <Input id="grp-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="lg" disabled={!name.trim() || clash}>{group ? "Save" : "Create group"}</Button>
      </DialogFooter>
    </form>
  );
}
