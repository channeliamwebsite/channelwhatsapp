/** Firestore implementation of the webhook store — SERVER ONLY. */
import type { DocumentData } from "firebase-admin/firestore";

import type { Contact } from "@/types/contact";

import { applyStatusUpdate, ingestInboundMessage } from "../conversations";
import { db } from "../firebase-admin";
import { ingestEvent } from "../funnel-pipeline";
import { logActivity, wsRef } from "../repo";
import { lookupWaMessage } from "./message-map";
import type { WebhookStore } from "./webhook";

export const firestoreWebhookStore: WebhookStore = {
  async findWorkspaceIdByPhoneNumberId(phoneNumberId) {
    const snap = await db().collection("workspaces").where("whatsappAccount.phoneNumberId", "==", phoneNumberId).limit(2).get();
    // Ambiguous configuration is refused rather than guessing (uniqueness is also enforced on save).
    return snap.size === 1 ? snap.docs[0].id : null;
  },

  ingestInbound: (workspaceId, e) =>
    ingestInboundMessage(workspaceId, { waMessageId: e.waMessageId, from: e.from, type: e.type, text: e.text, media: e.media, timestamp: e.timestamp, contextId: e.contextId }),

  async optOutContact(workspaceId, contactId, at, source) {
    const ref = wsRef(workspaceId).collection("contacts").doc(contactId);
    await db().runTransaction(async (tx) => {
      const contact = (await tx.get(ref)).data() as Contact | undefined;
      if (!contact || (contact.workspaceId && contact.workspaceId !== workspaceId) || contact.optInStatus === "opted_out") return;
      tx.update(ref, {
        optInStatus: "opted_out",
        optedOutAt: at,
        updatedAt: new Date().toISOString(),
        consentHistory: [...(contact.consentHistory ?? []), { status: "opted_out", source, at }],
      } as DocumentData);
    });
    const batch = db().batch();
    logActivity(batch, workspaceId, { type: "contact_opted_out", message: `Contact opted out (${source})`, contactId }, at);
    await batch.commit();
  },

  lookupWaMessage,

  async markWebhookReceived(workspaceId, at) {
    await wsRef(workspaceId).update({ "whatsappAccount.webhookStatus": "verified", "whatsappAccount.webhookLastEventAt": at });
  },

  applyConversationStatus: (workspaceId, waMessageId, status, at, error, messageDocId) => applyStatusUpdate(workspaceId, waMessageId, status, at, error, messageDocId),

  ingestFunnelEvent: (event) => ingestEvent(event),

  async activeCampaignIds(workspaceId, contactId) {
    const snap = await wsRef(workspaceId).collection("recipients").where("contactId", "==", contactId).where("state", "==", "waiting").get();
    return snap.docs.map((d) => (d.data() as { campaignId: string; workspaceId?: string })).filter((r) => !r.workspaceId || r.workspaceId === workspaceId).map((r) => r.campaignId);
  },
};
