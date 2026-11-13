/**
 * ⚠️ MOCK SIMULATOR — produces realistic recipient behaviour so the funnel UI
 * and analytics can be built before the Meta API is connected. It sends
 * nothing. Every "send" still goes through the real engine guards.
 */
import type { WorkspaceData } from "@/lib/store/hub-store";
import type { Campaign } from "@/types/campaign";
import type { Contact } from "@/types/contact";
import type { FunnelStep, MessageRecord, RecipientProgress } from "@/types/funnel";

import { addHours, applyEvent, checkConsent, checkSendGuards, dedupeKey, planNextAction, waitAfter, type FunnelEvent } from "./engine";

function rngFor(key: string) {
  let s = [...key].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RATES: Record<FunnelStep, { read: number; click: number }> = {
  1: { read: 0.72, click: 0.38 },
  2: { read: 0.62, click: 0.32 },
  3: { read: 0.55, click: 0.28 },
};

/** Simulated delivery outcome + behaviour events for one sent message. */
function simulateMessage(record: MessageRecord, campaign: Campaign, url: string | undefined): { record: MessageRecord; events: FunnelEvent[] } {
  const rand = rngFor(record.dedupeKey);
  const events: FunnelEvent[] = [];
  if (rand() < 0.04) return { record: { ...record, status: "failed", failedReason: "Message undeliverable (131026)" }, events };
  const window = Math.min(waitAfter(record.step, campaign), 24) - 1;
  const r: MessageRecord = { ...record, status: "delivered", deliveredAt: addHours(record.sentAt, 0.02) };
  if (rand() < 0.015) events.push({ type: "opt_out", at: addHours(record.sentAt, 0.5) });
  if (rand() < RATES[record.step].read) {
    r.status = "read";
    r.readAt = addHours(record.sentAt, 0.1 + rand() * window * 0.5);
    if (url && rand() < RATES[record.step].click) {
      const at = addHours(r.readAt, 0.05);
      r.clicks = [{ url, at }];
      if (campaign.conversionGoal.type === "link_click" && rand() < 0.4) events.push({ type: "conversion", at: addHours(at, 0.3) });
    }
    if (rand() < 0.07) events.push({ type: "reply", at: addHours(r.readAt, 0.2) });
  }
  return { record: r, events };
}

/** Process every due recipient of one campaign at `now`. */
export function processCampaign(ws: WorkspaceData, campaignId: string, now: string): WorkspaceData {
  const campaign = ws.campaigns.find((c) => c.id === campaignId);
  if (!campaign || campaign.status !== "running") return ws; // paused/stopped: nothing moves
  const contacts = new Map(ws.contacts.map((c) => [c.id, c]));
  const templates = new Map(ws.templates.map((t) => [t.id, t]));
  const optedOut = new Map<string, string>();

  const recipients = ws.recipients.map((p) => {
    if (p.campaignId !== campaignId) return p;
    const action = planNextAction(p, campaign, now);
    if (action.type === "exit") return { ...p, state: "exited" as const, exitReason: action.reason, nextActionAt: undefined };
    if (action.type === "complete") return { ...p, state: "completed" as const, nextActionAt: undefined };
    if (action.type !== "send") return p;

    const contact = contacts.get(p.contactId);
    const template = templates.get(action.templateId);
    const guard = checkSendGuards({ campaign, contact, template, progress: p, step: action.step });
    if (!guard.ok) {
      const reason = contact?.optInStatus === "opted_out" ? "opted_out" : "not_eligible";
      return { ...p, state: "exited" as const, exitReason: reason, exitDetail: guard.reason, nextActionAt: undefined } satisfies RecipientProgress;
    }

    const url = template!.buttons.find((b) => b.type === "url")?.url;
    const { record, events } = simulateMessage(
      { step: action.step, templateId: action.templateId, branch: action.branch, dedupeKey: dedupeKey(campaign.id, p.contactId, action.step), status: "sent", sentAt: now, clicks: [] },
      campaign,
      url,
    );
    let next: RecipientProgress = { ...p, currentStep: action.step, messages: [...p.messages, record], nextActionAt: addHours(now, waitAfter(action.step, campaign)) };
    for (const e of events.sort((a, b) => a.at.localeCompare(b.at))) {
      next = applyEvent(next, e, campaign);
      if (e.type === "opt_out") optedOut.set(p.contactId, e.at.slice(0, 10));
    }
    return next;
  });

  return {
    ...ws,
    recipients,
    contacts: optedOut.size
      ? ws.contacts.map((c) => (optedOut.has(c.id) ? { ...c, optInStatus: "opted_out" as const, consentDate: optedOut.get(c.id)! } : c))
      : ws.contacts,
  };
}

/** Unique contacts in any of the campaign's audience groups. */
export function audienceContacts(contacts: Contact[], groups: string[]) {
  return contacts.filter((c) => c.audienceGroups.some((g) => groups.includes(g)));
}

/** Create recipient records (eligible or not) and send Message 1. */
export function launchCampaign(ws: WorkspaceData, campaignId: string, now: string): WorkspaceData {
  const campaign = ws.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return ws;
  const already = new Set(ws.recipients.filter((r) => r.campaignId === campaignId).map((r) => r.contactId));
  const created: RecipientProgress[] = audienceContacts(ws.contacts, campaign.audienceGroups)
    .filter((c) => !already.has(c.id))
    .map((c) => {
      const consent = checkConsent(c);
      const base = { id: `${campaignId}:${c.id}`, campaignId, contactId: c.id, currentStep: 0 as const, messages: [] };
      return consent.ok
        ? { ...base, state: "waiting" as const, nextActionAt: now }
        : { ...base, state: "exited" as const, exitReason: c.optInStatus === "opted_out" ? ("opted_out" as const) : ("not_eligible" as const), exitDetail: consent.reason };
    });
  const launched: WorkspaceData = {
    ...ws,
    campaigns: ws.campaigns.map((c) => (c.id === campaignId ? { ...c, status: "running", launchedAt: now, clock: now } : c)),
    recipients: [...ws.recipients, ...created],
  };
  return processCampaign(launched, campaignId, now);
}

/** Mock only: jump the campaign clock to the next due action and process it. */
export function fastForwardCampaign(ws: WorkspaceData, campaignId: string): WorkspaceData {
  const campaign = ws.campaigns.find((c) => c.id === campaignId);
  if (!campaign || campaign.status !== "running") return ws;
  const due = ws.recipients
    .filter((r) => r.campaignId === campaignId && r.state === "waiting" && r.nextActionAt)
    .map((r) => r.nextActionAt!)
    .sort();
  if (!due.length) {
    return { ...ws, campaigns: ws.campaigns.map((c) => (c.id === campaignId ? { ...c, status: "completed" } : c)) };
  }
  const now = due[0];
  const next = processCampaign({ ...ws, campaigns: ws.campaigns.map((c) => (c.id === campaignId ? { ...c, clock: now } : c)) }, campaignId, now);
  const stillWaiting = next.recipients.some((r) => r.campaignId === campaignId && r.state === "waiting");
  return stillWaiting ? next : { ...next, campaigns: next.campaigns.map((c) => (c.id === campaignId ? { ...c, status: "completed" } : c)) };
}

export function setCampaignStatus(ws: WorkspaceData, campaignId: string, status: "paused" | "running"): WorkspaceData {
  return { ...ws, campaigns: ws.campaigns.map((c) => (c.id === campaignId ? { ...c, status } : c)) };
}

/** Stop: every recipient still in the funnel exits; nothing more is sent. */
export function stopCampaign(ws: WorkspaceData, campaignId: string, now: string): WorkspaceData {
  const campaign = ws.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return ws;
  return {
    ...ws,
    campaigns: ws.campaigns.map((c) => (c.id === campaignId ? { ...c, status: "stopped" } : c)),
    recipients: ws.recipients.map((r) => (r.campaignId === campaignId ? applyEvent(r, { type: "campaign_stopped", at: now }, campaign) : r)),
  };
}

/** Seed helper: add a campaign and replay `stages` funnel stages on the mock clock. */
export function seedCampaignRecipients(ws: WorkspaceData, campaign: Campaign, stages: number): WorkspaceData {
  let next: WorkspaceData = { ...ws, campaigns: [...ws.campaigns, campaign] };
  if (!campaign.launchedAt || campaign.status === "draft" || campaign.status === "scheduled") return next;
  next = launchCampaign(next, campaign.id, campaign.launchedAt);
  const target = campaign.status === "completed" ? 10 : stages;
  for (let i = 0; i < target; i++) next = fastForwardCampaign(next, campaign.id);
  if (campaign.status === "paused") next = setCampaignStatus(next, campaign.id, "paused");
  if (campaign.status === "stopped") next = stopCampaign(next, campaign.id, next.campaigns.find((c) => c.id === campaign.id)?.clock ?? campaign.launchedAt);
  if (campaign.status === "completed") next = { ...next, campaigns: next.campaigns.map((c) => (c.id === campaign.id ? { ...c, status: "completed" } : c)) };
  return next;
}
