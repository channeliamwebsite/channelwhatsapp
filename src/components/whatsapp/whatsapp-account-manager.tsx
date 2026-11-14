"use client";

import * as React from "react";
import { CircleAlert, CircleCheck, CircleMinus, Clock, Download, Info, KeyRound, Loader2, RefreshCw, Send, Server, ShieldCheck, Smartphone, Webhook } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client/api";
import { useHub } from "@/lib/store/hub-store";
import { formatDateTime } from "@/lib/utils";

const CONNECTION = {
  connected: { label: "Connected", variant: "success", icon: CircleCheck, text: "Verified with Meta. Campaigns and replies can be sent." },
  pending: { label: "Details saved — not verified", variant: "warning", icon: Clock, text: "IDs are saved but not verified. Use “Verify connection” to check them with Meta." },
  disconnected: { label: "Not connected", variant: "neutral", icon: CircleAlert, text: "No WhatsApp Business account is connected. Sending, conversations and template sync are unavailable." },
} as const;

const WEBHOOK = {
  not_configured: { label: "Not configured", variant: "neutral" },
  pending_verification: { label: "Subscribed — no events yet", variant: "warning" },
  verified: { label: "Configured", variant: "success" },
  error: { label: "Error", variant: "danger" },
} as const;

export function WhatsAppAccountManager() {
  const { workspace } = useHub();
  const a = workspace.whatsappAccount;
  // Remount when the saved IDs change (e.g. after an import) so the form shows them.
  return <Manager key={`${workspace.id}:${a.phoneNumberId ?? ""}:${a.wabaId ?? ""}`} />;
}

function Manager() {
  const { workspace, data, saveWhatsAppConfig, reload } = useHub();
  const { toast, toastElement } = useToast();
  const a = workspace.whatsappAccount;
  const [form, setForm] = React.useState({ businessName: a.businessName ?? "", displayName: a.displayName ?? "", phoneNumber: a.phoneNumber ?? "", phoneNumberId: a.phoneNumberId ?? "", wabaId: a.wabaId ?? "" });
  const [busy, setBusy] = React.useState(false);
  const [subscribing, setSubscribing] = React.useState(false);
  const status = CONNECTION[a.status];
  const webhook = WEBHOOK[a.webhookStatus ?? "not_configured"];
  const metaTemplates = data.templates.filter((t) => t.metaTemplateId).length;
  const approvedTemplates = data.templates.filter((t) => t.metaTemplateId && t.status === "approved").length;
  const StatusIcon = status.icon;
  const errors = {
    phoneNumber: form.phoneNumber && !/^\+\d{8,15}$/.test(form.phoneNumber) ? "Use E.164 format, e.g. +919876543210" : "",
    phoneNumberId: form.phoneNumberId && !/^\d{5,30}$/.test(form.phoneNumberId) ? "Numeric ID from Meta" : "",
    wabaId: form.wabaId && !/^\d{5,30}$/.test(form.wabaId) ? "Numeric ID from Meta" : "",
  };
  const valid = !Object.values(errors).some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="WhatsApp account" description={`WhatsApp Business configuration for ${workspace.name}.`} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="gap-2 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><Smartphone className="size-4" aria-hidden="true" /> Connection</p>
          <Badge variant={status.variant}><StatusIcon aria-hidden="true" />{status.label}</Badge>
          <p className="text-xs text-muted-foreground">{status.text}</p>
          <p className="text-xs text-muted-foreground">Last verified: {a.verifiedAt ? formatDateTime(a.verifiedAt) : "never"}</p>
        </Card>
        <Card className="gap-2 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><Webhook className="size-4" aria-hidden="true" /> Webhook</p>
          <Badge variant={webhook.variant}>{webhook.label}</Badge>
          <p className="text-xs text-muted-foreground">{a.webhookDetail ?? "Delivery, read and reply events arrive through the webhook once this WABA is subscribed to the app."}</p>
          <p className="text-xs text-muted-foreground">Last event received: {a.webhookLastEventAt ? formatDateTime(a.webhookLastEventAt) : "none yet"}</p>
          {a.status === "connected" && a.webhookStatus !== "verified" && a.webhookStatus !== "pending_verification" && (
            <Button size="sm" variant="outline" className="mt-1 w-fit" disabled={subscribing} onClick={async () => {
              setSubscribing(true);
              try {
                const r = await api<{ detail: string }>(`/api/workspaces/${encodeURIComponent(workspace.id)}/whatsapp/subscribe-webhook`, { method: "POST" });
                toast(r.detail);
              } catch (e) { toast((e as Error).message); }
              await reload();
              setSubscribing(false);
            }}>{subscribing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Webhook aria-hidden="true" />} Subscribe WABA to app</Button>
          )}
        </Card>
        <Card className="gap-2 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><RefreshCw className="size-4" aria-hidden="true" /> Template sync</p>
          <Badge variant={a.templateSync?.status === "ok" ? "success" : a.templateSync?.status === "error" ? "danger" : "neutral"}>
            {a.templateSync?.status === "ok" ? "Synced" : a.templateSync?.status === "error" ? "Sync failed" : "Never synced"}
          </Badge>
          <p className="text-xs text-muted-foreground">Last successful sync: {a.templateSync?.lastSyncedAt ? formatDateTime(a.templateSync.lastSyncedAt) : "never"}</p>
          <p className="text-xs text-muted-foreground">{metaTemplates} template{metaTemplates === 1 ? "" : "s"} from Meta · {approvedTemplates} approved</p>
          {a.templateSync?.status === "error" && a.templateSync.message && <p className="text-xs text-destructive">{a.templateSync.message}</p>}
        </Card>
      </div>

      <ServerConfigPanel workspaceId={workspace.id} workspaceName={workspace.name} current={{ wabaId: a.wabaId ?? "", phoneNumberId: a.phoneNumberId ?? "" }} reload={reload} toast={toast} />

      <VerificationPanel connected={a.status === "connected"} verification={a.verification} hasIds={Boolean(a.phoneNumberId && a.wabaId)} workspaceId={workspace.id} reload={reload} toast={toast} />

      <Card className="gap-4 p-5">
        <div>
          <p className="text-sm font-semibold">Business account details</p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Saving does not contact Meta and does not connect the account. The access token is never entered here: it is configured on the server (WHATSAPP_ACCESS_TOKEN) and is never stored in the database or shown in the browser.</p>
        </div>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return;
            setBusy(true);
            if (await saveWhatsAppConfig(form)) toast("WhatsApp details saved — verification pending");
            setBusy(false);
          }}
        >
          {([
            ["businessName", "Business name", "Channeliam Media Pvt Ltd"],
            ["displayName", "Display name", "Shown to customers in WhatsApp"],
            ["phoneNumber", "Phone number", "+919876543210"],
            ["phoneNumberId", "Phone number ID", "From Meta WhatsApp Manager"],
            ["wabaId", "WhatsApp Business Account ID", "From Meta Business Settings"],
          ] as const).map(([key, label, placeholder]) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label htmlFor={`wa-${key}`}>{label}</Label>
              <Input id={`wa-${key}`} value={form[key]} placeholder={placeholder} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value.trim() === "" ? "" : e.target.value }))} aria-invalid={Boolean(errors[key as keyof typeof errors])} />
              {errors[key as keyof typeof errors] && <p className="text-xs text-destructive">{errors[key as keyof typeof errors]}</p>}
            </div>
          ))}
          <div className="flex items-end justify-end sm:col-span-2">
            <Button type="submit" size="lg" disabled={!valid || busy}>{busy ? "Saving…" : "Save details"}</Button>
          </div>
        </form>
      </Card>
      {toastElement}
    </div>
  );
}

const VERIFY_STATE = {
  connected: { label: "Connected", variant: "success", icon: CircleCheck },
  verification_failed: { label: "Verification failed", variant: "danger", icon: CircleAlert },
  missing_credentials: { label: "Missing credentials", variant: "warning", icon: KeyRound },
} as const;

function VerificationPanel({ connected, verification, hasIds, workspaceId, reload, toast }: {
  connected: boolean;
  verification?: { status: keyof typeof VERIFY_STATE; message: string; at: string; checks?: { key: string; label: string; ok: boolean | null; detail: string }[] } | null;
  hasIds: boolean;
  workspaceId: string;
  reload: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [to, setTo] = React.useState("");
  const [templateName, setTemplateName] = React.useState("hello_world");
  const [languageCode, setLanguageCode] = React.useState("en_US");
  const [sending, setSending] = React.useState(false);
  const base = `/api/workspaces/${encodeURIComponent(workspaceId)}/whatsapp`;
  const state = verification ? VERIFY_STATE[verification.status] : null;
  const StateIcon = state?.icon ?? CircleAlert;

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" aria-hidden="true" /> Connection verification</p>
          <p className="mt-1 text-xs text-muted-foreground">Checks the server access token, Phone Number ID and WABA ID directly with Meta. The workspace is marked connected only when this succeeds.</p>
        </div>
        <Button size="lg" disabled={busy || !hasIds} title={hasIds ? undefined : "Save the Phone Number ID and WABA ID first"} onClick={async () => {
          setBusy(true);
          try {
            const r = await api<{ status: string; message: string }>(`${base}/verify`, { method: "POST" });
            toast(r.message);
            await reload();
          } catch (e) { toast((e as Error).message); }
          setBusy(false);
        }}>
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />} Verify connection
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {state ? <Badge variant={state.variant}><StateIcon aria-hidden="true" />{state.label}</Badge> : <Badge variant="neutral"><CircleAlert aria-hidden="true" />{connected ? "Connected" : "Disconnected"}</Badge>}
        <span className="text-xs text-muted-foreground">{verification ? `${verification.message} · ${formatDateTime(verification.at)}` : hasIds ? "Not verified yet." : "Save the Phone Number ID and WABA ID, then verify."}</span>
      </div>
      {verification?.checks && verification.checks.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3 text-xs">
          {verification.checks.map((c) => {
            const Icon = c.ok === true ? CircleCheck : c.ok === false ? CircleAlert : CircleMinus;
            return (
              <li key={c.key} className="flex items-start gap-2">
                <Icon className={`mt-px size-3.5 shrink-0 ${c.ok === true ? "text-success" : c.ok === false ? "text-destructive" : "text-muted-foreground"}`} aria-label={c.ok === true ? "Passed" : c.ok === false ? "Failed" : "Not confirmed"} />
                <span><span className="font-medium text-foreground">{c.label}:</span> <span className="text-muted-foreground">{c.detail}</span></span>
              </li>
            );
          })}
        </ul>
      )}

      <form className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_180px_120px_auto]" onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        try {
          const r = await api<{ messageId: string }>(`${base}/test-message`, { method: "POST", body: { to, templateName, languageCode } });
          toast(`Accepted by Meta (message id ${r.messageId.slice(0, 18)}…). Delivery status arrives once webhooks are connected.`);
        } catch (err) { toast((err as Error).message); }
        setSending(false);
      }}>
        <div className="flex flex-col gap-1.5"><Label htmlFor="wa-test-to">Send a test template to</Label><Input id="wa-test-to" type="tel" placeholder="+919876543210" value={to} onChange={(e) => setTo(e.target.value)} disabled={!connected} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="wa-test-tpl">Approved template</Label><Input id="wa-test-tpl" value={templateName} onChange={(e) => setTemplateName(e.target.value)} disabled={!connected} className="font-mono" /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="wa-test-lang">Language</Label><Input id="wa-test-lang" value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} disabled={!connected} className="font-mono" /></div>
        <Button type="submit" size="lg" className="self-end" disabled={!connected || sending || !to.trim()} title={connected ? undefined : "Verify the connection first"}>
          {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Send test
        </Button>
        {!connected && <p className="text-xs text-muted-foreground sm:col-span-4">Test messages are available after a successful verification. Meta’s sample template “hello_world” (en_US) exists in every WhatsApp Business Account.</p>}
      </form>
    </Card>
  );
}

type ConfigStatus = {
  ready: boolean;
  apiVersion: string;
  serverIds: { wabaId: string; phoneNumberId: string } | null;
  variables: { name: string; present: boolean; valid: boolean; secret: boolean; required: boolean; purpose: string }[];
};

/** Which WhatsApp server variables exist (never their secret values), plus an explicit per-workspace import of the server IDs. */
function ServerConfigPanel({ workspaceId, workspaceName, current, reload, toast }: {
  workspaceId: string;
  workspaceName: string;
  current: { wabaId: string; phoneNumberId: string };
  reload: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const [status, setStatus] = React.useState<ConfigStatus | null>(null);
  const [error, setError] = React.useState("");
  const [confirm, setConfirm] = React.useState<ConfirmOptions | null>(null);
  React.useEffect(() => {
    let live = true;
    api<ConfigStatus>("/api/whatsapp/config-status").then((s) => live && setStatus(s), (e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, []);
  const ids = status?.serverIds;
  const differs = ids && (ids.wabaId !== current.wabaId || ids.phoneNumberId !== current.phoneNumberId);

  return (
    <Card className="gap-4 p-5">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold"><Server className="size-4" aria-hidden="true" /> Server configuration</p>
        <p className="mt-1 text-xs text-muted-foreground">Environment variables on the server (Vercel). Secret values are never shown; only whether they are set. Changes in Vercel apply after a new deployment.</p>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!status && !error && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Checking…</p>}
      {status && (
        <ul className="grid gap-1.5 text-xs sm:grid-cols-2">
          {status.variables.map((v) => {
            const Icon = v.valid ? CircleCheck : v.present ? CircleAlert : v.required ? CircleAlert : CircleMinus;
            const tone = v.valid ? "text-success" : v.required || v.present ? "text-destructive" : "text-muted-foreground";
            return (
              <li key={v.name} className="flex items-start gap-2">
                <Icon className={`mt-px size-3.5 shrink-0 ${tone}`} aria-hidden="true" />
                <span><span className="font-mono font-medium text-foreground">{v.name}</span> <span className={tone}>{v.valid ? "set" : v.present ? "invalid format" : v.required ? "missing (required)" : "not set"}</span><br /><span className="text-muted-foreground">{v.purpose}</span></span>
              </li>
            );
          })}
        </ul>
      )}
      {status && <p className="text-xs text-muted-foreground">Graph API version: <span className="font-mono">{status.apiVersion}</span></p>}
      {ids && differs && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs">
          <p>Server IDs: WABA <span className="font-mono">{ids.wabaId}</span> · Phone Number ID <span className="font-mono">{ids.phoneNumberId}</span>. {current.wabaId || current.phoneNumberId ? `${workspaceName} currently uses different IDs.` : `${workspaceName} has no IDs saved.`}</p>
          <Button size="sm" variant="outline" onClick={() => setConfirm({
            title: `Use these IDs for ${workspaceName}?`,
            description: `The server’s WABA and Phone Number ID will be saved to ${workspaceName} only. A WABA or number can belong to one workspace; the import is refused if another workspace already uses them. Verify the connection afterwards.`,
            confirmLabel: `Import into ${workspaceName}`,
            onConfirm: async () => {
              try {
                await api(`/api/workspaces/${encodeURIComponent(workspaceId)}/whatsapp/import-server-ids`, { method: "POST" });
                toast(`IDs saved to ${workspaceName} — now verify the connection`);
              } catch (e) { toast((e as Error).message); }
              await reload();
            },
          })}><Download aria-hidden="true" /> Import into {workspaceName}</Button>
        </div>
      )}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </Card>
  );
}
