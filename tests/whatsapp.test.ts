import assert from "node:assert/strict";
import { test } from "node:test";

import { createCloudSender, getSender } from "@/lib/server/sender";
import { createWhatsAppClient, type FetchLike } from "@/lib/server/whatsapp/client";
import { graphApiVersion } from "@/lib/server/whatsapp/config";
import { secretManagerProvider, sharedTokenProvider, type CredentialResult } from "@/lib/server/whatsapp/credentials";
import { classifyMetaError, WhatsAppApiError } from "@/lib/server/whatsapp/errors";
import { buildNamedTemplatePayload, buildTemplatePayload, buildTextPayload, PayloadError } from "@/lib/server/whatsapp/payloads";
import { checkWhatsAppConnection } from "@/lib/server/whatsapp/verify";
import type { WhatsAppTemplate } from "@/types/template";
import type { Workspace } from "@/types/workspace";

const TOKEN = "EAAtest-secret-token-value";
const workspace = (o: Partial<Workspace["whatsappAccount"]> = {}): Workspace => ({
  id: "w1", name: "W", initials: "W", industry: "", color: "#000000", createdAt: "",
  whatsappAccount: { id: "", displayName: "", phoneNumber: "", status: "connected", qualityRating: "high", messagingLimit: "", phoneNumberId: "1234567890", wabaId: "9876543210", ...o },
});
const template = (o: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate => ({ id: "t", name: "summit_invite", category: "MARKETING", language: "en_US", status: "approved", body: "Hi {{1}}, see you at {{2}}", buttons: [{ type: "url", text: "Open", url: "https://example.com" }], ...o });

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };
/** Fake fetch returning queued responses and recording calls. */
function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: Call[] = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, body: init.body });
    const r = responses.shift() ?? { status: 500, body: {} };
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => (typeof r.body === "string" ? r.body : JSON.stringify(r.body)) };
  };
  return { fn, calls };
}
const client = (responses: { status: number; body: unknown }[], timeoutMs?: number) => {
  const f = fakeFetch(responses);
  return { c: createWhatsAppClient({ accessToken: TOKEN, apiVersion: "v23.0", fetch: f.fn, timeoutMs }), calls: f.calls };
};

test("text payload: E.164 without +, trimmed body, validation", () => {
  assert.deepEqual(buildTextPayload("+91 98470 12345", "  Hello  "), { messaging_product: "whatsapp", recipient_type: "individual", to: "919847012345", type: "text", text: { body: "Hello", preview_url: false } });
  assert.throws(() => buildTextPayload("+919847012345", "   "), PayloadError);
  assert.throws(() => buildTextPayload("12", "Hi"), PayloadError);
  assert.throws(() => buildTextPayload("+919847012345", "x".repeat(4097)), PayloadError);
});

test("template payload: approved only, variables, language, unsupported parts", () => {
  const p = buildTemplatePayload("+919847012345", template(), ["Anita", "Kochi"]);
  assert.deepEqual(p.template, { name: "summit_invite", language: { code: "en_US" }, components: [{ type: "body", parameters: [{ type: "text", text: "Anita" }, { type: "text", text: "Kochi" }] }] });
  assert.equal(buildTemplatePayload("+919847012345", template({ body: "No variables" }), []).template.components, undefined);
  assert.throws(() => buildTemplatePayload("+919847012345", template({ status: "pending" }), ["a", "b"]), /not approved/);
  assert.throws(() => buildTemplatePayload("+919847012345", template({ status: "draft" }), ["a", "b"]), /not approved/);
  assert.throws(() => buildTemplatePayload("+919847012345", template(), ["Anita"]), /needs 2/);
  assert.throws(() => buildTemplatePayload("+919847012345", template(), ["Anita", "line\nbreak"]), PayloadError);
  assert.throws(() => buildTemplatePayload("+919847012345", template({ header: { type: "image" } }), ["a", "b"]), /Media headers/);
  assert.throws(() => buildTemplatePayload("+919847012345", template({ buttons: [{ type: "url", text: "Go", url: "https://x.com/{{1}}" }] }), ["a", "b"]), /Dynamic URL/);
  assert.equal(buildNamedTemplatePayload("+919847012345", "hello_world", "en_US").template.name, "hello_world");
  assert.throws(() => buildNamedTemplatePayload("+919847012345", "Hello World", "en_US"), PayloadError);
});

test("credentials: missing token / ids, Secret Manager fails closed, API version", async () => {
  assert.deepEqual((await sharedTokenProvider({}).resolve(workspace())) as { reason: string }, { ok: false, reason: "missing_access_token", message: "WHATSAPP_ACCESS_TOKEN is not configured on the server." });
  assert.equal(((await sharedTokenProvider({ WHATSAPP_ACCESS_TOKEN: TOKEN }).resolve(workspace({ phoneNumberId: "" }))) as { reason: string }).reason, "missing_phone_number_id");
  assert.equal(((await sharedTokenProvider({ WHATSAPP_ACCESS_TOKEN: TOKEN }).resolve(workspace({ wabaId: "abc" }))) as { reason: string }).reason, "missing_waba_id");
  const ok = await sharedTokenProvider({ WHATSAPP_ACCESS_TOKEN: TOKEN, META_API_VERSION: "v24.0" }).resolve(workspace());
  assert.equal(ok.ok && ok.credentials.apiVersion, "v24.0");
  assert.equal(((await secretManagerProvider.resolve(workspace())) as { reason: string }).reason, "provider_not_configured");
  assert.equal(graphApiVersion({ META_API_VERSION: "latest; rm -rf" }), "v23.0", "invalid version falls back");
});

test("client: successful send uses Bearer header, versioned URL, returns message id", async () => {
  const { c, calls } = client([{ status: 200, body: { messaging_product: "whatsapp", contacts: [{ wa_id: "919847012345" }], messages: [{ id: "wamid.ABC", message_status: "accepted" }] } }]);
  const res = await c.sendMessage("1234567890", { x: 1 });
  assert.deepEqual(res, { messageId: "wamid.ABC", waId: "919847012345", messageStatus: "accepted" });
  assert.equal(calls[0].url, "https://graph.facebook.com/v23.0/1234567890/messages");
  assert.equal(calls[0].headers.Authorization, `Bearer ${TOKEN}`);
  assert.ok(!calls[0].url.includes(TOKEN), "token never in URL");
});

test("client: invalid responses and invalid ids", async () => {
  await assert.rejects(client([{ status: 200, body: "<html>oops</html>" }]).c.sendMessage("1234567890", {}), (e: WhatsAppApiError) => e.category === "invalid_response");
  await assert.rejects(client([{ status: 200, body: { messages: [] } }]).c.sendMessage("1234567890", {}), (e: WhatsAppApiError) => e.category === "invalid_response");
  await assert.rejects(client([]).c.sendMessage("../me", {}), (e: WhatsAppApiError) => e.category === "invalid_request");
});

test("client: invalid credentials map to non-retryable auth error without leaking the token", async () => {
  const err = await client([{ status: 401, body: { error: { code: 190, message: `Invalid OAuth access token ${TOKEN}`, fbtrace_id: "trace" } } }]).c.getPhoneNumber("1234567890").catch((e) => e);
  assert.ok(err instanceof WhatsAppApiError);
  assert.equal(err.category, "auth");
  assert.equal(err.retryable, false);
  assert.ok(!err.message.includes(TOKEN), "Meta's raw message (which may echo input) is not propagated");
});

test("client: timeout becomes a retryable network error", async () => {
  const hanging: FetchLike = (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  const c = createWhatsAppClient({ accessToken: TOKEN, apiVersion: "v23.0", fetch: hanging, timeoutMs: 20 });
  await assert.rejects(c.sendMessage("1234567890", {}), (e: WhatsAppApiError) => e.category === "network" && e.retryable);
});

test("Meta error-code mapping", () => {
  const cases: [Parameters<typeof classifyMetaError>[0], string, boolean][] = [
    [{ code: 190 }, "auth", false],
    [{ code: 10 }, "permission", false],
    [{ code: 130429 }, "rate_limit", true],
    [{ code: 131056 }, "rate_limit", true],
    [{ code: 131000 }, "temporary", true],
    [{ code: 131026 }, "recipient", false],
    [{ code: 131047 }, "window", false],
    [{ code: 131049 }, "policy", false],
    [{ code: 132001 }, "template", false],
    [{ code: 133010 }, "account", false],
    [{ code: 100 }, "invalid_request", false],
    [{ status: 503 }, "temporary", true],
    [{ status: 429 }, "rate_limit", true],
    [{ status: 400, code: 999999 }, "invalid_request", false],
  ];
  for (const [input, category, retryable] of cases) {
    const r = classifyMetaError(input);
    assert.equal(r.category, category, JSON.stringify(input));
    assert.equal(r.retryable, retryable, JSON.stringify(input));
  }
});

test("sender: success, retryable and permanent failures, missing credentials, payload errors", async () => {
  const deps = (responses: { status: number; body: unknown }[], env: Record<string, string> = { WHATSAPP_ACCESS_TOKEN: TOKEN }) => ({
    provider: sharedTokenProvider(env),
    createClient: (o: { accessToken: string; apiVersion: string }) => createWhatsAppClient({ ...o, fetch: fakeFetch(responses).fn }),
    sleep: async () => {},
  });
  const msg = { to: "+919847012345", template: template(), variables: ["Anita", "Kochi"], buttonUrls: [] };
  assert.deepEqual(await createCloudSender(workspace(), deps([{ status: 200, body: { messages: [{ id: "wamid.OK" }] } }])).send(msg), { ok: true, waMessageId: "wamid.OK" });
  const retry = await createCloudSender(workspace(), deps([{ status: 400, body: { error: { code: 131056 } } }])).send(msg);
  assert.equal(!retry.ok && retry.retryable, true);
  const perm = await createCloudSender(workspace(), deps([{ status: 400, body: { error: { code: 131026 } } }])).send(msg);
  assert.equal(!perm.ok && perm.retryable, false);
  const window = await createCloudSender(workspace(), deps([{ status: 400, body: { error: { code: 131047 } } }])).sendText("+919847012345", "Hi");
  assert.equal(!window.ok && window.category, "window");
  const noToken = await createCloudSender(workspace(), deps([], {})).send(msg);
  assert.equal(!noToken.ok && noToken.retryable, false);
  const badTemplate = await createCloudSender(workspace(), deps([])).send({ ...msg, template: template({ status: "pending" }) });
  assert.equal(!badTemplate.ok && badTemplate.retryable, false, "unapproved template never reaches Meta");
});

test("getSender: no sender unless the workspace was verified as connected", () => {
  assert.equal(getSender(workspace({ status: "pending" })), null);
  assert.equal(getSender(workspace({ status: "disconnected" })), null);
  assert.notEqual(getSender(workspace({ status: "connected" })), null);
});

test("connection verification", async () => {
  const creds = (await sharedTokenProvider({ WHATSAPP_ACCESS_TOKEN: TOKEN }).resolve(workspace())) as CredentialResult;
  const make = (responses: { status: number; body: unknown }[]) => () => createWhatsAppClient({ accessToken: TOKEN, apiVersion: "v23.0", fetch: fakeFetch(responses).fn });
  const phone = { id: "1234567890", display_phone_number: "+91 98470 12345", verified_name: "Channeliam", platform_type: "CLOUD_API", quality_rating: "GREEN" };

  const ok = await checkWhatsAppConnection(creds, make([{ status: 200, body: phone }, { status: 200, body: { data: [{ id: "1234567890" }] } }]));
  assert.equal(ok.status, "connected");
  assert.equal(ok.phone?.verifiedName, "Channeliam");

  const missing = await checkWhatsAppConnection((await sharedTokenProvider({}).resolve(workspace())) as CredentialResult, make([]));
  assert.equal(missing.status, "missing_credentials");

  const badToken = await checkWhatsAppConnection(creds, make([{ status: 401, body: { error: { code: 190 } } }]));
  assert.equal(badToken.status, "verification_failed");
  assert.match(badToken.message, /WHATSAPP_ACCESS_TOKEN/);

  const onPrem = await checkWhatsAppConnection(creds, make([{ status: 200, body: { ...phone, platform_type: "ON_PREMISE" } }]));
  assert.equal(onPrem.status, "verification_failed");

  const wrongWaba = await checkWhatsAppConnection(creds, make([{ status: 200, body: phone }, { status: 200, body: { data: [{ id: "555555555" }] } }]));
  assert.equal(wrongWaba.status, "verification_failed");
  assert.match(wrongWaba.message, /does not belong/);
});
