import assert from "node:assert/strict";
import { test } from "node:test";

import { createWhatsAppClient, type FetchLike } from "@/lib/server/whatsapp/client";
import { classifyMetaError, safeMetaDetails, WhatsAppApiError } from "@/lib/server/whatsapp/errors";

const TOKEN = "EAAtest-secret-token-value";

test("each template and account error code names its own cause", () => {
  assert.match(classifyMetaError({ code: 132001 }).message, /doesn't exist in this language.*code 132001/);
  assert.match(classifyMetaError({ code: 132000 }).message, /number of variables.*code 132000/);
  assert.match(classifyMetaError({ code: 132015 }).message, /paused/);
  assert.match(classifyMetaError({ code: 132016 }).message, /disabled/);
  assert.match(classifyMetaError({ code: 131042 }).message, /Payment issue.*Billing & payments/);
  assert.match(classifyMetaError({ code: 131031 }).message, /locked/);
  assert.match(classifyMetaError({ code: 133010 }).message, /not registered/);
  for (const code of [132000, 132001, 132005, 132007, 132012, 132015, 132016, 132068, 132069]) assert.equal(classifyMetaError({ code }).category, "template", String(code));
  for (const code of [368, 131031, 131042, 131045, 133005, 133006, 133010]) assert.equal(classifyMetaError({ code }).category, "account", String(code));
});

test("Meta details are sanitised: no numbers, tokens or control characters, capped length", () => {
  assert.equal(safeMetaDetails("template name (hello_world) does not exist in en_US"), "template name (hello_world) does not exist in en_US");
  assert.equal(safeMetaDetails("Recipient +91 98470 12345 is invalid"), "Recipient [number] is invalid");
  assert.equal(safeMetaDetails(`bad token EAAabcdefghijklmnop123 here`), "bad token [redacted] here");
  assert.equal(safeMetaDetails("line1\nline2\u0000"), "line1 line2");
  assert.equal(safeMetaDetails(42), undefined);
  assert.equal(safeMetaDetails("   "), undefined);
  assert.ok((safeMetaDetails("x".repeat(1000)) ?? "").length <= 240);
});

test("template errors carry Meta's explanation; other categories don't", async () => {
  const f: FetchLike = async () => ({ ok: false, status: 404, text: async () => JSON.stringify({ error: { code: 132001, message: "(#132001) Template name does not exist in the translation", error_data: { details: "template name (hello_world) does not exist in en_US" } } }) });
  const c = createWhatsAppClient({ accessToken: TOKEN, apiVersion: "v23.0", fetch: f });
  const err = await c.sendMessage("1234567890", {}).catch((e) => e);
  assert.ok(err instanceof WhatsAppApiError);
  assert.equal(err.code, 132001);
  assert.match(err.message, /doesn't exist in this language.*Meta: “template name \(hello_world\) does not exist in en_US”/);
  assert.ok(!err.message.includes(TOKEN));

  const auth = new WhatsAppApiError({ ...classifyMetaError({ code: 131042 }), details: "Payment method missing" });
  assert.ok(!auth.message.includes("Meta:"), "account errors keep their own guidance only");
  assert.equal(auth.details, "Payment method missing");
});
