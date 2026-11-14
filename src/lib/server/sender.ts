/** Outbound WhatsApp sending — SERVER ONLY. */
import type { WhatsAppTemplate } from "@/types/template";
import type { Workspace } from "@/types/workspace";

import { createWhatsAppClient, type ClientOptions, type WhatsAppClient } from "./whatsapp/client";
import { credentialProviderFor, type CredentialProvider } from "./whatsapp/credentials";
import { WhatsAppApiError, type ErrorCategory } from "./whatsapp/errors";
import { buildTemplatePayload, buildTextPayload, PayloadError } from "./whatsapp/payloads";

/** `buttonUrls` is kept for compatibility; static URL buttons need no parameters. */
export type OutboundMessage = { to: string; template: WhatsAppTemplate; variables: string[]; buttonUrls: string[] };
export type SendResult = { ok: true; waMessageId: string } | { ok: false; retryable: boolean; error: string; category?: ErrorCategory };

export interface MessageSender {
  /** Approved template message (allowed outside the 24-hour window). */
  send(message: OutboundMessage): Promise<SendResult>;
  /** Free-form text — only valid inside the 24-hour customer service window. */
  sendText(to: string, body: string): Promise<SendResult>;
}

/** Basic outbound throughput protection: minimum spacing per phone number, per server instance. */
export const MIN_SEND_INTERVAL_MS = 80;
const nextSlot = new Map<string, number>();
async function throttle(phoneNumberId: string, sleep: (ms: number) => Promise<void>) {
  const now = Date.now();
  const slot = Math.max(now, nextSlot.get(phoneNumberId) ?? 0);
  nextSlot.set(phoneNumberId, slot + MIN_SEND_INTERVAL_MS);
  if (slot > now) await sleep(slot - now);
}

export type SenderDeps = {
  provider: CredentialProvider;
  createClient: (options: ClientOptions) => WhatsAppClient;
  sleep: (ms: number) => Promise<void>;
};

export function createCloudSender(workspace: Workspace, deps: SenderDeps): MessageSender {
  async function deliver(build: (wabaId: string) => object): Promise<SendResult> {
    const creds = await deps.provider.resolve(workspace);
    if (!creds.ok) return { ok: false, retryable: false, error: creds.message, category: "auth" };
    let payload: object;
    try {
      payload = build(creds.credentials.wabaId);
    } catch (error) {
      if (error instanceof PayloadError) return { ok: false, retryable: false, error: error.message, category: "invalid_request" };
      throw error;
    }
    try {
      await throttle(creds.credentials.phoneNumberId, deps.sleep);
      const client = deps.createClient({ accessToken: creds.credentials.accessToken, apiVersion: creds.credentials.apiVersion });
      const res = await client.sendMessage(creds.credentials.phoneNumberId, payload);
      return { ok: true, waMessageId: res.messageId };
    } catch (error) {
      if (error instanceof WhatsAppApiError) return { ok: false, retryable: error.retryable, error: error.message, category: error.category };
      return { ok: false, retryable: true, error: "Unexpected error while sending.", category: "unknown" };
    }
  }
  return {
    send: (m) => deliver((wabaId) => {
      // Approved status is only meaningful for the WABA the template was synced from.
      if (m.template.wabaId !== wabaId) throw new PayloadError(`Template “${m.template.name}” was not synced from this workspace’s WhatsApp Business Account. Sync templates from Meta.`);
      return buildTemplatePayload(m.to, m.template, m.variables);
    }),
    sendText: (to, body) => deliver(() => buildTextPayload(to, body)),
  };
}

const defaultDeps = (workspace: Workspace): SenderDeps => ({
  provider: credentialProviderFor(workspace),
  createClient: createWhatsAppClient,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
});

/**
 * The Cloud API sender for a workspace — only after a successful server-side
 * verification ("connected"). Entering IDs alone never enables sending.
 */
export function getSender(workspace: Workspace): MessageSender | null {
  if (workspace.whatsappAccount.status !== "connected") return null;
  return createCloudSender(workspace, defaultDeps(workspace));
}
