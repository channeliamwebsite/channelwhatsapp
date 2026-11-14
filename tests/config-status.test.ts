import assert from "node:assert/strict";
import { test } from "node:test";

import { metaAppId, serverWhatsAppIds, whatsappConfigStatus } from "@/lib/server/whatsapp/config-status";
import { processWebhookBatches, type WebhookStore } from "@/lib/server/whatsapp/webhook";

const SECRET = "EAAsecret-token-value-123";

test("config diagnostics never return secret values", () => {
  const s = whatsappConfigStatus({ WHATSAPP_ACCESS_TOKEN: SECRET, META_APP_SECRET: "app-secret-xyz", WHATSAPP_VERIFY_TOKEN: "verify-abc", WHATSAPP_BUSINESS_ACCOUNT_ID: "1000000000000001", WHATSAPP_PHONE_NUMBER_ID: "123456789012345" });
  const json = JSON.stringify(s);
  for (const secret of [SECRET, "app-secret-xyz", "verify-abc"]) assert.ok(!json.includes(secret));
  assert.equal(s.ready, true);
  assert.deepEqual(s.serverIds, { wabaId: "1000000000000001", phoneNumberId: "123456789012345" });
  assert.equal(s.variables.find((v) => v.name === "WHATSAPP_ACCESS_TOKEN")?.present, true);
});

test("config diagnostics report missing and malformed variables", () => {
  const s = whatsappConfigStatus({ WHATSAPP_ACCESS_TOKEN: "  ", WHATSAPP_BUSINESS_ACCOUNT_ID: "not-an-id", WHATSAPP_PHONE_NUMBER_ID: "123456789" });
  assert.equal(s.ready, false);
  assert.equal(s.variables.find((v) => v.name === "WHATSAPP_ACCESS_TOKEN")?.present, false);
  assert.equal(s.variables.find((v) => v.name === "WHATSAPP_BUSINESS_ACCOUNT_ID")?.valid, false);
  assert.equal(s.serverIds, null, "import needs both IDs valid");
  assert.equal(serverWhatsAppIds({ WHATSAPP_BUSINESS_ACCOUNT_ID: "123456", WHATSAPP_PHONE_NUMBER_ID: "../x" }), null);
  assert.equal(metaAppId({ META_APP_ID: "abc" }), undefined);
  assert.equal(metaAppId({ META_APP_ID: " 1000000000000002 " }), "1000000000000002");
});

test("webhook marks only the workspace that owns the number as receiving events", async () => {
  const marked: string[] = [];
  const store: WebhookStore = {
    findWorkspaceIdByPhoneNumberId: async (id) => (id === "111111" ? "she-power" : null),
    ingestInbound: async () => ({ contactId: "c1", conversationId: "v1", duplicate: false }),
    optOutContact: async () => {},
    lookupWaMessage: async () => null,
    applyConversationStatus: async () => {},
    ingestFunnelEvent: async () => {},
    activeCampaignIds: async () => [],
    markWebhookReceived: async (w) => { marked.push(w); },
  };
  const summary = await processWebhookBatches([
    { phoneNumberId: "111111", inbound: [], statuses: [] },
    { phoneNumberId: "999999", inbound: [], statuses: [] },
  ] as unknown as Parameters<typeof processWebhookBatches>[0], store);
  assert.deepEqual(marked, ["she-power"]);
  assert.equal(summary.unknownNumbers, 0);
});
