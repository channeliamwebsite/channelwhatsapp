"use client";

import * as React from "react";
import { CircleAlert, Copy, Info, Pencil, Plus, RefreshCw, Send, Trash2, X } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client/api";
import { placeholderCount, renderBody } from "@/lib/funnel/variables";
import { useHub } from "@/lib/store/hub-store";
import { formatDate } from "@/lib/utils";
import type { TemplateButton, TemplateStatus, WhatsAppTemplate } from "@/types/template";

export const TEMPLATE_STATUS: Record<TemplateStatus, { label: string; variant: "neutral" | "warning" | "success" | "danger" }> = {
  draft: { label: "Draft", variant: "neutral" },
  pending: { label: "Pending approval", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  paused: { label: "Paused by Meta", variant: "warning" },
  disabled: { label: "Disabled", variant: "danger" },
};

const syncTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const formatSyncTime = (iso: string) => `${syncTime.format(new Date(iso))} IST`;
const LANGUAGES = ["en", "en_US", "en_GB", "hi", "ml", "ta", "ar"];

const blank = (): WhatsAppTemplate => ({ id: `tpl_${crypto.randomUUID().slice(0, 10)}`, name: "", category: "MARKETING", language: "en", status: "draft", header: { type: "none" }, body: "", footer: "", buttons: [], examples: [] });

export function TemplatesManager() {
  const { workspace, data, update, reload } = useHub();
  const [syncing, setSyncing] = React.useState(false);
  const account = workspace.whatsappAccount;
  const hasIds = Boolean(account.phoneNumberId && account.wabaId);
  const sync = account.templateSync;
  const syncFromMeta = async () => {
    setSyncing(true);
    try {
      const r = await api<{ total: number; created: number; updated: number; missing: number }>(`/api/workspaces/${encodeURIComponent(workspace.id)}/whatsapp/templates/sync`, { method: "POST" });
      toast(`Synced ${r.total} template${r.total === 1 ? "" : "s"} from Meta (${r.created} new, ${r.updated} updated${r.missing ? `, ${r.missing} no longer in Meta` : ""})`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      await reload();
      setSyncing(false);
    }
  };
  const { toast, toastElement } = useToast();
  const [editing, setEditing] = React.useState<WhatsAppTemplate | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmOptions | null>(null);
  const save = async (t: WhatsAppTemplate, message: string) => {
    const ok = await update((d) => ({ ...d, templates: d.templates.some((x) => x.id === t.id) ? d.templates.map((x) => (x.id === t.id ? t : x)) : [...d.templates, t] }));
    if (ok) toast(message);
    return ok;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Templates" description={`WhatsApp message templates for ${workspace.name}.`} actions={<>
        <Button size="lg" variant="outline" disabled={syncing || !hasIds} title={hasIds ? "Fetch templates and their status from Meta" : "Save the Phone Number ID and WABA ID first"} onClick={syncFromMeta}><RefreshCw className={syncing ? "animate-spin" : undefined} aria-hidden="true" /> {syncing ? "Syncing…" : "Sync from Meta"}</Button>
        <Button size="lg" onClick={() => setEditing(blank())}><Plus aria-hidden="true" /> New template</Button>
      </>} />
      <div role="status" className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        {sync?.status === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" /> : <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
        <div className="flex flex-col gap-0.5">
          <p>
            <span className="font-medium text-foreground">Last successful sync with Meta: </span>
            {sync?.lastSyncedAt ? formatSyncTime(sync.lastSyncedAt) : "never"}
            {sync?.status === "ok" && sync.message ? ` — ${sync.message}` : ""}
          </p>
          {sync?.status === "error" && <p className="text-destructive">Last sync failed{sync.lastAttemptAt ? ` (${formatSyncTime(sync.lastAttemptAt)})` : ""}: {sync.message} Templates were left unchanged.</p>}
          <p className="text-xs">Statuses come only from Meta. Only Approved templates can be used in campaigns and automations, and status is checked with Meta again before every scheduled send.{!hasIds && " Save this workspace’s Phone Number ID and WABA ID on the WhatsApp page to enable sync."}</p>
        </div>
      </div>
      <Card className="gap-0 overflow-hidden py-0">
        {data.templates.length === 0 ? <p className="px-6 py-14 text-center text-sm text-muted-foreground">No templates created yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead><tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-5 py-2.5 font-semibold">Template</th><th scope="col" className="px-3 py-2.5 font-semibold">Category</th><th scope="col" className="px-3 py-2.5 font-semibold">Language</th><th scope="col" className="px-3 py-2.5 font-semibold">Status</th><th scope="col" className="px-3 py-2.5 font-semibold">Updated</th><th scope="col" className="px-5 py-2.5"><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody>
                {data.templates.map((t) => {
                  const fromMeta = Boolean(t.metaTemplateId);
                  const editable = !fromMeta && (t.status === "draft" || t.status === "rejected");
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="max-w-md px-5 py-3"><p className="flex items-center gap-2 font-mono text-[13px] font-medium">{t.name}{fromMeta && <span className="rounded bg-muted px-1.5 py-px font-sans text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Meta</span>}</p><p className="line-clamp-1 text-xs text-muted-foreground">{t.body}</p></td>
                      <td className="px-3 py-3 text-xs">{t.category}</td>
                      <td className="px-3 py-3 font-mono text-xs">{t.language}</td>
                      <td className="max-w-56 px-3 py-3">
                        <Badge variant={TEMPLATE_STATUS[t.status].variant}>{TEMPLATE_STATUS[t.status].label}</Badge>
                        {t.metaStatus && t.metaStatus !== t.status.toUpperCase() && <p className="mt-1 font-mono text-[10px] text-muted-foreground">Meta: {t.metaStatus}</p>}
                        {t.status === "pending" && <p className="mt-1 text-[11px] text-muted-foreground">{fromMeta ? "In Meta review" : "Not yet in Meta — sync after submitting in WhatsApp Manager"}</p>}
                        {t.rejectedReason && <p className="mt-1 text-[11px] text-destructive">Reason: {t.rejectedReason}</p>}
                        {t.statusDetail && <p className="mt-1 text-[11px] text-destructive">{t.statusDetail}</p>}
                        {t.unsupportedReason && <p className="mt-1 text-[11px] text-warning">{t.unsupportedReason}</p>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{t.updatedAt ? formatDate(t.updatedAt) : "—"}</td>
                      <td className="px-5 py-3"><div className="flex justify-end gap-1">
                        {editable && <Button variant="ghost" size="icon-lg" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}><Pencil aria-hidden="true" /></Button>}
                        {t.status === "draft" && !fromMeta && <Button variant="ghost" size="icon-lg" aria-label={`Submit ${t.name} for approval`} title="Mark ready for Meta approval" onClick={() => save({ ...t, status: "pending" }, `${t.name} marked pending approval`)}><Send aria-hidden="true" /></Button>}
                        <Button variant="ghost" size="icon-lg" aria-label={`Duplicate ${t.name}`} onClick={() => setEditing({ ...t, id: blank().id, name: `${t.name}_v2`.slice(0, 512), status: "draft", metaTemplateId: undefined, metaStatus: undefined, wabaId: undefined, rejectedReason: undefined, unsupportedReason: undefined, statusDetail: undefined })}><Copy aria-hidden="true" /></Button>
                        <Button variant="ghost" size="icon-lg" aria-label={`Delete ${t.name}`} onClick={() => setConfirm({ title: `Delete ${t.name}?`, description: fromMeta ? "The record is removed from this dashboard only. It returns on the next sync while it still exists in Meta." : "The template record is removed from this workspace.", confirmLabel: "Delete", destructive: true, onConfirm: async () => { if (await update((d) => ({ ...d, templates: d.templates.filter((x) => x.id !== t.id) }))) toast("Template deleted"); } })}><Trash2 aria-hidden="true" /></Button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} className="max-w-4xl">
        {editing && <TemplateForm key={editing.id} initial={editing} onClose={() => setEditing(null)} onSave={async (t) => { if (await save(t, `${t.name} saved`)) setEditing(null); }} />}
      </Dialog>
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
      {toastElement}
    </div>
  );
}

function TemplateForm({ initial, onClose, onSave }: { initial: WhatsAppTemplate; onClose: () => void; onSave: (t: WhatsAppTemplate) => void }) {
  const [t, setT] = React.useState<WhatsAppTemplate>({ ...initial, status: "draft" });
  const set = (patch: Partial<WhatsAppTemplate>) => setT((x) => ({ ...x, ...patch }));
  const slots = placeholderCount([t]);
  const examples = Array.from({ length: slots }, (_, i) => t.examples?.[i] ?? "");
  const numbers = [...t.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  const problems = [
    !/^[a-z0-9_]+$/.test(t.name) && "Name: lowercase letters, numbers and underscores only.",
    !t.body.trim() && "Body is required.",
    numbers.some((n) => n < 1) || [...new Set(numbers)].sort((a, b) => a - b).some((n, i) => n !== i + 1) ? "Variables must be numbered {{1}}, {{2}} … without gaps." : "",
    examples.some((e) => !e.trim()) && "Add a sample value for every variable (Meta requires examples).",
    t.header?.type === "text" && !t.header.text?.trim() && "Header text is required.",
    t.buttons.some((b) => !b.text.trim() || (b.type === "url" && !/^https:\/\/\S+$/.test(b.url)) || (b.type === "phone" && !/^\+\d{8,15}$/.test(b.phone))) && "Every button needs text and a valid https URL or +phone.",
  ].filter(Boolean) as string[];

  const setButton = (i: number, b: TemplateButton) => set({ buttons: t.buttons.map((x, j) => (j === i ? b : x)) });

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (!problems.length) onSave({ ...t, examples, footer: t.footer?.trim() || undefined }); }}>
      <DialogHeader title={initial.name ? `Edit ${initial.name}` : "New template"} description="Saved as a draft. Approval status is set by Meta." onClose={onClose} />
      <DialogBody className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-3"><Label htmlFor="t-name">Name *</Label><Input id="t-name" value={t.name} onChange={(e) => set({ name: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="summit_invite" className="font-mono" /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="t-cat">Category</Label><NativeSelect id="t-cat" value={t.category} onChange={(e) => set({ category: e.target.value as WhatsAppTemplate["category"] })}><option>MARKETING</option><option>UTILITY</option><option>AUTHENTICATION</option></NativeSelect></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="t-lang">Language</Label><NativeSelect id="t-lang" value={t.language} onChange={(e) => set({ language: e.target.value })}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</NativeSelect></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="t-head">Header</Label><NativeSelect id="t-head" value={t.header?.type ?? "none"} onChange={(e) => set({ header: { type: e.target.value as NonNullable<WhatsAppTemplate["header"]>["type"], text: "" } })}><option value="none">None</option><option value="text">Text</option><option value="image">Image</option><option value="document">Document</option><option value="video">Video</option></NativeSelect></div>
          </div>
          {t.header?.type === "text" && <div className="flex flex-col gap-1.5"><Label htmlFor="t-htext">Header text</Label><Input id="t-htext" maxLength={60} value={t.header.text ?? ""} onChange={(e) => set({ header: { type: "text", text: e.target.value } })} /></div>}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-body">Body * <span className="font-normal text-muted-foreground">— use {"{{1}}"}, {"{{2}}"} for variables</span></Label>
            <textarea id="t-body" rows={5} maxLength={1024} value={t.body} onChange={(e) => set({ body: e.target.value })} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15" />
          </div>
          {slots > 0 && <div className="grid gap-2 sm:grid-cols-2">{examples.map((ex, i) => <Input key={i} aria-label={`Sample value for {{${i + 1}}}`} placeholder={`Sample for {{${i + 1}}}`} value={ex} onChange={(e) => set({ examples: examples.map((x, j) => (j === i ? e.target.value : x)) })} />)}</div>}
          <div className="flex flex-col gap-1.5"><Label htmlFor="t-foot">Footer</Label><Input id="t-foot" maxLength={60} value={t.footer ?? ""} onChange={(e) => set({ footer: e.target.value })} /></div>
          <div className="flex flex-col gap-2">
            <Label>Buttons</Label>
            {t.buttons.map((b, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <NativeSelect aria-label="Button type" value={b.type} className="w-36" onChange={(e) => setButton(i, e.target.value === "url" ? { type: "url", text: b.text, url: "" } : e.target.value === "phone" ? { type: "phone", text: b.text, phone: "" } : { type: "quick_reply", text: b.text })}>
                  <option value="quick_reply">Quick reply</option><option value="url">Visit website</option><option value="phone">Call number</option>
                </NativeSelect>
                <Input aria-label="Button text" maxLength={25} placeholder="Button text" value={b.text} className="w-40" onChange={(e) => setButton(i, { ...b, text: e.target.value })} />
                {b.type === "url" && <Input aria-label="Button URL" placeholder="https://" value={b.url} className="flex-1" onChange={(e) => setButton(i, { ...b, url: e.target.value })} />}
                {b.type === "phone" && <Input aria-label="Button phone" placeholder="+919876543210" value={b.phone} className="flex-1" onChange={(e) => setButton(i, { ...b, phone: e.target.value })} />}
                <Button type="button" variant="ghost" size="icon-lg" aria-label="Remove button" onClick={() => set({ buttons: t.buttons.filter((_, j) => j !== i) })}><X aria-hidden="true" /></Button>
              </div>
            ))}
            {t.buttons.length < 3 && <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => set({ buttons: [...t.buttons, { type: "quick_reply", text: "" }] })}>Add button</Button>}
          </div>
          {problems.length > 0 && <ul className="list-disc pl-5 text-xs text-destructive">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
          <div className="rounded-xl bg-[#e7f6ef] p-3 text-[13px] shadow-xs">
            {t.header?.type === "text" && t.header.text && <p className="mb-1 font-semibold">{t.header.text}</p>}
            {t.header && t.header.type !== "none" && t.header.type !== "text" && <div className="mb-2 flex h-24 items-center justify-center rounded-lg bg-white/70 text-xs uppercase text-muted-foreground">{t.header.type}</div>}
            <p className="whitespace-pre-wrap">{renderBody(t.body || "Message body", examples) }</p>
            {t.footer && <p className="mt-1 text-[11px] text-muted-foreground">{t.footer}</p>}
            {t.buttons.length > 0 && <div className="mt-2 flex flex-col gap-1">{t.buttons.map((b, i) => <span key={i} className="rounded-md bg-white py-1 text-center text-xs font-medium text-info">{b.text || "Button"}</span>)}</div>}
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="lg" disabled={problems.length > 0}>Save draft</Button>
      </DialogFooter>
    </form>
  );
}
