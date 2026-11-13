"use client";

import * as React from "react";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client/api";
import { clientAuth } from "@/lib/client/firebase";
import { useHub } from "@/lib/store/hub-store";
import { formatDate } from "@/lib/utils";
import { DEFAULT_NOTIFICATIONS, DEFAULT_TRACKING } from "@/types/workspace";

import { profileOf, WorkspaceProfileForm } from "./workspace-profile-form";

const TABS = ["General", "Notifications", "Tracking", "Account", "Security"] as const;
type Tab = (typeof TABS)[number];
type AuditEntry = { id: string; at: string; actor: string; action: string; message: string; workspaceId?: string };

export function WorkspaceSettings() {
  const { workspace } = useHub();
  const [tab, setTab] = React.useState<Tab>("General");
  const { toast, toastElement } = useToast();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description={`Workspace settings apply to ${workspace.name} only. Account and security settings apply to the Super Admin.`} />
      <div role="tablist" aria-label="Settings sections" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </div>
      <div key={`${workspace.id}-${tab}`}>
        {tab === "General" && <General toast={toast} />}
        {tab === "Notifications" && <Notifications toast={toast} />}
        {tab === "Tracking" && <Tracking toast={toast} />}
        {tab === "Account" && <Account toast={toast} />}
        {tab === "Security" && <Security />}
      </div>
      {toastElement}
    </div>
  );
}

type ToastProp = { toast: (m: string) => void };

function General({ toast }: ToastProp) {
  const { workspace, updateWorkspace } = useHub();
  return (
    <Card className="p-5">
      <WorkspaceProfileForm workspace={workspace} onSave={async (p) => { const ok = await updateWorkspace(workspace.id, p); if (ok) toast("Settings saved"); return ok; }} />
    </Card>
  );
}

function Notifications({ toast }: ToastProp) {
  const { workspace, updateWorkspace } = useHub();
  const [n, setN] = React.useState({ ...DEFAULT_NOTIFICATIONS, ...workspace.settings?.notifications });
  const rows: [keyof typeof n, string, string][] = [
    ["campaigns", "Campaign notifications", "Campaign launched, paused, resumed or cancelled"],
    ["failures", "Failure notifications", "Opt-outs and campaign cancellations that need attention"],
    ["automations", "Automation notifications", "Contacts imported and other changes made by automations"],
  ];
  return (
    <Card className="gap-4 p-5">
      <p className="text-sm text-muted-foreground">Choose which events appear in the notification menu for this workspace. Notifications are built from the server activity log — nothing is generated.</p>
      {rows.map(([key, label, hint]) => (
        <label key={key} className="flex items-start gap-3 text-sm"><Checkbox className="mt-0.5" checked={n[key]} onChange={(e) => setN((x) => ({ ...x, [key]: e.target.checked }))} /><span><span className="block font-medium">{label}</span><span className="block text-xs text-muted-foreground">{hint}</span></span></label>
      ))}
      <Button size="lg" className="w-fit" onClick={async () => { const p = profileOf(workspace); if (await updateWorkspace(workspace.id, { ...p, settings: { ...p.settings, notifications: n } })) toast("Notification settings saved"); }}>Save</Button>
    </Card>
  );
}

function Tracking({ toast }: ToastProp) {
  const { workspace, updateWorkspace } = useHub();
  const [t, setT] = React.useState({ ...DEFAULT_TRACKING, ...workspace.settings?.tracking });
  return (
    <Card className="gap-4 p-5">
      <label className="flex items-start gap-3 text-sm"><Checkbox className="mt-0.5" checked={t.enabled} onChange={(e) => setT((x) => ({ ...x, enabled: e.target.checked }))} /><span><span className="block font-medium">Track link clicks</span><span className="block text-xs text-muted-foreground">Template URL buttons are rewritten to signed /r/ links that record each click before redirecting.</span></span></label>
      <div className="grid gap-3 sm:grid-cols-3">
        {([["utmSource", "utm_source"], ["utmMedium", "utm_medium"], ["utmCampaign", "utm_campaign"]] as const).map(([key, label]) => (
          <div key={key} className="flex flex-col gap-1.5"><Label htmlFor={`utm-${key}`} className="font-mono">{label}</Label><Input id={`utm-${key}`} value={t[key]} onChange={(e) => setT((x) => ({ ...x, [key]: e.target.value }))} /></div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Use <code className="font-mono">{"{campaign}"}</code> for the campaign name. Existing UTM parameters on a link are never overwritten.</p>
      <Button size="lg" className="w-fit" onClick={async () => { const p = profileOf(workspace); if (await updateWorkspace(workspace.id, { ...p, settings: { ...p.settings, tracking: t } })) toast("Tracking settings saved"); }}>Save</Button>
    </Card>
  );
}

function Account({ toast }: ToastProp) {
  const { user } = useHub();
  const [busy, setBusy] = React.useState(false);
  return (
    <Card className="gap-5 p-5">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Role</dt><dd className="font-medium">Super Admin (single account)</dd></div>
        <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{user.email}</dd></div>
      </dl>
      <p className="text-xs text-muted-foreground">The Super Admin email is set by the SUPER_ADMIN_EMAIL server variable; there is no public registration.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="lg" disabled={busy} onClick={async () => {
          setBusy(true);
          try { await sendPasswordResetEmail(await clientAuth(), user.email); toast(`Password reset email sent to ${user.email}`); } catch (e) { toast((e as Error).message); }
          setBusy(false);
        }}><KeyRound aria-hidden="true" /> Send password reset email</Button>
        <Button variant="destructive" size="lg" disabled={busy} onClick={async () => {
          setBusy(true);
          try {
            await api("/api/auth/revoke", { method: "POST" });
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the server re-checks the session
            window.location.assign("/login");
          } catch (e) { toast((e as Error).message); setBusy(false); }
        }}><LogOut aria-hidden="true" /> Sign out of all devices</Button>
      </div>
    </Card>
  );
}

function Security() {
  const [entries, setEntries] = React.useState<AuditEntry[] | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    api<{ entries: AuditEntry[] }>("/api/audit").then((r) => setEntries(r.entries)).catch((e: Error) => setError(e.message));
  }, []);
  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-3 p-5 text-sm">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-success" aria-hidden="true" /> How access is protected</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Sign-in uses Firebase Authentication; only the configured Super Admin email is accepted.</li>
          <li>Sessions are httpOnly, secure cookies that expire after 5 days and are checked for revocation on every request.</li>
          <li>All data is read and written by the server with workspace checks; the database denies direct browser access.</li>
          <li>Writes are same-origin only and rate-limited; sign-in attempts are rate-limited per IP.</li>
        </ul>
      </Card>
      <Card className="gap-0 overflow-hidden py-0">
        <p className="border-b border-border px-5 py-3 text-sm font-semibold">Audit log</p>
        {error ? <p className="px-5 py-8 text-sm text-destructive">{error}</p> : entries === null ? <p className="px-5 py-8 text-sm text-muted-foreground">Loading…</p> : entries.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">No audit entries yet.</p> : (
          <ul className="divide-y divide-border text-sm">
            {entries.map((e) => <li key={e.id} className="flex flex-wrap justify-between gap-2 px-5 py-2.5"><span><span className="font-mono text-xs text-muted-foreground">{e.action}</span> · {e.message}</span><span className="text-xs text-muted-foreground">{e.actor} · {formatDate(e.at)}</span></li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}
