"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FastForward, Link2, Pause, Play, RefreshCw, Rocket, Square, Trash2 } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { SampleDataBadge } from "@/components/dashboard/sample-data-badge";
import { FunnelBuilder } from "@/components/funnel/funnel-builder";
import { BranchBreakdown, ExitBreakdown, FunnelKpis, FunnelProgression } from "@/components/funnel/funnel-metrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useToast } from "@/components/ui/toast";
import { BRANCH_LABEL, EXIT_LABEL } from "@/lib/funnel/engine";
import { computeFunnelMetrics } from "@/lib/funnel/metrics";
import { fastForwardCampaign, launchCampaign, setCampaignStatus, stopCampaign } from "@/lib/funnel/simulate";
import { validateFunnel } from "@/lib/funnel/validate";
import { useHub } from "@/lib/store/hub-store";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { RecipientProgress } from "@/types/funnel";

import { CampaignStatusBadge } from "./campaign-status-badge";

const TABS = ["Overview", "Funnel", "Recipients", "Link tracking"] as const;
type Tab = (typeof TABS)[number];
const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const { workspace, data, update } = useHub();
  const router = useRouter();
  const { toast, toastElement } = useToast();
  const [tab, setTab] = React.useState<Tab>("Overview");
  const [confirm, setConfirm] = React.useState<ConfirmOptions | null>(null);
  const campaign = data.campaigns.find((c) => c.id === campaignId);
  const recipients = React.useMemo(() => data.recipients.filter((r) => r.campaignId === campaignId), [data.recipients, campaignId]);
  const metrics = React.useMemo(() => computeFunnelMetrics(recipients), [recipients]);

  if (!campaign) {
    return (
      <Card className="items-center px-6 py-16 text-center">
        <p className="text-sm font-semibold">Campaign not found in {workspace.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">It may belong to another workspace, or the mock data was reset by a reload.</p>
        <Link href="/campaigns" className="mt-4 text-sm font-semibold text-primary hover:underline">Back to campaigns</Link>
      </Card>
    );
  }

  const editable = ["draft", "scheduled", "paused"].includes(campaign.status);
  const problems = validateFunnel(campaign.funnel, data.templates);
  const accountReady = workspace.whatsappAccount.status === "connected";
  const now = () => new Date().toISOString();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/campaigns" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Campaigns
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CampaignStatusBadge status={campaign.status} />
            <SampleDataBadge label="Simulated" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaign.audienceGroups.join(", ") || "No audience"} · {campaign.launchedAt ? `launched ${formatDate(campaign.launchedAt)}` : campaign.scheduledAt ? `scheduled ${dateTime.format(new Date(campaign.scheduledAt))}` : "not launched"}
            {campaign.clock && campaign.status !== "completed" && ` · mock clock ${dateTime.format(new Date(campaign.clock))}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(campaign.status === "draft" || campaign.status === "scheduled") && (
            <>
              <Button variant="outline" size="lg" className="bg-card" onClick={() => setConfirm({ title: "Delete this campaign?", description: "The campaign and its funnel settings will be removed.", confirmLabel: "Delete", destructive: true, onConfirm: () => { update((d) => ({ ...d, campaigns: d.campaigns.filter((c) => c.id !== campaign.id) })); router.push("/campaigns"); } })}>
                <Trash2 aria-hidden="true" /> Delete
              </Button>
              <Button size="lg" disabled={problems.length > 0 || !accountReady || !campaign.audienceGroups.length} onClick={() => { update((d) => launchCampaign(d, campaign.id, now())); toast("Campaign launched — Message 1 simulated"); }}>
                <Rocket aria-hidden="true" /> Launch now
              </Button>
            </>
          )}
          {campaign.status === "running" && (
            <>
              <Button variant="outline" size="lg" className="bg-card" onClick={() => { update((d) => fastForwardCampaign(d, campaign.id)); toast("Advanced to the next funnel step"); }}>
                <FastForward aria-hidden="true" /> Fast-forward (mock)
              </Button>
              <Button variant="outline" size="lg" className="bg-card" onClick={() => { update((d) => setCampaignStatus(d, campaign.id, "paused")); toast("Campaign paused — no messages will be sent"); }}>
                <Pause aria-hidden="true" /> Pause
              </Button>
            </>
          )}
          {campaign.status === "paused" && (
            <Button size="lg" disabled={problems.length > 0} onClick={() => { update((d) => setCampaignStatus(d, campaign.id, "running")); toast("Campaign resumed"); }}>
              <Play aria-hidden="true" /> Resume
            </Button>
          )}
          {(campaign.status === "running" || campaign.status === "paused") && (
            <Button variant="destructive" size="lg" onClick={() => setConfirm({ title: "Stop this campaign?", description: `${formatNumber(metrics.waiting)} recipients still in the funnel will exit. Stopped campaigns cannot be resumed.`, confirmLabel: "Stop campaign", destructive: true, onConfirm: () => { update((d) => stopCampaign(d, campaign.id, now())); toast("Campaign stopped"); } })}>
              <Square aria-hidden="true" /> Stop
            </Button>
          )}
        </div>
      </div>

      <div role="tablist" aria-label="Campaign sections" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors", tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="flex flex-col gap-6">
          <FunnelKpis metrics={metrics} />
          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardCard title="Funnel progression" description="How far recipients have travelled" sample>
              <FunnelProgression metrics={metrics} />
            </DashboardCard>
            <DashboardCard title="Behaviour branches" description="Which follow-up each recipient received" sample>
              <BranchBreakdown metrics={metrics} />
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold">Exit reasons</p>
                <ExitBreakdown metrics={metrics} />
              </div>
            </DashboardCard>
          </div>
        </div>
      )}

      {tab === "Funnel" && (
        <div className="flex flex-col gap-3">
          {!editable && <p className="text-sm text-muted-foreground">The funnel is locked while the campaign is {campaign.status}. Pause it to edit future steps.</p>}
          {editable && problems.length > 0 && <ul className="list-disc rounded-lg bg-accent/50 py-2 pl-8 text-xs text-destructive">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <FunnelBuilder
            value={campaign.funnel}
            templates={data.templates}
            counts={metrics.totals.sent ? { m1: metrics.steps[0].sent, m2: metrics.branches[2], m3: metrics.branches[3] } : undefined}
            onChange={editable ? (funnel) => update((d) => ({ ...d, campaigns: d.campaigns.map((c) => (c.id === campaign.id ? { ...c, funnel } : c)) })) : undefined}
          />
        </div>
      )}

      {tab === "Recipients" && <RecipientsTable recipients={recipients} />}
      {tab === "Link tracking" && <LinkTrackingPanel workspaceId={workspace.id} campaignId={campaign.id} recipients={recipients} />}

      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
      {toastElement}
    </div>
  );
}

const stateBadge = { waiting: "info", completed: "success", exited: "neutral" } as const;

function RecipientsTable({ recipients }: { recipients: RecipientProgress[] }) {
  const { data } = useHub();
  const [state, setState] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const contacts = new Map(data.contacts.map((c) => [c.id, c]));
  const templates = new Map(data.templates.map((t) => [t.id, t.name]));
  const rows = recipients.filter((r) => state === "all" || r.state === state);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center gap-3 p-4">
        <Label htmlFor="r-state" className="text-muted-foreground">Show</Label>
        <NativeSelect id="r-state" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }} className="w-44">
          <option value="all">All recipients ({recipients.length})</option>
          <option value="waiting">In funnel</option>
          <option value="completed">Completed</option>
          <option value="exited">Exited</option>
        </NativeSelect>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-5 py-2.5 font-semibold">Contact</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Progress</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Journey</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Next / exit</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice((current - 1) * pageSize, current * pageSize).map((r) => (
              <tr key={r.id} className="border-b border-border align-top last:border-0">
                <td className="px-5 py-3 font-medium">{contacts.get(r.contactId)?.fullName ?? "Deleted contact"}</td>
                <td className="px-3 py-3">
                  <Badge variant={stateBadge[r.state]}>{r.state === "waiting" ? "In funnel" : r.state}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">Step {r.currentStep} of 3</p>
                </td>
                <td className="px-3 py-3">
                  {r.messages.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No messages sent</span>
                  ) : (
                    <ol className="flex flex-col gap-1 text-xs">
                      {r.messages.map((m) => (
                        <li key={m.dedupeKey}>
                          <span className="font-semibold">M{m.step}</span>{m.branch && <span className="text-muted-foreground"> ({BRANCH_LABEL[m.branch]})</span>} · {templates.get(m.templateId)} · <span className={m.status === "failed" ? "text-destructive" : ""}>{m.status}</span>
                          {m.clicks.length > 0 && <span className="text-success"> · clicked</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {r.state === "waiting" && r.nextActionAt && `Evaluates ${dateTime.format(new Date(r.nextActionAt))}`}
                  {r.exitReason && <span className={r.exitReason === "converted" ? "text-success" : ""}>{EXIT_LABEL[r.exitReason]}{r.exitDetail && ` — ${r.exitDetail}`}</span>}
                  {r.state === "completed" && "Finished all steps"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No recipients yet.</p>}
      </div>
      {rows.length > 0 && <PaginationBar page={current} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
    </Card>
  );
}

type ClickRow = { id: string; contactId: string; step: number; url: string; at: string };

function LinkTrackingPanel({ workspaceId, campaignId, recipients }: { workspaceId: string; campaignId: string; recipients: RecipientProgress[] }) {
  const { data } = useHub();
  const started = recipients.filter((r) => r.messages.length > 0);
  const [contactId, setContactId] = React.useState(started[0]?.contactId ?? "");
  const [step, setStep] = React.useState(1);
  const [link, setLink] = React.useState("");
  const [error, setError] = React.useState("");
  const [clicks, setClicks] = React.useState<ClickRow[] | null>(null);
  const names = new Map(data.contacts.map((c) => [c.id, c.fullName]));
  const message = started.find((r) => r.contactId === contactId)?.messages.find((m) => m.step === step);
  const url = data.templates.find((t) => t.id === message?.templateId)?.buttons.find((b) => b.type === "url")?.url;

  async function mint() {
    setError("");
    setLink("");
    const res = await fetch("/api/tracking/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, campaignId, contactId, step, url }) });
    if (res.status === 404) return setError("The test link tool is only available in development.");
    const body = await res.json();
    if (!res.ok) return setError(body.error ?? "Could not create link");
    setLink(body.url);
  }

  async function refresh() {
    const res = await fetch(`/api/tracking/clicks?workspaceId=${encodeURIComponent(workspaceId)}&campaignId=${encodeURIComponent(campaignId)}`);
    if (res.ok) setClicks((await res.json()).clicks);
    else setError("Click log is only available in development.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <DashboardCard title="Test a tracked link" description="Each link is signed and encodes workspace, campaign, contact, step and destination">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-contact">Recipient</Label>
              <NativeSelect id="t-contact" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                {started.slice(0, 100).map((r) => <option key={r.id} value={r.contactId}>{names.get(r.contactId) ?? r.contactId}</option>)}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-step">Step</Label>
              <NativeSelect id="t-step" value={step} onChange={(e) => setStep(Number(e.target.value))}>
                {[1, 2, 3].map((s) => <option key={s} value={s}>Message {s}</option>)}
              </NativeSelect>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Destination: {url ?? "this recipient did not receive a message with a link at this step"}</p>
          <Button size="lg" className="w-fit" disabled={!url} onClick={mint}><Link2 aria-hidden="true" /> Create test link</Button>
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="break-all rounded-lg bg-muted p-3 font-mono text-xs text-info hover:underline">{link}</a>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DashboardCard>
      <DashboardCard
        title="Recorded clicks"
        description="Clicks are stored before the visitor is redirected"
        action={<Button variant="outline" size="sm" onClick={refresh}><RefreshCw aria-hidden="true" /> Refresh</Button>}
      >
        {clicks === null ? (
          <p className="text-sm text-muted-foreground">Open a test link, then refresh.</p>
        ) : clicks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clicks recorded for this campaign yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {clicks.map((c) => (
              <li key={c.id} className="py-2">
                <span className="font-medium">{names.get(c.contactId) ?? c.contactId}</span> · Message {c.step}
                <span className="block truncate text-xs text-muted-foreground">{dateTime.format(new Date(c.at))} → {c.url}</span>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
