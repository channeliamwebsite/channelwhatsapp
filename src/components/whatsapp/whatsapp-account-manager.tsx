"use client";

import * as React from "react";
import { CircleAlert, CircleCheck, Clock, Info, RefreshCw, Smartphone, Webhook } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useHub } from "@/lib/store/hub-store";
import { formatDate } from "@/lib/utils";

const CONNECTION = {
  connected: { label: "Connected", variant: "success", icon: CircleCheck, text: "Verified with Meta. Campaigns and replies can be sent." },
  pending: { label: "Details saved — not verified", variant: "warning", icon: Clock, text: "IDs are saved but have not been verified with Meta. Verification happens in the WhatsApp API integration phase." },
  disconnected: { label: "Not connected", variant: "neutral", icon: CircleAlert, text: "No WhatsApp Business account is connected. Sending, conversations and template sync are unavailable." },
} as const;

const WEBHOOK = { not_configured: "Not configured", pending_verification: "Awaiting verification", verified: "Verified", error: "Error" } as const;

export function WhatsAppAccountManager() {
  const { workspace } = useHub();
  return <Manager key={workspace.id} />;
}

function Manager() {
  const { workspace, saveWhatsAppConfig } = useHub();
  const { toast, toastElement } = useToast();
  const a = workspace.whatsappAccount;
  const [form, setForm] = React.useState({ businessName: a.businessName ?? "", displayName: a.displayName ?? "", phoneNumber: a.phoneNumber ?? "", phoneNumberId: a.phoneNumberId ?? "", wabaId: a.wabaId ?? "" });
  const [busy, setBusy] = React.useState(false);
  const status = CONNECTION[a.status];
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
        </Card>
        <Card className="gap-2 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><Webhook className="size-4" aria-hidden="true" /> Webhook</p>
          <Badge variant={a.webhookStatus === "verified" ? "success" : "neutral"}>{WEBHOOK[a.webhookStatus ?? "not_configured"]}</Badge>
          <p className="text-xs text-muted-foreground">Delivery, read and reply events arrive through the webhook once it is configured.</p>
        </Card>
        <Card className="gap-2 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><RefreshCw className="size-4" aria-hidden="true" /> Template sync</p>
          <Badge variant={a.templateSync?.status === "ok" ? "success" : a.templateSync?.status === "error" ? "danger" : "neutral"}>
            {a.templateSync?.status === "ok" ? "Synced" : a.templateSync?.status === "error" ? "Sync failed" : "Never synced"}
          </Badge>
          <p className="text-xs text-muted-foreground">Last synchronised: {a.templateSync?.lastSyncedAt ? formatDate(a.templateSync.lastSyncedAt) : a.lastSyncedAt ? formatDate(a.lastSyncedAt) : "never"}</p>
        </Card>
      </div>

      <Card className="gap-4 p-5">
        <div>
          <p className="text-sm font-semibold">Business account details</p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Saving does not contact Meta and does not connect the account. No access token is requested or stored here — credentials will be kept in a server-side secret store during the API integration.</p>
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
