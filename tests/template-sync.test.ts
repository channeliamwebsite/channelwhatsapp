import assert from "node:assert/strict";
import { test } from "node:test";

import { createCloudSender } from "@/lib/server/sender";
import { createWhatsAppClient, type FetchLike } from "@/lib/server/whatsapp/client";
import { sharedTokenProvider } from "@/lib/server/whatsapp/credentials";
import { fetchMetaTemplates } from "@/lib/server/whatsapp/template-sync";
import { contentFromMeta, mapMetaStatus, NOT_FOUND_DETAIL, parseMetaTemplate, planTemplateSync, type MetaTemplate } from "@/lib/server/whatsapp/template-sync-rules";
import type { WhatsAppTemplate } from "@/types/template";
import type { Workspace } from "@/types/workspace";

const TOKEN = "EAAtest-secret-token-value";
const WABA = "9876543210";
const workspace = (o: Partial<Workspace["whatsappAccount"]> = {}, id = "she-power"): Workspace => ({
  id, name: "W", initials: "W", industry: "", color: "#000000", createdAt: "",
  whatsappAccount: { id: "", displayName: "", phoneNumber: "", status: "connected", qualityRating: "high", messagingLimit: "", phoneNumberId: "1234567890", wabaId: WABA, ...o },
});

type Res = { status: number; body: unknown };
function fakeFetch(responses: Res[]) {
  const calls: string[] = [];
  const fn: FetchLike = async (url) => {
    calls.push(url);
    const r = responses.shift() ?? { status: 500, body: {} };
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => JSON.stringify(r.body) };
  };
  return { fn, calls };
}
const deps = (responses: Res[]) => {
  const f = fakeFetch(responses);
  return { f, deps: { provider: sharedTokenProvider({ WHATSAPP_ACCESS_TOKEN: TOKEN }), createClient: (o: { accessToken: string; apiVersion: string }) => createWhatsAppClient({ ...o, fetch: f.fn }) } };
};

const meta = (o: Partial<MetaTemplate> = {}): MetaTemplate => ({
  id: "111", name: "summit_invite", language: "en_US", status: "APPROVED", category: "MARKETING", rejected_reason: "NONE",
  components: [{ type: "BODY", text: "Hi {{1}}" }],
  ...o,
});
const local = (o: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate => ({ id: "tpl_local", workspaceId: "she-power", name: "summit_invite", category: "MARKETING", language: "en_US", status: "draft", body: "Hi {{1}}", buttons: [], createdAt: "2026-11-01T00:00:00.000Z", ...o });
const ctx = { workspaceId: "she-power", wabaId: WABA, now: "2026-11-14T10:00:00.000Z", newId: () => "tpl_new" };

test("Meta status mapping fails closed", () => {
  assert.equal(mapMetaStatus("APPROVED"), "approved");
  assert.equal(mapMetaStatus("PENDING"), "pending");
  assert.equal(mapMetaStatus("IN_APPEAL"), "pending");
  assert.equal(mapMetaStatus("REJECTED"), "rejected");
  assert.equal(mapMetaStatus("PAUSED"), "paused");
  assert.equal(mapMetaStatus("DISABLED"), "disabled");
  for (const s of ["PENDING_DELETION", "DELETED", "LIMIT_EXCEEDED", "ARCHIVED", "SOMETHING_NEW"]) assert.equal(mapMetaStatus(s), "disabled");
});

test("parseMetaTemplate rejects malformed items", () => {
  assert.ok(parseMetaTemplate({ id: "1", name: "a", language: "en", status: "APPROVED" }));
  assert.equal(parseMetaTemplate({ id: "1", name: "a", language: "en" }), null);
  assert.equal(parseMetaTemplate({ id: "../x", name: "a", language: "en", status: "APPROVED" }), null);
  assert.equal(parseMetaTemplate(null), null);
});

test("components are converted, unsupported parts are flagged", () => {
  const c = contentFromMeta(meta({ components: [
    { type: "HEADER", format: "TEXT", text: "Hello" },
    { type: "BODY", text: "Body {{1}}" },
    { type: "FOOTER", text: "Reply STOP to opt out" },
    { type: "BUTTONS", buttons: [{ type: "URL", text: "Open", url: "https://e.com" }, { type: "QUICK_REPLY", text: "Yes" }, { type: "PHONE_NUMBER", text: "Call", phone_number: "+919800000000" }] },
  ] }));
  assert.deepEqual(c.header, { type: "text", text: "Hello" });
  assert.equal(c.body, "Body {{1}}");
  assert.equal(c.footer, "Reply STOP to opt out");
  assert.equal(c.buttons.length, 3);
  assert.equal(c.unsupportedReason, undefined);
  assert.match(contentFromMeta(meta({ components: [{ type: "BODY", text: "x" }, { type: "BUTTONS", buttons: [{ type: "COPY_CODE", text: "Copy" }] }] })).unsupportedReason ?? "", /copy code buttons/);
  assert.match(contentFromMeta(meta({ category: "AUTHENTICATION" })).unsupportedReason ?? "", /authentication/);
  assert.match(contentFromMeta(meta({ components: [{ type: "HEADER", format: "LOCATION" }] })).unsupportedReason ?? "", /location headers/);
});

test("sync updates an existing dashboard template instead of duplicating it", () => {
  const plan = planTemplateSync([local()], [meta()], ctx);
  assert.equal(plan.created, 0);
  assert.equal(plan.updated, 1);
  const [t] = plan.writes;
  assert.equal(t.id, "tpl_local");
  assert.equal(t.createdAt, "2026-11-01T00:00:00.000Z");
  assert.equal(t.status, "approved");
  assert.equal(t.metaTemplateId, "111");
  assert.equal(t.wabaId, WABA);
  assert.equal(t.workspaceId, "she-power");
  assert.equal(t.rejectedReason, undefined, "NONE is not a rejection reason");
});

test("sync matches by Meta id, creates new templates, and is idempotent", () => {
  const first = planTemplateSync([local({ metaTemplateId: "111", status: "pending", wabaId: WABA })], [meta(), meta({ id: "222", name: "welcome", status: "REJECTED", rejected_reason: "INVALID_FORMAT" })], ctx);
  assert.equal(first.updated, 1);
  assert.equal(first.created, 1);
  const created = first.writes.find((t) => t.name === "welcome")!;
  assert.equal(created.id, "tpl_new");
  assert.equal(created.status, "rejected");
  assert.equal(created.rejectedReason, "invalid format");
  const again = planTemplateSync(first.writes, [meta(), meta({ id: "222", name: "welcome", status: "REJECTED", rejected_reason: "INVALID_FORMAT" })], { ...ctx, now: "2026-11-15T00:00:00.000Z" });
  assert.equal(again.writes.length, 0);
  assert.equal(again.unchanged, 2);
});

test("status changes on Meta are picked up (approved → paused → disabled)", () => {
  const approved = planTemplateSync([], [meta()], ctx).writes;
  const paused = planTemplateSync(approved, [meta({ status: "PAUSED" })], ctx).writes;
  assert.equal(paused[0].status, "paused");
  const disabled = planTemplateSync(paused, [meta({ status: "DISABLED" })], ctx).writes;
  assert.equal(disabled[0].status, "disabled");
});

test("templates deleted in Meta become disabled; dashboard drafts are untouched", () => {
  const synced = local({ id: "tpl_old", name: "old_one", metaTemplateId: "999", status: "approved", wabaId: WABA });
  const draft = local({ id: "tpl_draft", name: "my_draft" });
  const plan = planTemplateSync([synced, draft], [], ctx);
  assert.equal(plan.missing, 1);
  assert.equal(plan.writes.length, 1);
  assert.equal(plan.writes[0].id, "tpl_old");
  assert.equal(plan.writes[0].status, "disabled");
  assert.equal(plan.writes[0].statusDetail, NOT_FOUND_DETAIL);
  assert.equal(planTemplateSync(plan.writes.concat(draft), [], ctx).writes.length, 0, "not rewritten every sync");
});

test("listTemplates follows every page and sends the token only in the header", async () => {
  const { f, deps: d } = deps([
    { status: 200, body: { data: [meta({ id: "1" })], paging: { cursors: { after: "CUR1" }, next: "https://graph.facebook.com/next" } } },
    { status: 200, body: { data: [meta({ id: "2", name: "b" })], paging: { cursors: { after: "CUR2" } } } },
  ]);
  const r = await fetchMetaTemplates(workspace(), d);
  assert.ok(r.ok);
  assert.equal(r.ok && r.templates.length, 2);
  assert.equal(r.ok && r.wabaId, WABA);
  assert.equal(f.calls.length, 2);
  assert.match(f.calls[0], new RegExp(`/v23\\.0/${WABA}/message_templates\\?`));
  assert.ok(!f.calls[0].includes("after="));
  assert.ok(f.calls[1].includes("after=CUR1"));
  assert.ok(f.calls.every((u) => !u.includes(TOKEN)));
});

test("listTemplates refuses partial or malformed results", async () => {
  const bad = await fetchMetaTemplates(workspace(), deps([{ status: 200, body: { data: [{ id: "1", name: "x" }] } }]).deps);
  assert.ok(!bad.ok);
  const pages = Array.from({ length: 3 }, (_, i) => ({ status: 200, body: { data: [meta({ id: String(i + 1) })], paging: { cursors: { after: `C${i}` }, next: "n" } } }));
  const f = fakeFetch(pages);
  await assert.rejects(createWhatsAppClient({ accessToken: TOKEN, apiVersion: "v23.0", fetch: f.fn }).listTemplates(WABA, 3), /without changes/);
  // a failing second page fails the whole sync
  const second = await fetchMetaTemplates(workspace(), deps([{ status: 200, body: { data: [meta()], paging: { cursors: { after: "C" }, next: "n" } } }, { status: 500, body: {} }]).deps);
  assert.ok(!second.ok);
});

test("expired token and missing setup produce safe messages", async () => {
  const expired = await fetchMetaTemplates(workspace(), deps([{ status: 401, body: { error: { code: 190, message: `token ${TOKEN} expired` } } }]).deps);
  assert.ok(!expired.ok);
  assert.match(!expired.ok ? expired.message : "", /invalid or expired.*System User token/);
  assert.ok(!(!expired.ok && expired.message.includes(TOKEN)));
  const perm = await fetchMetaTemplates(workspace(), deps([{ status: 403, body: { error: { code: 200 } } }]).deps);
  assert.match(!perm.ok ? perm.message : "", /whatsapp_business_management/);
  const noToken = await fetchMetaTemplates(workspace(), { provider: sharedTokenProvider({}), createClient: () => { throw new Error("must not call Meta"); } });
  assert.match(!noToken.ok ? noToken.message : "", /WHATSAPP_ACCESS_TOKEN/);
  const noWaba = await fetchMetaTemplates(workspace({ wabaId: "" }), { provider: sharedTokenProvider({ WHATSAPP_ACCESS_TOKEN: TOKEN }), createClient: () => { throw new Error("must not call Meta"); } });
  assert.ok(!noWaba.ok);
});

test("a template can only be sent through the WABA it was synced from", async () => {
  const approved = planTemplateSync([], [meta({ components: [{ type: "BODY", text: "Hello" }] })], ctx).writes[0];
  const send = async (ws: Workspace, t: WhatsAppTemplate) => {
    const f = fakeFetch([{ status: 200, body: { messages: [{ id: "wamid.1" }] } }]);
    const sender = createCloudSender(ws, { provider: sharedTokenProvider({ WHATSAPP_ACCESS_TOKEN: TOKEN }), createClient: (o) => createWhatsAppClient({ ...o, fetch: f.fn }), sleep: async () => {} });
    return { r: await sender.send({ to: "+919847012345", template: t, variables: [], buttonUrls: [] }), calls: f.calls.length };
  };
  assert.deepEqual((await send(workspace(), approved)).r, { ok: true, waMessageId: "wamid.1" });
  const other = await send(workspace({ wabaId: "5555555555", phoneNumberId: "4444444444" }, "jkg"), approved);
  assert.equal(other.r.ok, false);
  assert.equal(other.calls, 0, "never reaches Meta");
  for (const status of ["pending", "rejected", "paused", "disabled", "draft"] as const) {
    const blocked = await send(workspace(), { ...approved, status });
    assert.equal(blocked.r.ok, false, status);
    assert.equal(blocked.calls, 0);
  }
  const unsupported = await send(workspace(), { ...approved, unsupportedReason: "Not supported for sending yet: copy code buttons." });
  assert.equal(unsupported.r.ok, false);
});
