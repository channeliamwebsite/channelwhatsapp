/** WhatsApp connection verification against Meta — SERVER ONLY. */
import type { CredentialResult } from "./credentials";
import type { PhoneNumberInfo, WhatsAppClient } from "./client";
import { WhatsAppApiError } from "./errors";

export type VerificationCheck = { key: "permissions" | "phone_number" | "waba" | "webhook"; label: string; ok: boolean | null; detail: string };

/** Webhook subscription of the WABA: true = our app subscribed, false = not, null = couldn't tell. */
export type WebhookSubscription = { subscribed: boolean | null; apps: string[]; detail: string };

export type VerificationResult =
  | { status: "connected"; message: string; phone: PhoneNumberInfo; checks: VerificationCheck[]; webhook: WebhookSubscription }
  | { status: "missing_credentials" | "verification_failed"; message: string; phone?: PhoneNumberInfo; checks: VerificationCheck[]; webhook?: WebhookSubscription };

export const REQUIRED_PERMISSIONS = ["whatsapp_business_messaging", "whatsapp_business_management"] as const;

const ASSET_HINT = "In Business Settings → Users → System users, assign this WhatsApp Business Account to the System User (full control) and regenerate the token.";

/** Human-readable failure for a Meta error at a given step. Never includes the token. */
export function explainVerificationError(error: unknown, step: "permissions" | "phone_number" | "waba" | "webhook"): string {
  if (!(error instanceof WhatsAppApiError)) return "Unexpected error while contacting Meta.";
  if (error.category === "auth") return `${error.message} Generate a new System User token and update WHATSAPP_ACCESS_TOKEN in Vercel, then redeploy.`;
  if (error.category === "permission") return `${error.message} The token needs whatsapp_business_messaging and whatsapp_business_management. ${ASSET_HINT}`;
  if (error.category === "not_found") {
    if (step === "phone_number") return `Phone Number ID not found, or the System User has no access to it. Check the ID in WhatsApp Manager → Phone numbers. ${ASSET_HINT}`;
    if (step === "waba") return `WhatsApp Business Account ID not found, or the System User has no access to it. ${ASSET_HINT}`;
  }
  if (error.category === "invalid_request" && step === "phone_number") return `Meta rejected the Phone Number ID. ${error.message}`;
  if (error.category === "invalid_request" && step === "waba") return `Meta rejected the WhatsApp Business Account ID. ${error.message}`;
  return error.message;
}

/**
 * Verification (unit tested). The workspace is "connected" only when Meta confirms:
 *  1. the token works and is not missing a required permission,
 *  2. the Phone Number ID exists, is accessible and is on the Cloud API,
 *  3. the WABA is accessible and the number belongs to it.
 * The webhook subscription is reported but does not affect "connected".
 */
export async function checkWhatsAppConnection(
  creds: CredentialResult,
  makeClient: (token: string, apiVersion: string) => WhatsAppClient,
  options: { appId?: string } = {},
): Promise<VerificationResult> {
  const checks: VerificationCheck[] = [];
  if (!creds.ok) return { status: "missing_credentials", message: creds.message, checks };
  const { accessToken, apiVersion, phoneNumberId, wabaId } = creds.credentials;
  const client = makeClient(accessToken, apiVersion);
  const fail = (message: string, phone?: PhoneNumberInfo): VerificationResult => ({ status: "verification_failed", message, phone, checks });

  // 1. Permissions (informational if Meta won't list them — steps 2–3 prove access directly).
  try {
    const granted = await client.getTokenPermissions();
    const missing = REQUIRED_PERMISSIONS.filter((p) => !granted.includes(p));
    checks.push({ key: "permissions", label: "Token permissions", ok: missing.length === 0, detail: missing.length ? `Missing: ${missing.join(", ")}` : REQUIRED_PERMISSIONS.join(", ") });
    if (missing.length) return fail(`The access token is missing ${missing.join(" and ")}. Regenerate the System User token with both WhatsApp permissions.`);
  } catch (error) {
    if (error instanceof WhatsAppApiError && error.category === "auth") {
      const message = explainVerificationError(error, "permissions");
      checks.push({ key: "permissions", label: "Token permissions", ok: false, detail: message });
      return fail(message);
    }
    checks.push({ key: "permissions", label: "Token permissions", ok: null, detail: "Meta did not list the token’s permissions; access is checked directly below." });
  }

  // 2. Phone number.
  let phone: PhoneNumberInfo;
  try {
    phone = await client.getPhoneNumber(phoneNumberId);
  } catch (error) {
    const message = explainVerificationError(error, "phone_number");
    checks.push({ key: "phone_number", label: "Phone Number ID", ok: false, detail: message });
    return fail(message);
  }
  if (phone.platformType && phone.platformType !== "CLOUD_API") {
    const message = `This number is not registered for the Cloud API (platform: ${phone.platformType}). Register it in WhatsApp Manager.`;
    checks.push({ key: "phone_number", label: "Phone Number ID", ok: false, detail: message });
    return fail(message, phone);
  }
  checks.push({ key: "phone_number", label: "Phone Number ID", ok: true, detail: `${phone.displayPhoneNumber ?? phoneNumberId}${phone.verifiedName ? ` · ${phone.verifiedName}` : ""}${phone.status ? ` · ${phone.status}` : ""}` });

  // 3. WABA access + ownership.
  try {
    const ids = await client.listPhoneNumberIds(wabaId);
    if (!ids.includes(phoneNumberId)) {
      const message = "This Phone Number ID does not belong to the WhatsApp Business Account ID you entered.";
      checks.push({ key: "waba", label: "WhatsApp Business Account", ok: false, detail: message });
      return fail(message, phone);
    }
    checks.push({ key: "waba", label: "WhatsApp Business Account", ok: true, detail: `Number belongs to WABA ${wabaId} (${ids.length} number${ids.length === 1 ? "" : "s"} accessible)` });
  } catch (error) {
    const message = explainVerificationError(error, "waba");
    checks.push({ key: "waba", label: "WhatsApp Business Account", ok: false, detail: message });
    return fail(message, phone);
  }

  // 4. Webhook subscription (reported only).
  let webhook: WebhookSubscription;
  try {
    const apps = await client.getSubscribedApps(wabaId);
    const names = apps.map((a) => a.name ?? a.id ?? "unknown app");
    const subscribed = options.appId ? apps.some((a) => a.id === options.appId) : apps.length > 0;
    webhook = {
      subscribed,
      apps: names,
      detail: subscribed
        ? `Subscribed: ${names.join(", ")}`
        : apps.length ? `This app is not subscribed (subscribed: ${names.join(", ")}).` : "No app is subscribed to this WABA’s webhooks.",
    };
  } catch (error) {
    webhook = { subscribed: null, apps: [], detail: `Could not read webhook subscriptions: ${explainVerificationError(error, "webhook")}` };
  }
  checks.push({ key: "webhook", label: "Webhook subscription", ok: webhook.subscribed, detail: webhook.detail });

  return { status: "connected", phone, checks, webhook, message: `Verified ${phone.displayPhoneNumber ?? phoneNumberId}${phone.verifiedName ? ` (${phone.verifiedName})` : ""}.` };
}
