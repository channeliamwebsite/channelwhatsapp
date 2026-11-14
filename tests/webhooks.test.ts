import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import { nextDeliveryStatus } from "@/lib/funnel/status";
import type { FunnelEventInput } from "@/lib/server/funnel-pipeline";
import type { WaMessageRef } from "@/lib/server/whatsapp/message-map";
import { isOptOutText } from "@/lib/server/whatsapp/opt-out";
import { verifyWebhookSignature } from "@/lib/server/whatsapp/signature";
import { isOptOutEvent, processWebhookBatches, verifySubscription, type WebhookStore } from "@/lib/server/whatsapp/webhook";
import { parseWebhookPayload, type InboundEvent } from "@/lib/server/whatsapp/webhook-payload";

const SECRET = "test-app-secret";
const sign = (raw: string, secret = SECRET) => `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
const TS = "1794600000";

// ---- payload helpers (shape of real Cloud API webhooks) ----
const textMsg = (id: string, from: string, body: string, extra: object = {}) => ({ id, from, timestamp: TS, type: "text", text: { body }, ...extra });
const status = (id: string, s: string, extra: object = {}) => ({ id, status: s, timestamp: TS, recipient_id: "919847012345", ...extra });
const payload = (...changes: { phoneNumberId: string; messages?: unknown[]; statuses?: unknown[] }[]) => ({
  object: "whatsapp_business_account",
  entry: changes.map((c, i) => ({ id: `waba${i}`, changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { display_phone_number: "15550000000", phone_number_id: c.phoneNumberId }, messages: c.messages, statuses: c.statuses } }] })),
});

// ---- in-memory store mimicking the Firestore implementation's guarantees ----
function memoryStore() {
  const workspacesByNumber: Record<string, string> = { "1111111111": "ws_a", "2222222222": "ws_b" };
  const inboundSeen = new Set<string>();
  const contacts = new Map<string, { id: string; optedOut: boolean; history: string[] }>(); // key ws:from
  const mappings = new Map<string, WaMessageRef>(); // key ws:waId
  const events = new Map<string, FunnelEventInput>(); // dedupe by ws:id
  const recipientStatus = new Map<string, string>(); // ws:campaign:contact:step -> status
  const conversationStatus = new Map<string, string>();
  const active: Record<string, string[]> = {};
  const contactKey = (ws: string, id: string) => `${ws}:${id}`;
  const store: WebhookStore = {
    async findWorkspaceIdByPhoneNumberId(id) { return workspacesByNumber[id] ?? null; },
    async ingestInbound(ws, e) {
      const k = `${ws}:${e.from}`;
      if (!contacts.has(k)) contacts.set(k, { id: `ct_${e.from}`, optedOut: false, history: [] });
      const duplicate = inboundSeen.has(`${ws}:${e.waMessageId}`);
      inboundSeen.add(`${ws}:${e.waMessageId}`);
      return { contactId: contacts.get(k)!.id, conversationId: `conv_ct_${e.from}`, duplicate };
    },
    async optOutContact(ws, contactId, _at, source) {
      const c = [...contacts.entries()].find(([k, v]) => k.startsWith(`${ws}:`) && v.id === contactId)?.[1];
      if (c && !c.optedOut) { c.optedOut = true; c.history.push(source); }
    },
    async lookupWaMessage(ws, id) { return mappings.get(`${ws}:${id}`) ?? null; },
    async applyConversationStatus(ws, waId, s) {
      const k = `${ws}:${waId}`;
      conversationStatus.set(k, nextDeliveryStatus((conversationStatus.get(k) ?? "sent") as never, s));
    },
    async ingestFunnelEvent(e) {
      const k = `${e.workspaceId}:${e.id}`;
      if (events.has(k)) return; // idempotent like the events/{id} collection
      events.set(k, e);
      if (["sent", "delivered", "read", "failed"].includes(e.type)) {
        const rk = `${e.workspaceId}:${e.campaignId}:${e.contactId}:${e.step}`;
        recipientStatus.set(rk, nextDeliveryStatus((recipientStatus.get(rk) ?? "sent") as never, e.type as never));
      }
    },
    async activeCampaignIds(ws, contactId) { return active[contactKey(ws, contactId)] ?? []; },
  };
  return { store, contacts, mappings, events, recipientStatus, conversationStatus, active, contactKey };
}

const run = async (body: unknown, mem = memoryStore()) => {
  const { batches } = parseWebhookPayload(body);
  return { summary: await processWebhookBatches(batches, mem.store), mem };
};

// ================= GET verification =================
test("GET verification", () => {
  const p = (q: string) => new URLSearchParams(q);
  assert.deepEqual(verifySubscription(p("hub.mode=subscribe&hub.verify_token=tok123&hub.challenge=987654"), "tok123"), { status: 200, body: "987654" });
  assert.equal(verifySubscription(p("hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1"), "tok123").status, 403);
  assert.equal(verifySubscription(p("hub.mode=subscribe&hub.verify_token=tok123&hub.challenge=1"), undefined).status, 503);
  assert.equal(verifySubscription(p("hub.mode=subscribe&hub.verify_token=tok123"), "tok123").status, 400);
  assert.equal(verifySubscription(p("hub.mode=unsubscribe&hub.verify_token=tok123&hub.challenge=1"), "tok123").status, 403);
  assert.ok(!verifySubscription(p("hub.mode=subscribe&hub.verify_token=x&hub.challenge=1"), "tok123").body.includes("tok123"), "never echoes the token");
});

// ================= POST signature =================
test("POST signature verification", () => {
  const raw = JSON.stringify(payload({ phoneNumberId: "1111111111", messages: [textMsg("wamid.1", "919847012345", "Hi")] }));
  assert.equal(verifyWebhookSignature(raw, sign(raw), SECRET), true);
  assert.equal(verifyWebhookSignature(raw, sign(raw, "other-secret"), SECRET), false, "invalid signature");
  assert.equal(verifyWebhookSignature(raw, null, SECRET), false, "missing signature");
  assert.equal(verifyWebhookSignature(raw.replace("Hi", "Ho"), sign(raw), SECRET), false, "tampered payload");
  assert.equal(verifyWebhookSignature(raw, sign(raw), ""), false, "missing app secret");
  assert.equal(verifyWebhookSignature(raw, "sha1=abc", SECRET), false, "malformed header");
});

// ================= payload parsing =================
test("payload parsing: multiple entries/messages, types, malformed items dropped", () => {
  const { batches, dropped } = parseWebhookPayload(payload(
    { phoneNumberId: "1111111111", messages: [textMsg("wamid.1", "919847012345", "Hello"), textMsg("wamid.2", "919847012346", "Hi", { context: { id: "wamid.out1" } }), { id: "bad" }] },
    { phoneNumberId: "2222222222", messages: [{ id: "wamid.3", from: "971501234567", timestamp: TS, type: "button", button: { text: "Stop updates", payload: "STOP_UPDATES" } }], statuses: [status("wamid.out2", "delivered"), status("x", "weird")] },
  ));
  assert.equal(batches.length, 2);
  assert.equal(batches[0].inbound.length, 2);
  assert.equal(batches[0].inbound[1].contextId, "wamid.out1");
  assert.equal(batches[0].inbound[0].timestamp, new Date(Number(TS) * 1000).toISOString(), "Meta timestamp preserved");
  assert.equal(batches[1].inbound[0].buttonPayload, "STOP_UPDATES");
  assert.equal(batches[1].statuses.length, 1);
  assert.equal(dropped, 2);
  assert.equal(parseWebhookPayload({ object: "page" }).batches.length, 0, "non-WhatsApp object ignored");
  const img = parseWebhookPayload(payload({ phoneNumberId: "1111111111", messages: [{ id: "wamid.9", from: "919847012345", timestamp: TS, type: "image", image: { id: "media1", mime_type: "image/jpeg", caption: "pic" } }] })).batches[0].inbound[0];
  assert.equal(img.type, "image");
  assert.equal(img.media?.mediaId, "media1");
  const loc = parseWebhookPayload(payload({ phoneNumberId: "1111111111", messages: [{ id: "wamid.10", from: "919847012345", timestamp: TS, type: "location", location: {} }] })).batches[0].inbound[0];
  assert.equal(loc.text, "[location message]", "unsupported types handled gracefully");
});

// ================= opt-out detection =================
test("STOP / UNSUBSCRIBE detection with variations, no false positives", () => {
  for (const t of ["STOP", "stop", " Stop. ", "UNSUBSCRIBE", "Unsubscribe!", "cancel", "END", "quit", "opt out", "STOP ALL", "stop updates"]) assert.equal(isOptOutText(t), true, t);
  for (const t of ["Please don't stop", "I'll stop by tomorrow", "end of the day works", "can I cancel my booking?", "stopwatch", "", undefined]) assert.equal(isOptOutText(t), false, String(t));
  const btn: InboundEvent = { waMessageId: "w", from: "919847012345", timestamp: "", type: "text", text: "No thanks", buttonPayload: "STOP_UPDATES" };
  assert.equal(isOptOutEvent(btn), true, "quick-reply payload");
});

// ================= status ordering =================
test("delivery status never regresses; failed only before delivery", () => {
  assert.equal(nextDeliveryStatus("sent", "delivered"), "delivered");
  assert.equal(nextDeliveryStatus("read", "delivered"), "read", "out-of-order");
  assert.equal(nextDeliveryStatus("delivered", "sent"), "delivered");
  assert.equal(nextDeliveryStatus("read", "read"), "read", "duplicate");
  assert.equal(nextDeliveryStatus("sent", "failed"), "failed");
  assert.equal(nextDeliveryStatus("read", "failed"), "read", "late failure ignored");
  assert.equal(nextDeliveryStatus("failed", "sent"), "failed");
  assert.equal(nextDeliveryStatus("failed", "delivered"), "delivered");
});

// ================= event processing =================
test("incoming messages: routed to the right workspace, duplicates ignored, unknown numbers skipped", async () => {
  const mem = memoryStore();
  const body = payload({ phoneNumberId: "1111111111", messages: [textMsg("wamid.1", "919847012345", "Hello"), textMsg("wamid.2", "919847012399", "Hi")] }, { phoneNumberId: "9999999999", messages: [textMsg("wamid.3", "919847012345", "lost?")] });
  const first = await run(body, mem);
  assert.equal(first.summary.inbound, 2);
  assert.equal(first.summary.unknownNumbers, 1, "unknown phone_number_id ignored safely");
  assert.ok(mem.contacts.has("ws_a:919847012345"));
  assert.ok(![...mem.contacts.keys()].some((k) => k.startsWith("ws_b:")), "nothing written to another workspace");
  const second = await run(body, mem);
  assert.equal(second.summary.inbound, 2, "retry is processed idempotently (store reports duplicates)");
});

test("statuses: sent, delivered, read, failed, duplicates and out-of-order", async () => {
  const mem = memoryStore();
  mem.mappings.set("ws_a:wamid.out1", { waMessageId: "wamid.out1", workspaceId: "ws_a", kind: "funnel", campaignId: "cmp1", contactId: "ct_1", step: 1, createdAt: "" });
  mem.mappings.set("ws_a:wamid.reply1", { waMessageId: "wamid.reply1", workspaceId: "ws_a", kind: "reply", contactId: "ct_1", conversationId: "conv", messageId: "out_x", createdAt: "" });
  await run(payload({ phoneNumberId: "1111111111", statuses: [status("wamid.out1", "sent"), status("wamid.out1", "read"), status("wamid.out1", "delivered"), status("wamid.out1", "read"), status("wamid.reply1", "delivered")] }), mem);
  assert.equal(mem.recipientStatus.get("ws_a:cmp1:ct_1:1"), "read", "out-of-order delivered after read doesn't regress");
  assert.equal([...mem.events.keys()].filter((k) => k.includes("status:wamid.out1:read")).length, 1, "duplicate status processed once");
  assert.equal(mem.conversationStatus.get("ws_a:wamid.reply1"), "delivered", "non-campaign (reply) messages updated too");
  const unmatched = await run(payload({ phoneNumberId: "1111111111", statuses: [status("wamid.unknown", "delivered")] }), mem);
  assert.equal(unmatched.summary.unmatchedStatuses, 1);

  const mem2 = memoryStore();
  mem2.mappings.set("ws_a:wamid.f", { waMessageId: "wamid.f", workspaceId: "ws_a", kind: "funnel", campaignId: "cmp1", contactId: "ct_1", step: 2, createdAt: "" });
  await run(payload({ phoneNumberId: "1111111111", statuses: [status("wamid.f", "failed", { errors: [{ code: 131026, title: "Message undeliverable" }] })] }), mem2);
  const failed = [...mem2.events.values()][0];
  assert.equal(failed.type, "failed");
  assert.equal(failed.error?.retryable, false);
  assert.equal(failed.step, 2);
});

test("STOP opts the contact out and exits active funnels; 131050 also opts out", async () => {
  const mem = memoryStore();
  mem.active[mem.contactKey("ws_a", "ct_919847012345")] = ["cmp1", "cmp2"];
  const { summary } = await run(payload({ phoneNumberId: "1111111111", messages: [textMsg("wamid.s", "919847012345", "  stop ")] }), mem);
  assert.equal(summary.optOuts, 1);
  assert.equal(mem.contacts.get("ws_a:919847012345")?.optedOut, true);
  assert.deepEqual([...mem.events.values()].map((e) => `${e.type}:${e.campaignId}`).sort(), ["opt_out:cmp1", "opt_out:cmp2"]);
  assert.equal([...mem.events.values()].some((e) => e.type === "reply"), false, "an opt-out is not counted as a reply");

  const mem2 = memoryStore();
  await run(payload({ phoneNumberId: "1111111111", messages: [textMsg("wamid.a", "919847012345", "hello")] }), mem2);
  mem2.mappings.set("ws_a:wamid.m", { waMessageId: "wamid.m", workspaceId: "ws_a", kind: "funnel", campaignId: "cmp1", contactId: "ct_919847012345", step: 1, createdAt: "" });
  await run(payload({ phoneNumberId: "1111111111", statuses: [status("wamid.m", "failed", { errors: [{ code: 131050 }] })] }), mem2);
  assert.equal(mem2.contacts.get("ws_a:919847012345")?.optedOut, true);
});

test("replies link to the exact funnel via context, else to all active funnels", async () => {
  const mem = memoryStore();
  mem.active[mem.contactKey("ws_a", "ct_919847012345")] = ["cmp1", "cmp2"];
  mem.mappings.set("ws_a:wamid.c2", { waMessageId: "wamid.c2", workspaceId: "ws_a", kind: "funnel", campaignId: "cmp2", contactId: "ct_919847012345", step: 1, createdAt: "" });
  await run(payload({ phoneNumberId: "1111111111", messages: [textMsg("wamid.r1", "919847012345", "Yes please", { context: { id: "wamid.c2" } })] }), mem);
  assert.deepEqual([...mem.events.values()].map((e) => e.campaignId), ["cmp2"], "context targets only cmp2");
  await run(payload({ phoneNumberId: "1111111111", messages: [textMsg("wamid.r2", "919847012345", "Another question")] }), mem);
  assert.deepEqual([...mem.events.values()].filter((e) => e.id.startsWith("reply:wamid.r2")).map((e) => e.campaignId).sort(), ["cmp1", "cmp2"]);
});

test("workspace isolation: a context id from another workspace is never followed", async () => {
  const mem = memoryStore();
  mem.mappings.set("ws_b:wamid.foreign", { waMessageId: "wamid.foreign", workspaceId: "ws_b", kind: "funnel", campaignId: "cmpB", contactId: "ct_919847012345", step: 1, createdAt: "" });
  await run(payload({ phoneNumberId: "1111111111", messages: [textMsg("wamid.x", "919847012345", "hi", { context: { id: "wamid.foreign" } })] }), mem);
  assert.equal([...mem.events.values()].some((e) => e.campaignId === "cmpB" || e.workspaceId === "ws_b"), false);
});
