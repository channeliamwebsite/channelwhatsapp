/**
 * Funnel event pipeline — SERVER ONLY.
 *
 *  ingestEvent()        ← WhatsApp webhooks (statuses, replies), tracked-link clicks, opt-outs
 *  processWorkspace()   ← scheduled job (/api/cron/funnel): sends due funnel steps
 *
 * Nothing here invents behaviour: recipient state only changes from real
 * events or from a send the WhatsApp API actually accepted.
 */
import type { DocumentData } from "firebase-admin/firestore";

import { addHours, applyEvent, checkSendGuards, dedupeKey, planNextAction, waitAfter } from "@/lib/funnel/engine";
import { nextDeliveryStatus } from "@/lib/funnel/status";
import { resolveVariables } from "@/lib/funnel/variables";
import { createTrackedToken } from "@/lib/tracking/links";
import { withUtm } from "@/lib/tracking/utm";
import type { Campaign } from "@/types/campaign";
import type { Contact } from "@/types/contact";
import type { DeliveryStatus, FunnelStep, MessageRecord, RecipientProgress } from "@/types/funnel";
import type { WhatsAppTemplate } from "@/types/template";
import type { Workspace } from "@/types/workspace";

import { enqueueTrigger } from "./automation-runner";

import { db } from "./firebase-admin";
import { listOwned, syncTemplatesFromMeta, wsRef } from "./repo";

import { getSender, type MessageSender } from "./sender";
import { recordWaMessage } from "./whatsapp/message-map";
export type { MessageSender };

// ---------------------------------------------------------------- ingestion
export type FunnelEventInput = {
  /** Provider event id — makes ingestion idempotent. */
  id: string;
  workspaceId: string;
  type: "sent" | "delivered" | "read" | "failed" | "reply" | "click" | "opt_out" | "conversion";
  at: string;
  campaignId: string;
  contactId: string;
  step?: FunnelStep;
  url?: string;
  error?: { message: string; retryable: boolean };
};


export async function ingestEvent(e: FunnelEventInput) {
  const ws = wsRef(e.workspaceId);
  const eventRef = ws.collection("events").doc(e.id.replace(/[/]/g, "_"));
  const recipientRef = ws.collection("recipients").doc(`${e.campaignId}__${e.contactId}`);
  const campaignRef = ws.collection("campaigns").doc(e.campaignId);

  await db().runTransaction(async (tx) => {
    const [seen, recipientSnap, campaignSnap] = await Promise.all([tx.get(eventRef), tx.get(recipientRef), tx.get(campaignRef)]);
    if (seen.exists || !recipientSnap.exists || !campaignSnap.exists) return; // duplicate or unknown
    const campaign = campaignSnap.data() as Campaign;
    let r = recipientSnap.data() as RecipientProgress;
    const step = e.step ?? r.currentStep;
    const update = (fn: (m: MessageRecord) => MessageRecord) => {
      r = { ...r, messages: r.messages.map((m) => (m.step === step ? fn(m) : m)) };
    };

    switch (e.type) {
      case "sent":
      case "delivered":
      case "read":
        update((m) => {
          const status = nextDeliveryStatus(m.status, e.type as DeliveryStatus) as DeliveryStatus;
          if (status === m.status) return m; // duplicate or out-of-order: never regress
          return { ...m, status, deliveredAt: status !== "sent" ? m.deliveredAt ?? e.at : m.deliveredAt, readAt: status === "read" ? m.readAt ?? e.at : m.readAt };
        });
        break;
      case "failed": {
        const msg = r.messages.find((m) => m.step === step);
        // A message already delivered/read can't fail afterwards (late or duplicate event).
        if (!msg || nextDeliveryStatus(msg.status, "failed") !== "failed") break;
        const canRetry = e.error?.retryable && (msg.attempts ?? 1) <= campaign.funnel.retry.maxAttempts;
        update((m) => ({ ...m, status: canRetry ? "queued" : "failed", failedReason: e.error?.message }));
        if (canRetry) r = { ...r, nextActionAt: addHours(e.at, campaign.funnel.retry.delayMinutes / 60) };
        break;
      }
      case "click":
        update((m) => ({ ...m, clicks: [...m.clicks, { url: e.url ?? "", at: e.at }] }));
        break;
      case "reply":
        r = applyEvent(r, { type: "reply", at: e.at }, campaign);
        break;
      case "conversion":
        r = applyEvent(r, { type: "conversion", at: e.at }, campaign);
        break;
      case "opt_out": {
        r = applyEvent(r, { type: "opt_out", at: e.at }, campaign);
        const contactRef = ws.collection("contacts").doc(e.contactId);
        const contact = (await tx.get(contactRef)).data() as Contact | undefined;
        if (contact && contact.optInStatus !== "opted_out") {
          tx.update(contactRef, {
            optInStatus: "opted_out", optedOutAt: e.at, updatedAt: e.at,
            consentHistory: [...(contact.consentHistory ?? []), { status: "opted_out", source: "WhatsApp opt-out", at: e.at }],
          });
        }
        break;
      }
    }
    tx.set(eventRef, { ...e, workspaceId: e.workspaceId });
    tx.set(recipientRef, r as DocumentData);
  });
  const trigger = ({ read: "message_read", click: "link_clicked", reply: "contact_replied", failed: "message_failed" } as const)[e.type as "read" | "click" | "reply" | "failed"];
  if (trigger) await enqueueTrigger(e.workspaceId, [{ type: trigger, contactId: e.contactId, campaignId: e.campaignId, at: e.at }]);
}

// ---------------------------------------------------------------- processing
export type ProcessSummary = { workspaceId: string; sent: number; exited: number; completed: number; held?: number; skipped?: string };

/** A paused template (Meta quality pause) is temporary: recipients wait instead of exiting. */
const PAUSED_RETRY_HOURS = 1;

/** Advance every due recipient of a workspace's active campaigns. */
export async function processWorkspace(workspace: Workspace, now: string, limit = 200): Promise<ProcessSummary> {
  const summary: ProcessSummary = { workspaceId: workspace.id, sent: 0, exited: 0, completed: 0 };
  const sender = getSender(workspace);
  if (!sender) return { ...summary, skipped: "Sending unavailable — WhatsApp integration not connected" };

  const ws = wsRef(workspace.id);
  const due = await ws.collection("recipients").where("state", "==", "waiting").where("nextActionAt", "<=", now).limit(limit).get();
  if (due.empty) return summary;
  // Recheck Meta's template status before sending. If Meta can't confirm it, send nothing this run.
  const fresh = await syncTemplatesFromMeta(workspace);
  if (!fresh.ok) return { ...summary, skipped: `Template status could not be confirmed with Meta: ${fresh.message}` };
  const [campaigns, templates] = await Promise.all([listOwned<Campaign>(workspace.id, "campaigns"), listOwned<WhatsAppTemplate>(workspace.id, "templates")]);
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));
  const templateById = new Map(templates.map((t) => [t.id, t]));

  for (const doc of due.docs) {
    const p = doc.data() as RecipientProgress;
    const campaign = campaignById.get(p.campaignId);
    if (!campaign || campaign.status !== "running") continue; // paused/cancelled: nothing moves

    // Retry a queued (previously failed) message, else plan the next step.
    const pending = p.messages.find((m) => m.status === "queued");
    const action = pending ? { type: "send" as const, step: pending.step, templateId: pending.templateId, branch: pending.branch } : planNextAction(p, campaign, now);
    if (action.type === "exit") {
      await doc.ref.update({ state: "exited", exitReason: action.reason, nextActionAt: null });
      summary.exited++;
      continue;
    }
    if (action.type === "complete") {
      await doc.ref.update({ state: "completed", nextActionAt: null });
      summary.completed++;
      continue;
    }
    if (action.type !== "send") continue;

    const contact = (await ws.collection("contacts").doc(p.contactId).get()).data() as Contact | undefined;
    const template = templateById.get(action.templateId);
    if (template?.status === "paused") {
      await doc.ref.update({ nextActionAt: addHours(now, PAUSED_RETRY_HOURS) });
      summary.held = (summary.held ?? 0) + 1;
      continue;
    }
    const progressForGuard = pending ? { ...p, messages: p.messages.filter((m) => m !== pending) } : p;
    const guard = checkSendGuards({ campaign, contact, template, progress: progressForGuard, step: action.step });
    if (!guard.ok) {
      await doc.ref.update({ state: "exited", exitReason: contact?.optInStatus === "opted_out" ? "opted_out" : "not_eligible", exitDetail: guard.reason, nextActionAt: null });
      summary.exited++;
      continue;
    }

    // Claim the send slot first: a second worker can never send the same step twice.
    const key = dedupeKey(campaign.id, p.contactId, action.step);
    const attempt = (pending?.attempts ?? 0) + 1;
    try {
      await ws.collection("sends").doc(`${key}#${attempt}`).create({ workspaceId: workspace.id, contactId: p.contactId, campaignId: campaign.id, at: now });
    } catch {
      continue;
    }

    const buttonUrls = template!.buttons.filter((b): b is Extract<typeof b, { type: "url" }> => b.type === "url" && Boolean(b.url)).map((b) =>
      campaign.trackLinks === false || workspace.settings?.tracking?.enabled === false ? withUtm(b.url, workspace.settings, campaign.name) : `${process.env.APP_URL ?? ""}/r/${createTrackedToken({ workspaceId: workspace.id, campaignId: campaign.id, contactId: p.contactId, step: action.step, url: withUtm(b.url, workspace.settings, campaign.name) })}`,
    );
    const result = await sender.send({ to: contact!.phone, template: template!, variables: resolveVariables(campaign.variables, contact!), buttonUrls });
    const record: MessageRecord = {
      step: action.step, templateId: action.templateId, branch: action.branch, dedupeKey: key, attempts: attempt, sentAt: now, clicks: pending?.clicks ?? [],
      ...(result.ok ? { status: "sent", waMessageId: result.waMessageId } : { status: result.retryable && attempt <= campaign.funnel.retry.maxAttempts ? "queued" : "failed", failedReason: result.error }),
    };
    const messages = [...p.messages.filter((m) => m.step !== action.step), record];
    const retryLater = !result.ok && record.status === "queued";
    await doc.ref.update({
      messages,
      currentStep: action.step,
      nextActionAt: retryLater ? addHours(now, campaign.funnel.retry.delayMinutes / 60) : addHours(now, waitAfter(action.step, campaign)),
    });
    if (result.ok) {
      summary.sent++;
      await recordWaMessage({ waMessageId: result.waMessageId, workspaceId: workspace.id, kind: "funnel", campaignId: campaign.id, contactId: p.contactId, step: action.step });
    }
  }
  return summary;
}
