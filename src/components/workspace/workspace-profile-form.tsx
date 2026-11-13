"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { COUNTRIES } from "@/lib/contacts/phone";
import type { WorkspaceProfile } from "@/lib/store/hub-store";
import type { Workspace } from "@/types/workspace";

export function profileOf(w: Workspace): WorkspaceProfile {
  return {
    name: w.name,
    industry: w.industry,
    color: w.color,
    description: w.description ?? "",
    logoUrl: w.logoUrl ?? "",
    website: w.website ?? "",
    settings: { defaultCountry: "India", timezone: "Asia/Kolkata", ...w.settings },
  };
}

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Riyadh", "Asia/Qatar", "Asia/Singapore", "Europe/London", "America/New_York", "Australia/Sydney", "UTC"];
const httpsOk = (v: string) => !v || /^https:\/\/\S+$/.test(v);

/** Brand profile + workspace settings form (used by Workspaces and Settings). */
export function WorkspaceProfileForm({ workspace, onSave, submitLabel = "Save changes" }: { workspace: Workspace; onSave: (p: WorkspaceProfile) => Promise<boolean>; submitLabel?: string }) {
  const [p, setP] = React.useState(() => profileOf(workspace));
  const [busy, setBusy] = React.useState(false);
  const set = (patch: Partial<WorkspaceProfile>) => setP((x) => ({ ...x, ...patch }));
  const valid = p.name.trim() && httpsOk(p.logoUrl) && httpsOk(p.website) && /^#[0-9a-fA-F]{6}$/.test(p.color);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        await onSave({ ...p, name: p.name.trim() });
        setBusy(false);
      }}
    >
      <Field id="wp-name" label="Workspace name *"><Input id="wp-name" value={p.name} onChange={(e) => set({ name: e.target.value })} /></Field>
      <Field id="wp-industry" label="Industry"><Input id="wp-industry" value={p.industry} onChange={(e) => set({ industry: e.target.value })} /></Field>
      <Field id="wp-desc" label="Description" className="sm:col-span-2">
        <textarea id="wp-desc" rows={3} value={p.description} onChange={(e) => set({ description: e.target.value })} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15" />
      </Field>
      <Field id="wp-logo" label="Logo URL" error={httpsOk(p.logoUrl) ? undefined : "Use an https:// image URL"}><Input id="wp-logo" type="url" placeholder="https://…/logo.png" value={p.logoUrl} onChange={(e) => set({ logoUrl: e.target.value })} /></Field>
      <Field id="wp-site" label="Website" error={httpsOk(p.website) ? undefined : "Use an https:// URL"}><Input id="wp-site" type="url" placeholder="https://" value={p.website} onChange={(e) => set({ website: e.target.value })} /></Field>
      <Field id="wp-color" label="Brand colour">
        <div className="flex items-center gap-2">
          <input id="wp-color" type="color" value={p.color} onChange={(e) => set({ color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-input bg-card" />
          <Input aria-label="Brand colour hex" value={p.color} onChange={(e) => set({ color: e.target.value })} className="w-28 font-mono" />
        </div>
      </Field>
      <Field id="wp-country" label="Default phone country">
        <NativeSelect id="wp-country" value={p.settings.defaultCountry} onChange={(e) => set({ settings: { ...p.settings, defaultCountry: e.target.value } })}>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </NativeSelect>
      </Field>
      <Field id="wp-tz" label="Timezone">
        <NativeSelect id="wp-tz" value={p.settings.timezone} onChange={(e) => set({ settings: { ...p.settings, timezone: e.target.value } })}>
          {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
        </NativeSelect>
      </Field>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" size="lg" disabled={!valid || busy}>{busy ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}

function Field({ id, label, error, className, children }: { id: string; label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
