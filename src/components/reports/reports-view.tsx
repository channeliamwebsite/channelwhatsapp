"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { downloadBlob, toCsv } from "@/lib/contacts/export";
import { computeFunnelMetrics, type FunnelMetrics } from "@/lib/funnel/metrics";
import { useHub } from "@/lib/store/hub-store";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { RecipientProgress } from "@/types/funnel";

const DEFINITIONS: [string, string][] = [
  ["Sent", "Messages the WhatsApp API accepted (status sent, delivered, read or failed after acceptance)."],
  ["Delivery rate", "Delivered or read messages ÷ sent messages."],
  ["Read rate", "Read messages ÷ delivered messages."],
  ["Click rate", "Messages with at least one tracked-link click ÷ delivered messages."],
  ["Reply rate", "Recipients who replied ÷ recipients with at least one delivered message."],
  ["Failed", "Messages WhatsApp reported as failed (after retries)."],
  ["Conversion rate", "Recipients who completed the campaign goal ÷ recipients who received Message 1."],
  ["M1 → M2 / M2 → M3", "Share of recipients who received the next funnel message."],
];

const pct = (v: number) => formatPercent(v);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function exportCsv(name: string, headers: string[], rows: (string | number)[][]) {
  downloadBlob("﻿" + toCsv(headers, rows.map((r) => r.map(String))), `${name}.csv`, "text/csv;charset=utf-8");
}

export function ReportsView() {
  const { workspace, data } = useHub();
  const [today] = React.useState(() => isoDay(new Date()));
  const [from, setFrom] = React.useState(() => isoDay(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = React.useState(today);
  const [campaignId, setCampaignId] = React.useState("");
  const inRange = (iso?: string) => Boolean(iso && iso.slice(0, 10) >= from && iso.slice(0, 10) <= to);
  const campaigns = new Map(data.campaigns.map((c) => [c.id, c]));
  const contacts = new Map(data.contacts.map((c) => [c.id, c]));

  // Restrict every recipient to messages/events inside the date range.
  const scoped: RecipientProgress[] = data.recipients
    .filter((r) => !campaignId || r.campaignId === campaignId)
    .map((r) => ({ ...r, messages: r.messages.filter((m) => m.status !== "queued" && inRange(m.sentAt)), repliedAt: inRange(r.repliedAt) ? r.repliedAt : undefined, convertedAt: inRange(r.convertedAt) ? r.convertedAt : undefined }));
  const overall = computeFunnelMetrics(scoped);
  const hasEvents = overall.totals.sent > 0;

  const byCampaign = [...new Set(scoped.map((r) => r.campaignId))].map((id) => ({ id, m: computeFunnelMetrics(scoped.filter((r) => r.campaignId === id)) })).filter((x) => x.m.totals.sent > 0);
  const groups = data.audienceGroups.map((g) => ({ name: g.name, m: computeFunnelMetrics(scoped.filter((r) => contacts.get(r.contactId)?.audienceGroups.includes(g.name))) })).filter((x) => x.m.totals.sent > 0);
  const failed = scoped.flatMap((r) => r.messages.filter((m) => m.status === "failed").map((m) => ({ r, m })));
  const days: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); isoDay(d) <= to && days.length < 400; d = new Date(d.getTime() + 86_400_000)) days.push(isoDay(d));
  const before = data.contacts.filter((c) => c.createdAt.slice(0, 10) < from).length;
  let running = before;
  const growth = days.map((d) => {
    const added = data.contacts.filter((c) => c.createdAt.slice(0, 10) === d).length;
    running += added;
    return { d, added, total: running };
  });

  const rowFor = (label: string, m: FunnelMetrics) => [label, m.started, m.totals.sent, pct(m.rates.delivery), pct(m.rates.read), pct(m.rates.clickThrough), m.replied, pct(m.rates.reply), m.totals.failed, m.converted];
  const PERF_HEAD = ["Name", "Recipients", "Sent", "Delivery rate", "Read rate", "Click rate", "Replies", "Reply rate", "Failed", "Conversions"];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" description={`Calculated from ${workspace.name}’s stored messages and events.`} />
      <Card className="flex-row flex-wrap items-end gap-3 p-4">
        <div className="flex flex-col gap-1.5"><Label htmlFor="r-from">From</Label><Input id="r-from" type="date" max={to} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="r-to">To</Label><Input id="r-to" type="date" min={from} max={today} value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex min-w-56 flex-col gap-1.5"><Label htmlFor="r-camp">Campaign</Label>
          <NativeSelect id="r-camp" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}><option value="">All campaigns</option>{data.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>
        </div>
      </Card>

      {!hasEvents ? (
        <Card className="items-center p-10 text-center text-sm text-muted-foreground">Analytics will appear when real campaign activity is available for this period.</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([["Messages sent", formatNumber(overall.totals.sent)], ["Delivery rate", pct(overall.rates.delivery)], ["Read rate", pct(overall.rates.read)], ["Click rate", pct(overall.rates.clickThrough)], ["Reply rate", pct(overall.rates.reply)], ["Failed messages", formatNumber(overall.totals.failed)], ["Conversion rate", pct(overall.rates.conversion)], ["Funnel completion", pct(overall.rates.completion)]] as const).map(([k, v]) => (
              <Card key={k} className="gap-1 p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-semibold tabular-nums">{v}</p></Card>
            ))}
          </div>
          <ReportTable title="Campaign performance" head={PERF_HEAD} rows={byCampaign.map((x) => rowFor(campaigns.get(x.id)?.name ?? x.id, x.m))} file="campaign-performance" />
          <ReportTable title="Funnel performance" head={["Step", "Sent", "Delivered", "Read", "Clicked", "Failed", "Progression"]} file="funnel-performance"
            rows={overall.steps.map((s, i) => [`Message ${s.step}`, s.sent, s.delivered, s.read, s.clicked, s.failed, i === 0 ? "—" : pct(i === 1 ? overall.rates.m1ToM2 : overall.rates.m2ToM3)])} />
          <ReportTable title="Audience performance" head={PERF_HEAD} rows={groups.map((x) => rowFor(x.name, x.m))} file="audience-performance" empty="No group members received messages in this period." />
          <ReportTable title="Failed messages" head={["Contact", "Campaign", "Step", "Reason", "Sent at"]} file="failed-messages" empty="No failed messages in this period."
            rows={failed.map(({ r, m }) => [contacts.get(r.contactId)?.fullName ?? r.contactId, campaigns.get(r.campaignId)?.name ?? r.campaignId, m.step, m.failedReason ?? "—", m.sentAt.slice(0, 16).replace("T", " ")])} />
        </>
      )}

      <ReportTable title="Contact growth" head={["Date", "New contacts", "Total contacts"]} file="contact-growth" rows={growth.filter((g) => g.added > 0).map((g) => [g.d, g.added, g.total])} empty="No contacts were added in this period." />

      <Card className="gap-3 p-5">
        <p className="text-sm font-semibold">Metric definitions</p>
        <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          {DEFINITIONS.map(([k, v]) => <div key={k}><dt className="font-medium">{k}</dt><dd className="text-muted-foreground">{v}</dd></div>)}
        </dl>
        <p className="text-xs text-muted-foreground">Only events received from WhatsApp and the tracked-link service are counted. Nothing is estimated.</p>
      </Card>
    </div>
  );
}

function ReportTable({ title, head, rows, file, empty = "No data for this period." }: { title: string; head: string[]; rows: (string | number)[][]; file: string; empty?: string }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="text-sm font-semibold">{title}</p>
        <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportCsv(file, head, rows)}><Download aria-hidden="true" /> CSV</Button>
      </div>
      {rows.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">{head.map((h, i) => <th key={h} scope="col" className={`px-4 py-2 font-semibold ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className={`px-4 py-2 ${j ? "text-right tabular-nums" : "font-medium"}`}>{typeof c === "number" ? formatNumber(c) : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
