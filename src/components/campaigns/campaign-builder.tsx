"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleX, Rocket, TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { FunnelBuilder } from "@/components/funnel/funnel-builder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { resolveAudience } from "@/lib/audience/segments";
import { formatPhone } from "@/lib/contacts/phone";
import { defaultFunnel } from "@/lib/funnel/defaults";
import { validateFunnel } from "@/lib/funnel/validate";
import { placeholderCount, renderBody, resolveVariables } from "@/lib/funnel/variables";
import { useHub } from "@/lib/store/hub-store";
import { cn, formatNumber } from "@/lib/utils";
import type { Campaign, ConversionGoal, FunnelDefinition, VariableSource } from "@/types/campaign";

const STEPS = ["Campaign details", "Audience", "Messages & funnel", "Review & schedule"] as const;
const OBJECTIVES = ["Event registration", "Lead generation", "Sales / offer", "Re-engagement", "Announcement", "Other"];
const FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "field:firstName", label: "First name" },
  { value: "field:fullName", label: "Full name" },
  { value: "field:organisation", label: "Company" },
  { value: "field:designation", label: "Designation" },
  { value: "field:city", label: "City" },
  { value: "field:country", label: "Country" },
  { value: "static", label: "Fixed text…" },
];

const encode = (v: VariableSource) => (v.type === "static" ? "static" : v.type === "custom" ? `custom:${v.key}` : `field:${v.field}`);
function decode(value: string, prev?: VariableSource): VariableSource {
  if (value === "static") return { type: "static", value: prev?.type === "static" ? prev.value : "" };
  if (value.startsWith("custom:")) return { type: "custom", key: value.slice(7) };
  return { type: "field", field: value.slice(6) as Extract<VariableSource, { type: "field" }>["field"] };
}

/** Remount per workspace so a draft never mixes one client's data with another's. */
export function CampaignBuilder() {
  const { workspace } = useHub();
  return <CampaignBuilderForm key={workspace.id} />;
}

function CampaignBuilderForm() {
  const { workspace, data, update, campaignAction } = useHub();
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [objective, setObjective] = React.useState(OBJECTIVES[0]);
  const [goal, setGoal] = React.useState<ConversionGoal>({ type: "link_click", url: "" });
  const [groups, setGroups] = React.useState<string[]>([]);
  const [segmentIds, setSegmentIds] = React.useState<string[]>([]);
  const [funnel, setFunnel] = React.useState<FunnelDefinition>(defaultFunnel);
  const [variables, setVariables] = React.useState<VariableSource[]>([]);
  const [trackLinks, setTrackLinks] = React.useState(true);
  const [scheduleAt, setScheduleAt] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);

  const approved = data.templates.filter((t) => t.status === "approved");
  const audience = resolveAudience(data.contacts, groups, data.segments.filter((s) => segmentIds.includes(s.id)));
  const reasons = audience.excluded.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.reason]: (acc[x.reason] ?? 0) + 1 }), {});
  const usedTemplates = [funnel.message1.templateId, ...Object.values(funnel.message2), ...Object.values(funnel.message3)]
    .map((a) => (typeof a === "string" ? a : a.type === "send" ? a.templateId : ""))
    .filter(Boolean)
    .map((id) => data.templates.find((t) => t.id === id));
  const slots = placeholderCount(usedTemplates);
  const vars = Array.from({ length: slots }, (_, i) => variables[i] ?? ({ type: "field", field: i === 0 ? "firstName" : "organisation" } as VariableSource));
  const customKeys = [...new Set(data.contacts.flatMap((c) => Object.keys(c.customFields ?? {})))];
  const sample = audience.eligible[0];
  const m1 = data.templates.find((t) => t.id === funnel.message1.templateId);
  const funnelProblems = validateFunnel(funnel, data.templates);
  const sendingAvailable = workspace.whatsappAccount.status === "connected";
  const goalValid = goal.type !== "link_click" || /^https?:\/\/\S+$/.test(goal.url);
  const varsValid = vars.every((v) => v.type !== "static" || v.value.trim());

  const checks = [
    { ok: name.trim().length > 0, label: "Campaign has a name" },
    { ok: goalValid, label: "Conversion goal is valid" },
    { ok: audience.eligible.length > 0, label: `${formatNumber(audience.eligible.length)} eligible recipients` },
    { ok: funnelProblems.length === 0, label: "Every message uses an approved template" },
    { ok: varsValid, label: "All message variables are filled" },
    { ok: sendingAvailable, label: sendingAvailable ? "WhatsApp account connected" : "Sending unavailable — WhatsApp account not connected" },
  ];
  const canSend = checks.every((c) => c.ok) && confirmed;

  function build(status: "draft" | "scheduled"): Campaign {
    return {
      id: `cmp_${crypto.randomUUID().slice(0, 12)}`,
      name: name.trim(), description: description.trim(), objective, status,
      audienceGroups: groups, segmentIds, variables: vars, trackLinks,
      whatsappAccountId: workspace.whatsappAccount.id, funnel, conversionGoal: goal,
      createdAt: new Date().toISOString(),
      scheduledAt: status === "scheduled" ? new Date(scheduleAt).toISOString() : undefined,
    };
  }

  async function save(mode: "draft" | "scheduled" | "launch") {
    setBusy(true);
    const campaign = build(mode === "scheduled" ? "scheduled" : "draft");
    const saved = await update((d) => ({ ...d, campaigns: [...d.campaigns, campaign] }));
    if (saved && mode === "launch") await campaignAction(campaign.id, "launch");
    setBusy(false);
    if (saved) router.push(`/campaigns/${campaign.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/campaigns" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" /> Campaigns</Link>
      <PageHeader title="New campaign" description={`Workspace: ${workspace.name}`} />
      {!sendingAvailable && (
        <p role="note" className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-[#7a3306]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Sending is unavailable until this workspace’s WhatsApp Business account is connected. You can build and save the campaign as a draft.
        </p>
      )}

      <ol className="flex flex-wrap gap-2" aria-label="Builder steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", i === step ? "border-primary bg-accent font-semibold text-accent-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
              <span className={cn("flex size-5 items-center justify-center rounded-full text-[11px] font-bold", i === step ? "bg-primary text-white" : "bg-muted")}>{i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="grid gap-4 p-5 md:grid-cols-2">
          <F id="c-name" label="Campaign name *" className="md:col-span-2"><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} /></F>
          <F id="c-desc" label="Description" className="md:col-span-2"><Input id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></F>
          <F id="c-obj" label="Objective">
            <NativeSelect id="c-obj" value={objective} onChange={(e) => setObjective(e.target.value)}>{OBJECTIVES.map((o) => <option key={o}>{o}</option>)}</NativeSelect>
          </F>
          <F id="c-goal" label="Conversion goal">
            <NativeSelect id="c-goal" value={goal.type} onChange={(e) => setGoal(e.target.value === "link_click" ? { type: "link_click", url: "" } : { type: e.target.value as "reply" | "none" })}>
              <option value="link_click">Visits a goal URL</option>
              <option value="reply">Replies to a message</option>
              <option value="none">No conversion tracking</option>
            </NativeSelect>
          </F>
          {goal.type === "link_click" && (
            <F id="c-url" label="Goal URL" className="md:col-span-2" error={goalValid ? undefined : "Enter a full http(s) URL"}>
              <Input id="c-url" type="url" value={goal.url} onChange={(e) => setGoal({ type: "link_click", url: e.target.value })} placeholder="https://…" />
            </F>
          )}
        </Card>
      )}

      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-4 p-5 lg:col-span-2">
            <Pick title="Audience groups" empty="No groups yet — create them under Audience." items={data.audienceGroups.map((g) => ({ id: g.name, label: g.name, hint: g.description }))} selected={groups} onChange={setGroups} />
            <Pick title="Saved segments" empty="No saved segments yet." items={data.segments.map((s) => ({ id: s.id, label: s.name }))} selected={segmentIds} onChange={setSegmentIds} />
          </Card>
          <Card className="h-fit gap-3 p-5">
            <p className="text-sm font-semibold">Eligible recipients</p>
            <p className="text-3xl font-semibold tabular-nums">{formatNumber(audience.eligible.length)}</p>
            <ul className="flex flex-col gap-1 border-t border-border pt-3 text-xs">
              {Object.keys(reasons).length === 0 && <li className="text-muted-foreground">No exclusions.</li>}
              {Object.entries(reasons).map(([r, n]) => <li key={r} className="flex justify-between text-muted-foreground"><span>Excluded · {r}</span><span className="tabular-nums">{formatNumber(n)}</span></li>)}
            </ul>
            {audience.eligible.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium text-primary">View eligible contacts</summary>
                <ul className="mt-2 max-h-56 overflow-y-auto">{audience.eligible.slice(0, 100).map((c) => <li key={c.id} className="flex justify-between gap-2 py-0.5"><span className="truncate">{c.fullName}</span><span className="tabular-nums text-muted-foreground">{formatPhone(c.phone)}</span></li>)}</ul>
              </details>
            )}
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          {approved.length === 0 && <Card className="p-5 text-sm text-muted-foreground">No approved WhatsApp templates in this workspace yet. Templates sync from Meta once the WhatsApp Business account is connected.</Card>}
          <FunnelBuilder value={funnel} templates={data.templates} onChange={setFunnel} />
          {slots > 0 && (
            <Card className="gap-3 p-5">
              <p className="text-sm font-semibold">Message variables</p>
              <div className="grid gap-3 md:grid-cols-2">
                {vars.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="w-12 shrink-0 self-center font-mono text-xs text-muted-foreground">{`{{${i + 1}}}`}</span>
                    <NativeSelect aria-label={`Variable ${i + 1} source`} value={encode(v)} onChange={(e) => setVariables(vars.map((x, j) => (j === i ? decode(e.target.value, x) : x)))} className="flex-1">
                      {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      {customKeys.map((k) => <option key={k} value={`custom:${k}`}>Custom: {k}</option>)}
                    </NativeSelect>
                    {v.type === "static" && <Input aria-label={`Variable ${i + 1} text`} value={v.value} onChange={(e) => setVariables(vars.map((x, j) => (j === i ? { type: "static", value: e.target.value } : x)))} className="flex-1" />}
                  </div>
                ))}
              </div>
              {m1 && (
                <div className="rounded-lg bg-[#e7f6ef] p-3 text-[13px]">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#12805c]">Preview{sample ? ` for ${sample.fullName}` : ""}</p>
                  {renderBody(m1.body, sample ? resolveVariables(vars, sample) : [])}
                </div>
              )}
            </Card>
          )}
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={trackLinks} onChange={(e) => setTrackLinks(e.target.checked)} /> Track link clicks (template URL buttons become signed tracked links)</label>
        </div>
      )}

      {step === 3 && (
        <Card className="gap-4 p-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Campaign</dt><dd className="font-medium">{name || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Objective</dt><dd className="font-medium">{objective}</dd></div>
            <div><dt className="text-muted-foreground">Audience</dt><dd className="font-medium">{formatNumber(audience.eligible.length)} eligible</dd></div>
            <div><dt className="text-muted-foreground">Message 1 volume</dt><dd className="font-medium tabular-nums">{formatNumber(audience.eligible.length)}</dd></div>
            <div><dt className="text-muted-foreground">Maximum total messages</dt><dd className="font-medium tabular-nums">{formatNumber(audience.eligible.length * 3)}</dd></div>
            <div><dt className="text-muted-foreground">Funnel timing</dt><dd className="font-medium">{funnel.wait1Hours}h → {funnel.wait2Hours}h</dd></div>
          </dl>
          <ul className="flex flex-col gap-2 border-t border-border pt-4">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                {c.ok ? <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> : <CircleX className="size-4 text-destructive" aria-hidden="true" />}
                <span className={c.ok ? "" : "text-destructive"}>{c.label}</span>
              </li>
            ))}
          </ul>
          {funnelProblems.length > 0 && <ul className="list-disc pl-5 text-xs text-destructive">{funnelProblems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <F id="c-schedule" label="Schedule for later (optional)" className="sm:max-w-xs"><Input id="c-schedule" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} /></F>
          <label className="flex items-start gap-2 text-sm"><Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" /> I confirm these recipients consented to WhatsApp messages from {workspace.name}.</label>
        </Card>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" size="lg" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" size="lg" disabled={!name.trim() || busy} onClick={() => save("draft")}>Save draft</Button>
          {step < 3 ? (
            <Button size="lg" onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : scheduleAt ? (
            <Button size="lg" disabled={!canSend || busy} onClick={() => save("scheduled")}>Schedule campaign</Button>
          ) : (
            <Button size="lg" disabled={!canSend || busy} onClick={() => save("launch")}><Rocket aria-hidden="true" /> Launch now</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function F({ id, label, error, className, children }: { id: string; label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Pick({ title, empty, items, selected, onChange }: { title: string; empty: string; items: { id: string; label: string; hint?: string }[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.id}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40">
                <Checkbox className="mt-0.5" checked={selected.includes(it.id)} onChange={(e) => onChange(e.target.checked ? [...selected, it.id] : selected.filter((x) => x !== it.id))} />
                <span><span className="block font-medium">{it.label}</span>{it.hint && <span className="block text-xs text-muted-foreground">{it.hint}</span>}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
