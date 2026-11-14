/**
 * Conversations — SERVER ONLY. Data arrives exclusively from:
 *   ingestInboundMessage()  ← future WhatsApp webhook (messages)
 *   applyStatusUpdate()     ← future WhatsApp webhook (statuses)
 *   sendReply()             ← dashboard reply box (needs a live sender)
 */
import type { DocumentData } from "firebase-admin/firestore";

import { validatePhone } from "@/lib/contacts/phone";
import type { Contact } from "@/types/contact";
import type { Conversation, ConversationMessage, MessageStatus, MessageType } from "@/types/conversation";

import { enqueueTrigger } from "./automation-runner";
import { ApiError } from "./errors";
import { db } from "./firebase-admin";
import { getSender } from "./sender";
import { requireWorkspace, wsRef } from "./repo";

const WINDOW_MS = 24 * 60 * 60 * 1000;

const PAGE = 50;

/** Newest first, paginated by `before` (an ISO lastMessageAt cursor). */
export async function listConversations(workspaceId: string, before?: string) {
  await requireWorkspace(workspaceId);
  let query = wsRef(workspaceId).collection("conversations").orderBy("lastMessageAt", "desc");
  if (before) query = query.startAfter(before);
  const snap = await query.limit(PAGE + 1).get();
  const items = snap.docs.slice(0, PAGE).map((d) => d.data() as Conversation).filter((c) => c.workspaceId === workspaceId);
  return { conversations: items, nextCursor: snap.docs.length > PAGE ? items[items.length - 1]?.lastMessageAt ?? null : null };
}

export async function listMessages(workspaceId: string, conversationId: string) {
  await requireWorkspace(workspaceId);
  const snap = await wsRef(workspaceId).collection("messages").where("conversationId", "==", conversationId).orderBy("timestamp", "asc").limit(500).get();
  return snap.docs.map((d) => d.data() as ConversationMessage).filter((m) => m.workspaceId === workspaceId);
}

export async function updateConversation(workspaceId: string, conversationId: string, patch: { status?: Conversation["status"]; markRead?: boolean }) {
  const ref = wsRef(workspaceId).collection("conversations").doc(conversationId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.workspaceId !== workspaceId) throw new ApiError(404, "Conversation not found.");
  await ref.update({ ...(patch.status ? { status: patch.status } : {}), ...(patch.markRead ? { unreadCount: 0 } : {}) });
}

/** Free-form replies are only allowed inside Meta's 24-hour customer service window. */
export async function sendReply(workspaceId: string, conversationId: string, text: string) {
  const workspace = await requireWorkspace(workspaceId);
  const snap = await wsRef(workspaceId).collection("conversations").doc(conversationId).get();
  if (!snap.exists || snap.data()!.workspaceId !== workspaceId) throw new ApiError(404, "Conversation not found.");
  const conversation = snap.data() as Conversation;
  if (!conversation.lastInboundAt || Date.now() - new Date(conversation.lastInboundAt).getTime() > WINDOW_MS) {
    throw new ApiError(409, "The 24-hour reply window has closed. Send an approved template instead.");
  }
  const sender = getSender(workspace);
  if (!sender) throw new ApiError(409, "Sending is unavailable — verify this workspace’s WhatsApp connection first.");
  const contact = (await wsRef(workspaceId).collection("contacts").doc(conversation.contactId).get()).data() as Contact | undefined;
  if (!contact) throw new ApiError(404, "Contact not found.");
  if (contact.optInStatus === "opted_out") throw new ApiError(409, "This contact has opted out.");

  const result = await sender.sendText(contact.phone, text);
  if (!result.ok) throw new ApiError(result.retryable ? 503 : 422, result.error);
  const now = new Date().toISOString();
  const ref = wsRef(workspaceId).collection("messages").doc(`out_${result.waMessageId}`.replace(/[^A-Za-z0-9_\-.]/g, "_"));
  const message: ConversationMessage = { id: ref.id, workspaceId, conversationId, contactId: contact.id, direction: "outbound", type: "text", text, status: "sent", waMessageId: result.waMessageId, timestamp: now };
  const batch = db().batch();
  batch.set(ref, message as DocumentData);
  batch.update(wsRef(workspaceId).collection("conversations").doc(conversationId), { lastMessageAt: now, lastMessagePreview: text.slice(0, 120), lastDirection: "outbound" });
  await batch.commit();
  return message;
}

export type InboundMessage = { waMessageId: string; from: string; type: MessageType; text?: string; media?: ConversationMessage["media"]; timestamp: string };

/** Idempotently store an inbound WhatsApp message and update its conversation. */
export async function ingestInboundMessage(workspaceId: string, m: InboundMessage) {
  const phone = validatePhone(m.from.startsWith("+") ? m.from : `+${m.from}`);
  if (!phone.valid) throw new ApiError(400, "Invalid sender number");
  const ws = wsRef(workspaceId);
  const contactSnap = await ws.collection("contacts").where("phone", "==", phone.e164).limit(1).get();
  let contact = contactSnap.docs[0]?.data() as Contact | undefined;
  if (!contact) {
    // Unknown sender: create a contact WITHOUT marketing consent.
    const id = `ct_${crypto.randomUUID().slice(0, 12)}`;
    contact = { id, workspaceId, fullName: phone.e164, phone: phone.e164, email: "", country: phone.country ?? "", city: "", organisation: "", designation: "", audienceGroups: [], tags: [], optInStatus: "pending", consentSource: "", consentDate: "", createdAt: m.timestamp, updatedAt: m.timestamp };
    await ws.collection("contacts").doc(id).create(contact as DocumentData);
    await enqueueTrigger(workspaceId, [{ type: "contact_added", contactId: id, at: m.timestamp }]);
  }
  const conversationId = `conv_${contact.id}`;
  const messageRef = ws.collection("messages").doc(`in_${m.waMessageId}`.replace(/[^A-Za-z0-9_\-.]/g, "_"));
  await db().runTransaction(async (tx) => {
    if ((await tx.get(messageRef)).exists) return; // duplicate webhook delivery
    const convRef = ws.collection("conversations").doc(conversationId);
    const conv = (await tx.get(convRef)).data() as Conversation | undefined;
    const message: ConversationMessage = { id: messageRef.id, workspaceId, conversationId, contactId: contact!.id, direction: "inbound", type: m.type, text: m.text, media: m.media, status: "received", waMessageId: m.waMessageId, timestamp: m.timestamp };
    tx.set(messageRef, message as DocumentData);
    tx.set(convRef, {
      id: conversationId, workspaceId, contactId: contact!.id, status: conv?.status === "closed" ? "open" : conv?.status ?? "open",
      unreadCount: (conv?.unreadCount ?? 0) + 1, lastMessageAt: m.timestamp, lastMessagePreview: (m.text ?? `[${m.type}]`).slice(0, 120), lastDirection: "inbound", lastInboundAt: m.timestamp,
    } satisfies Conversation as DocumentData);
  });
  await enqueueTrigger(workspaceId, [{ type: "contact_replied", contactId: contact.id, at: m.timestamp }]);
}

const ORDER: MessageStatus[] = ["queued", "sent", "delivered", "read"];

/** Apply a delivery/read/failed status webhook to an outbound conversation message. */
export async function applyStatusUpdate(workspaceId: string, waMessageId: string, status: "sent" | "delivered" | "read" | "failed", error?: string) {
  const snap = await wsRef(workspaceId).collection("messages").where("waMessageId", "==", waMessageId).limit(1).get();
  const doc = snap.docs[0];
  if (!doc) return;
  const current = (doc.data() as ConversationMessage).status;
  if (status === "failed" || ORDER.indexOf(status) > ORDER.indexOf(current)) await doc.ref.update({ status, ...(error ? { error } : {}) });
}
