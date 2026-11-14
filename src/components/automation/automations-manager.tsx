"use client";

import * as React from "react";
import { Info, Pencil, Plus, Trash2, X } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useToast } from "@/components/ui/toast";
import { TRIGGER_LABEL } from "@/lib/automation/engine";
import { useHub } from "@/lib/store/hub-store";
import { formatDate } from "@/lib/utils";
import type { Automation, AutomationAction, AutomationCondition, AutomationRun, AutomationTriggerType } from "@/types/automation";

const MESSAGE_TRIGGERS: AutomationTriggerType[] = ["message_read", "link_clicked", "contact_replied", "message_failed"];
const RUN_BADGE: Record<AutomationRun["status"], "neutral" | "success" | "danger" | "outline"> = { pending: "neutral", processing: "neutral", succeeded: "success", failed: "danger", skipped: "outline" };

function describeAction(a: AutomationAction, templates: Map<string, string>) {
  switch (a.type) {
    case "send_template": return `Send ${templates.get(a.templateId) ?? "template"}`;
    case "add_tag": return `Add tag “${a.tag}”`;
    case "remove_tag": return `Remove tag “${a.tag}”`;
    case "add_to_group": return `Add to “${a.group}”`;
    case "remove_from_group": return `Remove from “${a.group}”`;
    case "set_custom_field": return `Set ${a.key} = ${a.value}`;
  }
}

export function AutomationsManager() {
  const { workspace, data, update } = useHub();
  const { toast, toastElement } = useToast();
  const [editing, setEditing] = React.useState<Automation | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmOptions | null>(null);
  const templates = new Map(data.templates.map((t) => [t.id, t.name]));
  const names = new Map(data.automations.map((a) => [a.id, a.name]));
  const contacts = new Map(data.contacts.map((c) => [c.id, c.fullName]));
  const save = (a: Automation) => update((d) => ({ ...d, automations: d.automations.some((x) => x.id === a.id) ? d.automations.map((x) => (x.id === a.id ? a : x)) : [...d.automations, a] }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Automation" description={`Trigger-based workflows for ${workspace.name}.`} actions={
        <Button size="lg" onClick={() => setEditing({ id: `aut_${crypto.randomUUID().slice(0, 10)}`, name: "", enabled: false, trigger: { type: "contact_added" }, conditions: [], actions: [{ type: "add_tag", tag: "" }], delayMinutes: 0, createdAt: new Date().toISOString() })}>
          <Plus aria-hidden="true" /> New automation
        </Button>
      } />
      <p role="note" className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Automations run on real events only. “Contact is added” works now; message triggers start once WhatsApp events are connected. “Send template” actions are recorded as not sent until WhatsApp sending is available.
      </p>

      <Card className="gap-0 overflow-hidden py-0">
        {data.automations.length === 0 ? <p className="px-6 py-14 text-center text-sm text-muted-foreground">No automations created yet.</p> : (
          <ul className="divide-y divide-border">
            {data.automations.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <label className="flex items-center gap-2" title={a.enabled ? "Enabled" : "Disabled"}>
                  <Checkbox aria-label={`${a.enabled ? "Disable" : "Enable"} ${a.name}`} checked={a.enabled} onChange={async (e) => { if (await save({ ...a, enabled: e.target.checked })) toast(`${a.name} ${e.target.checked ? "enabled" : "disabled"}`); }} />
                </label>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{a.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    When: {TRIGGER_LABEL[a.trigger.type]}{a.delayMinutes ? ` · wait ${a.delayMinutes} min` : ""}{a.conditions.length ? ` · ${a.conditions.length} condition(s)` : ""} → {a.actions.map((x) => describeAction(x, templates)).join(", ")}
                  </span>
                </span>
                <Badge variant={a.enabled ? "success" : "neutral"}>{a.enabled ? "Enabled" : "Disabled"}</Badge>
                <Button variant="ghost" size="icon-lg" aria-label={`Edit ${a.name}`} onClick={() => setEditing(a)}><Pencil aria-hidden="true" /></Button>
                <Button variant="ghost" size="icon-lg" aria-label={`Delete ${a.name}`} onClick={() => setConfirm({ title: `Delete ${a.name}?`, description: "Pending runs for this automation will be skipped.", confirmLabel: "Delete", destructive: true, onConfirm: async () => { if (await update((d) => ({ ...d, automations: d.automations.filter((x) => x.id !== a.id) }))) toast("Automation deleted"); } })}><Trash2 aria-hidden="true" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <p className="border-b border-border px-5 py-3 text-sm font-semibold">Execution history</p>
        {data.automationRuns.length === 0 ? <p className="px-6 py-10 text-center text-sm text-muted-foreground">No executions yet. Runs appear here when a real trigger fires.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><th scope="col" className="px-5 py-2 font-semibold">Automation</th><th scope="col" className="px-3 py-2 font-semibold">Contact</th><th scope="col" className="px-3 py-2 font-semibold">Trigger</th><th scope="col" className="px-3 py-2 font-semibold">Result</th><th scope="col" className="px-5 py-2 font-semibold">When</th></tr></thead>
              <tbody>
                {data.automationRuns.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5">{names.get(r.automationId) ?? "Deleted automation"}</td>
                    <td className="px-3 py-2.5">{contacts.get(r.contactId) ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs">{TRIGGER_LABEL[r.trigger]}</td>
                    <td className="px-3 py-2.5"><Badge variant={RUN_BADGE[r.status]}>{r.status}</Badge>{r.detail && <span className="ml-2 text-xs text-muted-foreground">{r.detail}</span>}</td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-xs text-muted-foreground">{formatDate(r.executedAt ?? r.triggeredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} className="max-w-3xl">
        {editing && <AutomationForm key={editing.id} initial={editing} onClose={() => setEditing(null)} onSave={async (a) => { if (await save({ ...a, updatedAt: new Date().toISOString() })) { toast(`${a.name} saved`); setEditing(null); } }} />}
      </Dialog>
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
      {toastElement}
    </div>
  );
}

function AutomationForm({ initial, onClose, onSave }: { initial: Automation; onClose: () => void; onSave: (a: Automation) => void }) {
  const { data } = useHub();
  const [a, setA] = React.useState(initial);
  const set = (patch: Partial<Automation>) => setA((x) => ({ ...x, ...patch }));
  const approved = data.templates.filter((t) => t.status === "approved");
  const groups = data.audienceGroups.map((g) => g.name);
  const tags = data.tags.map((t) => t.name);
  const setCondition = (i: number, c: AutomationCondition) => set({ conditions: a.conditions.map((x, j) => (j === i ? c : x)) });
  const setAction = (i: number, x: AutomationAction) => set({ actions: a.actions.map((y, j) => (j === i ? x : y)) });
  const problems = [
    !a.name.trim() && "Name is required.",
    a.trigger.type === "scheduled" && !a.trigger.runAt && "Choose when the scheduled automation runs.",
    a.actions.length === 0 && "Add at least one action.",
    a.actions.some((x) => (x.type === "send_template" && !x.templateId) || ((x.type === "add_tag" || x.type === "remove_tag") && !x.tag.trim()) || ((x.type === "add_to_group" || x.type === "remove_from_group") && !x.group.trim()) || (x.type === "set_custom_field" && !x.key.trim())) && "Complete every action.",
    a.conditions.some((c) => !c.value.trim() || (c.field === "customField" && !c.key?.trim())) && "Complete every condition.",
  ].filter(Boolean) as string[];

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (!problems.length) onSave({ ...a, name: a.name.trim() }); }}>
      <DialogHeader title={initial.name ? `Edit ${initial.name}` : "New automation"} onClose={onClose} />
      <DialogBody className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1.5"><Label htmlFor="a-name">Name *</Label><Input id="a-name" value={a.name} onChange={(e) => set({ name: e.target.value })} /></div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><Checkbox checked={a.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> Enabled</label>
        </div>

        <fieldset className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-3">
          <legend className="px-1 text-[13px] font-semibold">Trigger</legend>
          <NativeSelect aria-label="Trigger" value={a.trigger.type} onChange={(e) => set({ trigger: { type: e.target.value as AutomationTriggerType } })}>
            {(Object.keys(TRIGGER_LABEL) as AutomationTriggerType[]).map((t) => <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>)}
          </NativeSelect>
          {MESSAGE_TRIGGERS.includes(a.trigger.type) && (
            <NativeSelect aria-label="Campaign" value={a.trigger.campaignId ?? ""} onChange={(e) => set({ trigger: { ...a.trigger, campaignId: e.target.value || undefined } })}>
              <option value="">Any campaign</option>
              {data.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          )}
          {a.trigger.type === "scheduled" && <Input aria-label="Run at" type="datetime-local" value={a.trigger.runAt ? a.trigger.runAt.slice(0, 16) : ""} onChange={(e) => set({ trigger: { type: "scheduled", runAt: e.target.value ? new Date(e.target.value).toISOString() : undefined } })} />}
          <div className="flex items-center gap-2 sm:col-span-3"><Label htmlFor="a-delay">Delay before actions</Label><Input id="a-delay" type="number" min={0} max={43200} value={a.delayMinutes} onChange={(e) => set({ delayMinutes: Math.max(0, Number(e.target.value)) })} className="w-24" /><span className="text-sm text-muted-foreground">minutes</span></div>
        </fieldset>

        <fieldset className="flex flex-col gap-2 rounded-xl border border-border p-4">
          <legend className="px-1 text-[13px] font-semibold">Conditions (all must match)</legend>
          {a.conditions.length === 0 && <p className="text-xs text-muted-foreground">No conditions — every triggering contact qualifies.</p>}
          {a.conditions.map((c, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <NativeSelect aria-label="Field" className="w-36" value={c.field} onChange={(e) => setCondition(i, { field: e.target.value as AutomationCondition["field"], operator: c.operator, value: "" })}>
                <option value="optInStatus">Opt-in status</option><option value="group">Group</option><option value="tag">Tag</option><option value="customField">Custom field</option>
              </NativeSelect>
              {c.field === "customField" && <Input aria-label="Custom field name" className="w-32" placeholder="Field" value={c.key ?? ""} onChange={(e) => setCondition(i, { ...c, key: e.target.value })} />}
              <NativeSelect aria-label="Operator" className="w-24" value={c.operator} onChange={(e) => setCondition(i, { ...c, operator: e.target.value as "is" | "is_not" })}><option value="is">is</option><option value="is_not">is not</option></NativeSelect>
              {c.field === "optInStatus" ? (
                <NativeSelect aria-label="Value" className="flex-1" value={c.value} onChange={(e) => setCondition(i, { ...c, value: e.target.value })}><option value="">Choose…</option><option value="opted_in">Opted in</option><option value="pending">Pending</option><option value="opted_out">Opted out</option></NativeSelect>
              ) : c.field === "group" || c.field === "tag" ? (
                <NativeSelect aria-label="Value" className="flex-1" value={c.value} onChange={(e) => setCondition(i, { ...c, value: e.target.value })}><option value="">Choose…</option>{(c.field === "group" ? groups : tags).map((x) => <option key={x}>{x}</option>)}</NativeSelect>
              ) : <Input aria-label="Value" className="flex-1" value={c.value} onChange={(e) => setCondition(i, { ...c, value: e.target.value })} />}
              <Button type="button" variant="ghost" size="icon-lg" aria-label="Remove condition" onClick={() => set({ conditions: a.conditions.filter((_, j) => j !== i) })}><X aria-hidden="true" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => set({ conditions: [...a.conditions, { field: "optInStatus", operator: "is", value: "opted_in" }] })}>Add condition</Button>
        </fieldset>

        <fieldset className="flex flex-col gap-2 rounded-xl border border-border p-4">
          <legend className="px-1 text-[13px] font-semibold">Actions (in order)</legend>
          {a.actions.map((x, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <NativeSelect aria-label="Action" className="w-48" value={x.type} onChange={(e) => {
                const t = e.target.value as AutomationAction["type"];
                setAction(i, t === "send_template" ? { type: t, templateId: "" } : t === "add_tag" || t === "remove_tag" ? { type: t, tag: "" } : t === "set_custom_field" ? { type: t, key: "", value: "" } : { type: t, group: "" });
              }}>
                <option value="add_tag">Add tag</option><option value="remove_tag">Remove tag</option><option value="add_to_group">Add to group</option><option value="remove_from_group">Remove from group</option><option value="set_custom_field">Set custom field</option><option value="send_template">Send template</option>
              </NativeSelect>
              {x.type === "send_template" && <NativeSelect aria-label="Template" className="flex-1" value={x.templateId} onChange={(e) => setAction(i, { ...x, templateId: e.target.value })}><option value="">{approved.length ? "Choose approved template…" : "No approved templates yet"}</option>{approved.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</NativeSelect>}
              {(x.type === "add_tag" || x.type === "remove_tag") && <Input aria-label="Tag" list="aut-tags" className="flex-1" value={x.tag} onChange={(e) => setAction(i, { ...x, tag: e.target.value })} />}
              {(x.type === "add_to_group" || x.type === "remove_from_group") && <Input aria-label="Group" list="aut-groups" className="flex-1" value={x.group} onChange={(e) => setAction(i, { ...x, group: e.target.value })} />}
              {x.type === "set_custom_field" && <><Input aria-label="Field" className="w-32" placeholder="Field" value={x.key} onChange={(e) => setAction(i, { ...x, key: e.target.value })} /><Input aria-label="Value" className="flex-1" placeholder="Value" value={x.value} onChange={(e) => setAction(i, { ...x, value: e.target.value })} /></>}
              <Button type="button" variant="ghost" size="icon-lg" aria-label="Remove action" onClick={() => set({ actions: a.actions.filter((_, j) => j !== i) })}><X aria-hidden="true" /></Button>
            </div>
          ))}
          <datalist id="aut-tags">{tags.map((t) => <option key={t} value={t} />)}</datalist>
          <datalist id="aut-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => set({ actions: [...a.actions, { type: "add_tag", tag: "" }] })}>Add action</Button>
        </fieldset>
        {problems.length > 0 && <ul className="list-disc pl-5 text-xs text-destructive">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="lg" disabled={problems.length > 0}>Save automation</Button>
      </DialogFooter>
    </form>
  );
}
