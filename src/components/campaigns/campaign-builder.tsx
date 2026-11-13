"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleX, Rocket } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { FunnelBuilder } from "@/components/funnel/funnel-builder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { defaultFunnel } from "@/lib/funnel/defaults";
import { checkConsent } from "@/lib/funnel/engine";
import { audienceContacts, launchCampaign } from "@/lib/funnel/simulate";
import { validateFunnel } from "@/lib/funnel/validate";
import { useHub } from "@/lib/store/hub-store";
import { cn, formatNumber } from "@/lib/utils";
import type { Campaign, ConversionGoal } from "@/types/campaign";

const STEPS = ["Details", "Audience", "Funnel", "Review"] as const;

/** Remount per workspace so a draft never mixes one client's templates or groups with another's. */
export function CampaignBuilder() {
  const { workspace } = useHub();
  return <CampaignBuilderForm key={workspace.id} />;
}

function CampaignBuilderForm() {
  const { workspace, data, update } = useHub();
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [goal, setGoal] = React.useState<ConversionGoal>({ type: "link_click", url: "" });
  const [groups, setGroups] = React.useState<string[]>([]);
  const [funnel, setFunnel] = React.useState(() => defaultFunnel(workspace.id));
  const [scheduleAt, setScheduleAt] = React.useState("");

  const audience = audienceContacts(data.contacts, groups);
  const consent = audience.map((c) => ({ c, result: checkConsent(c) }));
  const eligible = consent.filter((x) => x.result.ok).length;
  const excludedReasons = consent.reduce<Record<string, number>>((acc, x) => {
    if (!x.result.ok) acc[x.result.reason] = (acc[x.result.reason] ?? 0) + 1;
    return acc;
  }, {});
  const funnelProblems = validateFunnel(funnel, data.templates);
  const accountReady = workspace.whatsappAccount.status === "connected";
  const goalValid = goal.type !== "link_click" || /^https?:\/\/\S+$/.test(goal.url);

  const checks = [
    { ok: name.trim().length > 0, label: "Campaign has a name" },
    { ok: goalValid, label: "Conversion goal is valid" },
    { ok: eligible > 0, label: `${formatNumber(eligible)} campaign-eligible recipients` },
    { ok: funnelProblems.length === 0, label: "All funnel messages use approved templates" },
    { ok: accountReady, label: `WhatsApp account ${accountReady ? "connected" : "not connected"}` },
  ];
  const canLaunch = checks.every((c) => c.ok);
  const canSave = name.trim().length > 0;

  function build(status: Campaign["status"]): Campaign {
    const now = new Date().toISOString();
    return {
      id: `${workspace.id}_cmp_${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      description: description.trim(),
      status,
      audienceGroups: groups,
      whatsappAccountId: workspace.whatsappAccount.id,
      funnel,
      conversionGoal: goal,
      createdAt: now,
      scheduledAt: status === "scheduled" ? new Date(scheduleAt).toISOString() : undefined,
    };
  }

  function save(status: "draft" | "scheduled" | "launch") {
    const campaign = build(status === "launch" ? "draft" : status);
    update((d) => {
      const withCampaign = { ...d, campaigns: [...d.campaigns, campaign] };
      return status === "launch" ? launchCampaign(withCampaign, campaign.id, new Date().toISOString()) : withCampaign;
    });
    router.push(`/campaigns/${campaign.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/campaigns" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Campaigns
      </Link>
      <PageHeader title="New campaign" description={`Build a three-message funnel for ${workspace.name}.`} />

      <ol className="flex flex-wrap gap-2" aria-label="Builder steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors", i === step ? "border-primary bg-accent font-semibold text-accent-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}
            >
              <span className={cn("flex size-5 items-center justify-center rounded-full text-[11px] font-bold", i === step ? "bg-primary text-white" : "bg-muted")}>{i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="gap-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="c-name">Campaign name <span className="text-primary">*</span></Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Startup Summit 2027 — Invite" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="c-desc">Description</Label>
              <Input id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-goal">Conversion goal</Label>
              <NativeSelect id="c-goal" value={goal.type} onChange={(e) => setGoal(e.target.value === "link_click" ? { type: "link_click", url: "" } : { type: e.target.value as "reply" | "none" })}>
                <option value="link_click">Visits a goal URL</option>
                <option value="reply">Replies to a message</option>
                <option value="none">No conversion tracking</option>
              </NativeSelect>
            </div>
            {goal.type === "link_click" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c-url">Goal URL</Label>
                <Input id="c-url" type="url" value={goal.url} onChange={(e) => setGoal({ type: "link_click", url: e.target.value })} placeholder="https://…" aria-invalid={!goalValid} />
                {!goalValid && <p className="text-xs text-destructive">Enter a full http(s) URL.</p>}
              </div>
            )}
            <div className="rounded-lg bg-muted/60 p-3 text-sm md:col-span-2">
              Sends from <span className="font-semibold">{workspace.whatsappAccount.displayName}</span> · {workspace.whatsappAccount.phoneNumber}
              {!accountReady && <span className="text-destructive"> — connect this account before launching (drafts can still be saved).</span>}
            </div>
          </div>
        </Card>
      )}

      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-0 p-0 lg:col-span-2">
            <fieldset>
              <legend className="px-5 pt-4 text-sm font-semibold">Audience groups</legend>
              <ul className="mt-2 divide-y divide-border">
                {data.audienceGroups.map((g) => {
                  const members = data.contacts.filter((c) => c.audienceGroups.includes(g.name));
                  const ok = members.filter((c) => checkConsent(c).ok).length;
                  return (
                    <li key={g.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-5 py-3 text-sm hover:bg-muted/40">
                        <Checkbox checked={groups.includes(g.name)} onChange={(e) => setGroups((s) => (e.target.checked ? [...s, g.name] : s.filter((x) => x !== g.name)))} />
                        <span className="flex-1">
                          <span className="block font-medium">{g.name}</span>
                          <span className="block text-xs text-muted-foreground">{g.description}</span>
                        </span>
                        <span className="text-right text-xs tabular-nums text-muted-foreground">
                          <span className="block font-semibold text-success">{formatNumber(ok)} eligible</span>
                          of {formatNumber(members.length)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          </Card>
          <Card className="h-fit gap-3 p-5">
            <p className="text-sm font-semibold">Recipients</p>
            <p className="text-3xl font-semibold tabular-nums">{formatNumber(eligible)}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(audience.length)} unique contacts across selected groups (each contact is messaged once).</p>
            {Object.keys(excludedReasons).length > 0 && (
              <ul className="flex flex-col gap-1 border-t border-border pt-3 text-xs">
                {Object.entries(excludedReasons).map(([reason, n]) => (
                  <li key={reason} className="flex justify-between text-muted-foreground"><span>Excluded · {reason}</span><span className="tabular-nums">{formatNumber(n)}</span></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {step === 2 && <FunnelBuilder value={funnel} templates={data.templates} onChange={setFunnel} />}

      {step === 3 && (
        <Card className="gap-4 p-5">
          <ul className="flex flex-col gap-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                {c.ok ? <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> : <CircleX className="size-4 text-destructive" aria-hidden="true" />}
                <span className={c.ok ? "" : "text-destructive"}>{c.label}</span>
              </li>
            ))}
          </ul>
          {funnelProblems.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-destructive">{funnelProblems.map((p) => <li key={p}>{p}</li>)}</ul>
          )}
          <div className="flex flex-col gap-1.5 border-t border-border pt-4 sm:max-w-xs">
            <Label htmlFor="c-schedule">Schedule for later (optional)</Label>
            <Input id="c-schedule" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Mock mode: launching simulates delivery — no real WhatsApp messages are sent.</p>
        </Card>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" size="lg" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" size="lg" disabled={!canSave} onClick={() => save("draft")}>Save draft</Button>
          {step < 3 ? (
            <Button size="lg" onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : scheduleAt ? (
            <Button size="lg" disabled={!canLaunch} onClick={() => save("scheduled")}>Schedule campaign</Button>
          ) : (
            <Button size="lg" disabled={!canLaunch} onClick={() => save("launch")}>
              <Rocket aria-hidden="true" />
              Launch now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
