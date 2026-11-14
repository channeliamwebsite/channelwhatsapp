/** Fetch a workspace's message templates from Meta — SERVER ONLY. */
import type { Workspace } from "@/types/workspace";

import { createWhatsAppClient, type ClientOptions, type WhatsAppClient } from "./client";
import { credentialProviderFor, type CredentialProvider } from "./credentials";
import { WhatsAppApiError } from "./errors";
import type { MetaTemplate } from "./template-sync-rules";

export type TemplateFetchResult = { ok: true; wabaId: string; templates: MetaTemplate[] } | { ok: false; message: string };

export type TemplateFetchDeps = { provider: CredentialProvider; createClient: (options: ClientOptions) => WhatsAppClient };

/**
 * Uses THIS workspace's WABA ID and the server-side token. Never throws for
 * Meta/credential problems — returns a message safe to show the Super Admin.
 */
export async function fetchMetaTemplates(workspace: Workspace, deps: TemplateFetchDeps = { provider: credentialProviderFor(workspace), createClient: createWhatsAppClient }): Promise<TemplateFetchResult> {
  const creds = await deps.provider.resolve(workspace);
  if (!creds.ok) return { ok: false, message: creds.message };
  const { accessToken, apiVersion, wabaId } = creds.credentials;
  try {
    const templates = await deps.createClient({ accessToken, apiVersion }).listTemplates(wabaId);
    return { ok: true, wabaId, templates };
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      const hint = error.category === "auth"
        ? " Generate a new System User token and update WHATSAPP_ACCESS_TOKEN."
        : error.category === "permission" ? " The token needs whatsapp_business_management for this WhatsApp Business Account." : "";
      return { ok: false, message: `${error.message}${hint}` };
    }
    return { ok: false, message: "Unexpected error while fetching templates from Meta." };
  }
}
