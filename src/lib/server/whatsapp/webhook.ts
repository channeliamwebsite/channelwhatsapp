/**
 * WhatsApp webhook processing. Storage is injected (WebhookStore) so the
 * routing / opt-out / funnel logic is unit-testable without Firebase.
 */
import { timingSafeEqual } from "node:crypto";

import type { FunnelEventInput } from "../funnel-pipeline";
import { classifyMetaError } from "./errors";
import type { WaMessageRef } from "./message-map";
import { isOptOutText } from "./opt-out";
import type { InboundEvent, StatusEvent, WebhookBatch } from "./webhook-payload";

export interface WebhookStore {
  /** Exactly one workspace configured with this Phone Number ID, else null. */
  findWorkspaceIdByPhoneNumberId(phoneNumberId: string): Promise<string | null>;
  /** Idempotent by WhatsApp message id. */
  ingestInbound(workspaceId: string, event: InboundEvent): Promise<{ contactId: string; conversationId: string; duplicate: boolean }>;
  /** Idempotent: no-op when the contact is already opted out. */
  optOutContact(workspaceId: string, contactId: string, at: string, source: string): Promise<void>;
  lookupWaMessage(workspaceId: string, waMessageId: string): Promise<WaMessageRef | null>;
  applyConversationStatus(workspaceId: string, waMessageId: string, status: StatusEvent["status"], at: string, error: string | undefined, messageDocId: string): Promise<void>;
  /** Idempotent by event id. */
  ingestFunnelEvent(event: FunnelEventInput): Promise<void>;
  /** Records that a signed event for this workspace arrived (webhook proven end to end). Optional. */
  markWebhookReceived?(workspaceId: string, at: string): Promise<void>;
  /** Campaigns where this contact is still in the funnel. */
  activeCampaignIds(workspaceId: string, contactId: string): Promise<string[]>;
}

export type ProcessSummary = { inbound: number; statuses: number; optOuts: number; replies: number; unknownNumbers: number; unmatchedStatuses: number };

/** Opt-out by text ("STOP"…) or by quick-reply/interactive payload ("STOP", "stop_updates", "UNSUBSCRIBE"). */
export function isOptOutEvent(e: InboundEvent) {
  return isOptOutText(e.text) || isOptOutText(e.buttonPayload?.replace(/[_-]+/g, " "));
}

export async function processWebhookBatches(batches: WebhookBatch[], store: WebhookStore): Promise<ProcessSummary> {
  const summary: ProcessSummary = { inbound: 0, statuses: 0, optOuts: 0, replies: 0, unknownNumbers: 0, unmatchedStatuses: 0 };

  for (const batch of batches) {
    // Route ONLY by the receiving number's id; never trust anything else in the payload.
    const workspaceId = await store.findWorkspaceIdByPhoneNumberId(batch.phoneNumberId);
    if (!workspaceId) {
      summary.unknownNumbers += batch.inbound.length + batch.statuses.length;
      continue;
    }
    await store.markWebhookReceived?.(workspaceId, new Date().toISOString());

    for (const e of batch.inbound) {
      const { contactId } = await store.ingestInbound(workspaceId, e);
      summary.inbound++;
      if (isOptOutEvent(e)) {
        await store.optOutContact(workspaceId, contactId, e.timestamp, "WhatsApp opt-out");
        for (const campaignId of await store.activeCampaignIds(workspaceId, contactId)) {
          await store.ingestFunnelEvent({ id: `optout:${e.waMessageId}:${campaignId}`, workspaceId, type: "opt_out", at: e.timestamp, campaignId, contactId });
        }
        summary.optOuts++;
        continue;
      }
      // Reply: prefer the exact funnel message it answers (context.id); else every active funnel.
      let campaignIds: string[] = [];
      if (e.contextId) {
        const ref = await store.lookupWaMessage(workspaceId, e.contextId);
        if (ref?.kind === "funnel" && ref.campaignId && ref.contactId === contactId) campaignIds = [ref.campaignId];
      }
      if (!campaignIds.length) campaignIds = await store.activeCampaignIds(workspaceId, contactId);
      for (const campaignId of campaignIds) {
        await store.ingestFunnelEvent({ id: `reply:${e.waMessageId}:${campaignId}`, workspaceId, type: "reply", at: e.timestamp, campaignId, contactId });
        summary.replies++;
      }
    }

    for (const s of batch.statuses) {
      const ref = await store.lookupWaMessage(workspaceId, s.waMessageId);
      if (!ref) {
        summary.unmatchedStatuses++; // not sent by this dashboard (or mapping missing)
        continue;
      }
      summary.statuses++;
      const classified = s.status === "failed" ? classifyMetaError({ code: s.error?.code }) : undefined;
      if (ref.messageId) await store.applyConversationStatus(workspaceId, s.waMessageId, s.status, s.timestamp, classified?.message, ref.messageId);
      if (ref.kind === "funnel" && ref.campaignId && ref.contactId) {
        await store.ingestFunnelEvent({
          id: `status:${s.waMessageId}:${s.status}`, workspaceId, type: s.status, at: s.timestamp,
          campaignId: ref.campaignId, contactId: ref.contactId, step: ref.step,
          error: classified ? { message: classified.message, retryable: classified.retryable } : undefined,
        });
      }
      // 131050: the user stopped marketing messages from this business — honour it as an opt-out.
      if (s.status === "failed" && s.error?.code === 131050 && ref.contactId) {
        await store.optOutContact(workspaceId, ref.contactId, s.timestamp, "Meta: user stopped marketing messages");
        summary.optOuts++;
      }
    }
  }
  return summary;
}

/** GET verification (pure). Never echoes the configured token. */
export function verifySubscription(params: URLSearchParams, configuredToken: string | undefined): { status: number; body: string } {
  if (!configuredToken) return { status: 503, body: "Webhook verification is not configured." };
  if (params.get("hub.mode") !== "subscribe") return { status: 403, body: "Forbidden" };
  const given = Buffer.from(params.get("hub.verify_token") ?? "");
  const expected = Buffer.from(configuredToken);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { status: 403, body: "Forbidden" };
  const challenge = params.get("hub.challenge");
  if (!challenge || challenge.length > 512 || !/^[\x21-\x7e]+$/.test(challenge)) return { status: 400, body: "Bad Request" };
  return { status: 200, body: challenge };
}
