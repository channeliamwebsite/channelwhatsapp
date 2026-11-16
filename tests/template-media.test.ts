import assert from "node:assert/strict";
import { test } from "node:test";

import { validateFunnel } from "@/lib/funnel/validate";
import { createCloudSender } from "@/lib/server/sender";
import { createWhatsAppClient, type FetchLike } from "@/lib/server/whatsapp/client";
import { sharedTokenProvider } from "@/lib/server/whatsapp/credentials";
import { headerMediaProblem, headerParameter, headerTypeForMime, linkProblem } from "@/lib/server/whatsapp/media-rules";
import { buildNamedTemplatePayload, buildTemplatePayload, PayloadError } from "@/lib/server/whatsapp/payloads";
import { planTemplateSync, type MetaTemplate } from "@/lib/server/whatsapp/template-sync-rules";
import type { FunnelDefinition } from "@/types/campaign";
import type { TemplateHeaderMedia, WhatsAppTemplate } from "@/types/template";
import type { Workspace } from "@/types/workspace";

const TOKEN = "EAAtest-secret-token-value";
const PHONE_ID = "1234567890";
const WABA = "9876543210";
const NOW = "2026-11-16T10:00:00.000Z";
const daysAgo = (d: number) => new Date(new Date(NOW).getTime() - d * 86_400_000).toISOString();
const upload = (o: Partial<Extract<TemplateHeaderMedia, { source: "upload" }>> = {}): TemplateHeaderMedia => ({ source: "upload", mediaId: "555000111", mimeType: "image/jpeg", filename: "banner.jpg", uploadedAt: daysAgo(1), phoneNumberId: PHONE_ID, ...o });
const imageTemplate = (o: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate => ({ id: "t1", name: "summit_banner", category: "MARKETING", language: "en", status: "approved", wabaId: WABA, metaTemplateId: "777", header: { type: "image" }, body: "Join us", buttons: [], headerMedia: upload(), ...o });
const workspace: Workspace = { id: "she-power", name: "W", initials: "W", industry: "", color: "#000", createdAt: "", whatsappAccount: { id: "", displayName: "", phoneNumber: "", status: "connected", qualityRating: "high", messagingLimit: "", phoneNumberId: PHONE_ID, wabaId: WABA } };

test("file types map to header types; unsupported ones are refused", () => {
  assert.equal(headerTypeForMime("image/jpeg"), "image");
  assert.equal(headerTypeForMime("image/png"), "image");
  assert.equal(headerTypeForMime("video/mp4"), "video");
  assert.equal(headerTypeForMime("application/pdf"), "document");
  assert.equal(headerTypeForMime("IMAGE/JPEG; charset=binary"), "image");
  assert.equal(headerTypeForMime("image/gif"), null);
  assert.equal(headerTypeForMime("application/zip"), null);
});

test("links must be public https", () => {
  assert.equal(linkProblem("https://cdn.example.com/a.jpg"), null);
  assert.match(linkProblem("http://cdn.example.com/a.jpg") ?? "", /https/);
  assert.match(linkProblem("https://localhost/a.jpg") ?? "", /publicly/);
  assert.match(linkProblem("https://192.168.1.4/a.jpg") ?? "", /publicly/);
  assert.match(linkProblem("not a url") ?? "", /valid URL/);
});

test("header media problems: missing, wrong type, other number, expired", () => {
  const ctx = { phoneNumberId: PHONE_ID, now: NOW };
  assert.equal(headerMediaProblem("image", upload(), ctx), null);
  assert.equal(headerMediaProblem("document", { source: "link", link: "https://e.com/x.pdf", filename: "x.pdf" }, ctx), null);
  assert.match(headerMediaProblem("image", undefined, ctx) ?? "", /Add header media/);
  assert.match(headerMediaProblem("video", upload(), ctx) ?? "", /not a valid video/);
  assert.match(headerMediaProblem("image", upload({ phoneNumberId: "999999999" }), ctx) ?? "", /different WhatsApp number/);
  assert.match(headerMediaProblem("image", upload({ uploadedAt: daysAgo(30) }), ctx) ?? "", /expired/);
  assert.equal(headerMediaProblem("image", upload({ uploadedAt: daysAgo(28) }), ctx), null);
});

test("payloads include the header component (id or link, filename for documents)", () => {
  const p = buildTemplatePayload("+919847012345", imageTemplate(), []);
  assert.deepEqual(p.template.components, [{ type: "header", parameters: [{ type: "image", image: { id: "555000111" } }] }]);
  const doc = buildTemplatePayload("+919847012345", imageTemplate({ header: { type: "document" }, body: "Hi {{1}}", headerMedia: { source: "link", link: "https://e.com/b.pdf", filename: "Brochure.pdf" } }), ["Asha"]);
  assert.deepEqual(doc.template.components, [
    { type: "header", parameters: [{ type: "document", document: { link: "https://e.com/b.pdf", filename: "Brochure.pdf" } }] },
    { type: "body", parameters: [{ type: "text", text: "Asha" }] },
  ]);
  assert.throws(() => buildTemplatePayload("+919847012345", imageTemplate({ headerMedia: undefined }), []), (e: unknown) => e instanceof PayloadError && /Add header media/.test(e.message));
  assert.deepEqual(headerParameter("video", { source: "link", link: "https://e.com/v.mp4" }), { type: "video", video: { link: "https://e.com/v.mp4" } });

  const test1 = buildNamedTemplatePayload("+919847012345", "kgdtis", "en", { type: "image", media: { source: "link", link: "https://e.com/a.png" } });
  assert.deepEqual(test1.template.components, [{ type: "header", parameters: [{ type: "image", image: { link: "https://e.com/a.png" } }] }]);
  assert.equal("components" in buildNamedTemplatePayload("+919847012345", "kgdtis", "en").template, false);
  assert.throws(() => buildNamedTemplatePayload("+919847012345", "kgdtis", "en", { type: "image", media: { source: "link", link: "http://e.com/a.png" } }), PayloadError);
});

test("sender refuses expired or other-number media without calling Meta", async () => {
  const send = async (t: WhatsAppTemplate) => {
    let calls = 0;
    const f: FetchLike = async () => { calls++; return { ok: true, status: 200, text: async () => JSON.stringify({ messages: [{ id: "wamid.1" }] }) }; };
    const sender = createCloudSender(workspace, { provider: sharedTokenProvider({ WHATSAPP_ACCESS_TOKEN: TOKEN }), createClient: (o) => createWhatsAppClient({ ...o, fetch: f }), sleep: async () => {} });
    return { r: await sender.send({ to: "+919847012345", template: t, variables: [], buttonUrls: [] }), calls };
  };
  const fresh = imageTemplate({ headerMedia: upload({ uploadedAt: new Date(Date.now() - 86_400_000).toISOString() }) });
  assert.deepEqual((await send(fresh)).r, { ok: true, waMessageId: "wamid.1" });
  for (const bad of [imageTemplate({ headerMedia: upload({ uploadedAt: "2026-01-01T00:00:00.000Z" }) }), imageTemplate({ headerMedia: upload({ phoneNumberId: "111111111" }) }), imageTemplate({ headerMedia: undefined })]) {
    const r = await send(bad);
    assert.equal(r.r.ok, false);
    assert.equal(r.calls, 0);
  }
});

test("campaigns can't launch with a media-header template that has no media", () => {
  const funnel = { message1: { templateId: "t1" }, message2: {}, message3: {}, wait1Hours: 24, wait2Hours: 24, exitOnReply: false, retry: { maxAttempts: 0, delayMinutes: 30 } } as unknown as FunnelDefinition;
  for (const b of ["clicked", "read_not_clicked", "not_read", "replied", "failed"]) {
    (funnel.message2 as Record<string, unknown>)[b] = { type: "exit" };
    (funnel.message3 as Record<string, unknown>)[b] = { type: "exit" };
  }
  assert.deepEqual(validateFunnel(funnel, [imageTemplate()]), []);
  assert.match(validateFunnel(funnel, [imageTemplate({ headerMedia: undefined })]).join(" "), /add header media/);
});

test("sync keeps header media, but drops it when Meta changes the header type", () => {
  const meta = (format: string): MetaTemplate => ({ id: "777", name: "summit_banner", language: "en", status: "APPROVED", category: "MARKETING", components: [{ type: "HEADER", format }, { type: "BODY", text: "Join us" }] });
  const ctx = { workspaceId: "she-power", wabaId: WABA, now: NOW, newId: () => "x" };
  const local = imageTemplate({ workspaceId: "she-power", metaStatus: "APPROVED" });
  const same = planTemplateSync([local], [meta("IMAGE")], ctx);
  assert.equal(same.writes.length, 0, "unchanged, media kept");
  const changed = planTemplateSync([local], [meta("VIDEO")], ctx);
  assert.equal(changed.writes[0].header?.type, "video");
  assert.equal(changed.writes[0].headerMedia, undefined);
});

test("media upload is multipart with the token only in the Authorization header", async () => {
  let seen: { url: string; headers: Record<string, string>; body?: string | FormData } | null = null;
  const f: FetchLike = async (url, init) => { seen = { url, headers: init.headers, body: init.body }; return { ok: true, status: 200, text: async () => JSON.stringify({ id: "999888777" }) }; };
  const id = await createWhatsAppClient({ accessToken: TOKEN, apiVersion: "v23.0", fetch: f }).uploadMedia(PHONE_ID, new Blob(["img"], { type: "image/png" }), "image/png", "a.png");
  assert.equal(id, "999888777");
  const s = seen as unknown as { url: string; headers: Record<string, string>; body: FormData };
  assert.match(s.url, new RegExp(`/v23\\.0/${PHONE_ID}/media$`));
  assert.ok(s.body instanceof FormData);
  assert.equal(s.body.get("messaging_product"), "whatsapp");
  assert.equal(s.body.get("type"), "image/png");
  assert.equal(s.headers["Content-Type"], undefined, "browser/undici sets the multipart boundary");
  assert.equal(s.headers.Authorization, `Bearer ${TOKEN}`);
  assert.ok(!s.url.includes(TOKEN));
});
