# WhatsApp Cloud API — Setup

This guide connects a workspace to the official WhatsApp Cloud API (Meta Graph API).
**Never paste access tokens or app secrets into code, docs, chats or GitHub.**

## What is implemented (Phase 2)

| Feature | Where |
|---|---|
| Graph API client (send, phone number details, WABA numbers) with timeouts | `src/lib/server/whatsapp/client.ts` |
| Meta error-code → retryable / permanent classification | `src/lib/server/whatsapp/errors.ts` |
| Text + approved-template payloads (body variables, language codes) | `src/lib/server/whatsapp/payloads.ts` |
| Credential providers (shared token; Secret Manager placeholder) | `src/lib/server/whatsapp/credentials.ts` |
| Real sender (`getSender`) with per-number throttling | `src/lib/server/sender.ts` |
| Connection verification | `src/lib/server/whatsapp/verify.ts`, `POST /api/workspaces/{id}/whatsapp/verify` |
| Test message (approved template by name) | `POST /api/workspaces/{id}/whatsapp/test-message` |
| Conversation replies inside the 24-hour window | `src/lib/server/conversations.ts` |
| Automation “Send template” actions (templates without variables) | `src/lib/server/automation-runner.ts` |

Not in this phase: webhooks (delivery/read/reply events), template submission/sync, media messages, dynamic URL buttons.

## 1. Meta prerequisites (manual)

1. **Meta Business verification** — Meta Business Suite → Security Center.
2. **WhatsApp Business Account (WABA)** in good standing — WhatsApp Manager → Overview (resolve any review/registration issue).
3. **Meta Developer App** (type *Business*) with the **WhatsApp** product added — developers.facebook.com.
4. **Phone number registered for the Cloud API** — WhatsApp Manager → Phone numbers. A number still on the On-Premises API fails verification.

## 2. System User access token

1. Meta Business Settings → **Users → System users** → *Add* (role: Admin).
2. **Add assets**: your app (*Full control*) and each WhatsApp Business Account used by your workspaces (*Full control*).
3. **Generate new token** → select the app → permissions:
   - `whatsapp_business_messaging` (send messages)
   - `whatsapp_business_management` (read numbers/templates)
4. Choose *Never* expiry if offered. Copy the token **once** into the environment variable below — never anywhere else.

## 3. Environment variables

| Variable | Required | Notes |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Yes | System User token (server only) |
| `META_API_VERSION` | Optional | e.g. `v23.0` (default) |
| `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | Phase 3 | Webhooks — not used yet |

**Local:** add to `.env.local` (git-ignored), restart `npm run dev`.
**Vercel:** Project → Settings → Environment Variables → add for **Production** (no quotes around values) → **Redeploy** (env changes only apply to new deployments).

## 4. Per-workspace IDs

In the dashboard: **WhatsApp Account** (for the selected workspace):
- **Phone Number ID** — Meta app → WhatsApp → API Setup (or WhatsApp Manager → Phone numbers → number → *Phone number ID*).
- **WhatsApp Business Account ID** — WhatsApp Manager → Account tools / Business settings → WhatsApp accounts.

Saving IDs does **not** connect the workspace.

## 5. Verify the connection

Click **Verify connection**. The server:
1. resolves the token (missing → **Missing credentials**),
2. fetches the phone number from Meta (invalid token/permissions/ID → **Verification failed**),
3. checks it is on the **Cloud API** platform,
4. checks the number belongs to the WABA you entered.

Only when all pass is the workspace set to **Connected**; sending (campaigns, replies, automations) is enabled only for connected workspaces. Changing the IDs resets the status.

## 6. Send a real test message

1. Verify the connection (status **Connected**).
2. Make sure the recipient’s WhatsApp number can receive messages from your business (for a test number in Meta’s sandbox, add it as an allowed recipient in API Setup).
3. In **WhatsApp Account → Send a test template**, enter the recipient in international format (e.g. `+9198…`), template `hello_world`, language `en_US` (Meta’s sample template, present in every WABA), and click **Send test**.
4. A success toast shows the WhatsApp message id = **accepted by Meta**. Delivery/read status will only be visible after the webhook phase.

Free-form text (conversation replies) only works within 24 hours of the customer’s last message (error 131047 otherwise). Outside that window, only approved templates can be sent.

## 7. Multi-workspace credentials

- **Same Meta Business for all clients:** one `WHATSAPP_ACCESS_TOKEN`; each workspace stores its own Phone Number ID and WABA ID. Add every WABA to the System User’s assets.
- **Clients in different Meta Businesses:** need separate tokens. The `secret_manager` credential source exists as an abstraction but **is not enabled** — it fails closed. To enable it: create secrets in Google Secret Manager (one per workspace), grant the server’s service account *Secret Manager Secret Accessor*, add the `@google-cloud/secret-manager` client, and implement `secretManagerProvider.resolve()`. Tokens must never be stored in Firestore.

## 8. Known limitations (this phase)

- Templates become sendable only when their status is `approved`, which is set exclusively by Meta template sync (Phase 7). Until then, campaigns can’t launch; use the test message to confirm connectivity.
- Template media headers, header variables and dynamic URL buttons are rejected with a clear error.
- Tracked links can’t be injected into static template URL buttons; tracking via templates needs dynamic URL buttons (planned with template sync).
- Throughput protection is per server instance (minimum 80 ms between sends per number); Meta rate-limit errors are classified as retryable.
- An automation run interrupted mid-send stays in `processing` (visible in history) rather than being retried, to avoid duplicate messages.
- No webhooks yet: sent messages stay at “sent” until Phase 3 delivers status events.
