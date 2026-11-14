/**
 * WhatsApp credential providers — SERVER ONLY.
 *
 * - "shared": one System User token (WHATSAPP_ACCESS_TOKEN) for every workspace
 *   whose WhatsApp Business Account belongs to the same Meta Business.
 * - "secret_manager": per-workspace tokens for clients in other Meta Businesses.
 *   Not enabled yet (requires Google Secret Manager setup — see docs/WHATSAPP_SETUP.md).
 *
 * Tokens are never stored in Firestore and never returned by any API route.
 * Phone Number ID and WABA ID are per workspace (workspace.whatsappAccount).
 */
import type { Workspace } from "@/types/workspace";

import { graphApiVersion, isMetaId } from "./config";

export type WhatsAppCredentials = { accessToken: string; phoneNumberId: string; wabaId: string; apiVersion: string; source: "shared" | "secret_manager" };

export type CredentialFailure = {
  ok: false;
  reason: "missing_access_token" | "missing_phone_number_id" | "missing_waba_id" | "provider_not_configured";
  message: string;
};
export type CredentialResult = { ok: true; credentials: WhatsAppCredentials } | CredentialFailure;

export interface CredentialProvider {
  readonly name: "shared" | "secret_manager";
  resolve(workspace: Workspace): Promise<CredentialResult>;
}

function ids(workspace: Workspace): CredentialFailure | { phoneNumberId: string; wabaId: string } {
  const a = workspace.whatsappAccount;
  if (!isMetaId(a.phoneNumberId)) return { ok: false, reason: "missing_phone_number_id", message: "Add this workspace’s Phone Number ID." };
  if (!isMetaId(a.wabaId)) return { ok: false, reason: "missing_waba_id", message: "Add this workspace’s WhatsApp Business Account ID." };
  return { phoneNumberId: a.phoneNumberId, wabaId: a.wabaId };
}

export function sharedTokenProvider(env: Record<string, string | undefined> = process.env): CredentialProvider {
  return {
    name: "shared",
    async resolve(workspace) {
      const token = env.WHATSAPP_ACCESS_TOKEN?.trim();
      if (!token) return { ok: false, reason: "missing_access_token", message: "WHATSAPP_ACCESS_TOKEN is not configured on the server." };
      const found = ids(workspace);
      if ("ok" in found) return found;
      return { ok: true, credentials: { accessToken: token, ...found, apiVersion: graphApiVersion(env), source: "shared" } };
    },
  };
}

/** Placeholder until Google Secret Manager is configured — fails closed, never falls back to insecure storage. */
export const secretManagerProvider: CredentialProvider = {
  name: "secret_manager",
  async resolve() {
    return { ok: false, reason: "provider_not_configured", message: "Per-workspace tokens (Secret Manager) are not set up yet. Use the shared token or complete the Secret Manager setup." };
  },
};

export function credentialProviderFor(workspace: Workspace): CredentialProvider {
  return workspace.whatsappAccount.credentialSource === "secret_manager" ? secretManagerProvider : sharedTokenProvider();
}
