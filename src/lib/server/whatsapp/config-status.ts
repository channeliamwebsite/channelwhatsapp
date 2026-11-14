/**
 * WhatsApp server configuration diagnostics — SERVER ONLY.
 * Reports whether each variable is present (and well-formed) WITHOUT ever
 * returning secret values. Only the non-secret Meta object IDs are returned.
 */
import { graphApiVersion, isMetaId } from "./config";

type Env = Record<string, string | undefined>;

export type EnvVariableStatus = { name: string; present: boolean; valid: boolean; secret: boolean; required: boolean; purpose: string };

const VARIABLES: { name: string; secret: boolean; required: boolean; purpose: string; validate?: (v: string) => boolean }[] = [
  { name: "WHATSAPP_ACCESS_TOKEN", secret: true, required: true, purpose: "System User token used for every Graph API call" },
  { name: "META_APP_SECRET", secret: true, required: true, purpose: "Checks the X-Hub-Signature-256 of incoming webhooks" },
  { name: "WHATSAPP_VERIFY_TOKEN", secret: true, required: true, purpose: "Answers Meta’s webhook verification request" },
  { name: "WHATSAPP_BUSINESS_ACCOUNT_ID", secret: false, required: false, purpose: "Optional: WABA ID offered for import into a workspace", validate: (v) => isMetaId(v) },
  { name: "WHATSAPP_PHONE_NUMBER_ID", secret: false, required: false, purpose: "Optional: Phone Number ID offered for import into a workspace", validate: (v) => isMetaId(v) },
  { name: "META_APP_ID", secret: false, required: false, purpose: "Optional: identifies this app when checking the WABA’s webhook subscription", validate: (v) => isMetaId(v) },
  { name: "META_API_VERSION", secret: false, required: false, purpose: "Optional: Graph API version (default used when unset)", validate: (v) => /^v\d{1,3}\.\d{1,2}$/.test(v.trim()) },
];

export function whatsappConfigStatus(env: Env = process.env) {
  const variables: EnvVariableStatus[] = VARIABLES.map((v) => {
    const value = env[v.name]?.trim() ?? "";
    return { name: v.name, present: value.length > 0, valid: value.length > 0 && (v.validate ? v.validate(value) : true), secret: v.secret, required: v.required, purpose: v.purpose };
  });
  return {
    variables,
    ready: variables.filter((v) => v.required).every((v) => v.valid),
    apiVersion: graphApiVersion(env),
    serverIds: serverWhatsAppIds(env),
  };
}

/** Non-secret IDs configured on the server, only when BOTH are valid. */
export function serverWhatsAppIds(env: Env = process.env): { wabaId: string; phoneNumberId: string } | null {
  const wabaId = env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  return isMetaId(wabaId) && isMetaId(phoneNumberId) ? { wabaId, phoneNumberId } : null;
}

export function metaAppId(env: Env = process.env) {
  const id = env.META_APP_ID?.trim();
  return isMetaId(id) ? id : undefined;
}
