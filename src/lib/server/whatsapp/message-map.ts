/**
 * WhatsApp message-id correlation: workspaces/{w}/waMessages/{waMessageId}.
 * Written on every successful send so status webhooks (which only carry the
 * WhatsApp message id) can find the funnel step / conversation message.
 * Stores only correlation fields — no message content.
 */
import { db } from "../firebase-admin";

export type WaMessageKind = "funnel" | "reply" | "automation" | "test";

export type WaMessageRef = {
  waMessageId: string;
  workspaceId: string;
  kind: WaMessageKind;
  campaignId?: string;
  contactId?: string;
  step?: 1 | 2 | 3;
  conversationId?: string;
  /** Conversation message document id (replies). */
  messageId?: string;
  createdAt: string;
};

/** Firestore ids can't contain "/". WhatsApp ids are base64-like, so this is lossless in practice. */
export const waMessageDocId = (waMessageId: string) => waMessageId.replace(/\//g, "_").slice(0, 1400);

export const waMessageDoc = (workspaceId: string, waMessageId: string) =>
  db().collection("workspaces").doc(workspaceId).collection("waMessages").doc(waMessageDocId(waMessageId));

/** Best effort: the message was already sent, so a mapping failure is logged, not thrown. */
export async function recordWaMessage(ref: Omit<WaMessageRef, "createdAt">) {
  try {
    await waMessageDoc(ref.workspaceId, ref.waMessageId).set({ ...ref, createdAt: new Date().toISOString() });
  } catch (error) {
    console.error("[whatsapp] failed to record message mapping", { workspaceId: ref.workspaceId, kind: ref.kind, code: (error as { code?: unknown })?.code });
  }
}

export async function lookupWaMessage(workspaceId: string, waMessageId: string): Promise<WaMessageRef | null> {
  const snap = await waMessageDoc(workspaceId, waMessageId).get();
  const data = snap.data() as WaMessageRef | undefined;
  return data && data.workspaceId === workspaceId ? data : null;
}
