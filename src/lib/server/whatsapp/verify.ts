/** WhatsApp connection verification against Meta — SERVER ONLY. */
import type { CredentialResult } from "./credentials";
import type { PhoneNumberInfo, WhatsAppClient } from "./client";
import { WhatsAppApiError } from "./errors";

export type VerificationResult =
  | { status: "connected"; message: string; phone: PhoneNumberInfo }
  | { status: "missing_credentials" | "verification_failed"; message: string; phone?: PhoneNumberInfo };

/**
 * Pure verification logic (unit tested): token + Phone Number ID valid,
 * number registered for Cloud API, and the number belongs to the WABA.
 */
export async function checkWhatsAppConnection(creds: CredentialResult, makeClient: (token: string, apiVersion: string) => WhatsAppClient): Promise<VerificationResult> {
  if (!creds.ok) return { status: "missing_credentials", message: creds.message };
  const { accessToken, apiVersion, phoneNumberId, wabaId } = creds.credentials;
  const client = makeClient(accessToken, apiVersion);
  try {
    const phone = await client.getPhoneNumber(phoneNumberId);
    if (phone.platformType && phone.platformType !== "CLOUD_API") {
      return { status: "verification_failed", phone, message: `This number is not registered for the Cloud API (platform: ${phone.platformType}). Register it in WhatsApp Manager.` };
    }
    const ids = await client.listPhoneNumberIds(wabaId);
    if (!ids.includes(phoneNumberId)) {
      return { status: "verification_failed", phone, message: "This Phone Number ID does not belong to the WhatsApp Business Account ID you entered." };
    }
    return { status: "connected", phone, message: `Verified ${phone.displayPhoneNumber ?? phoneNumberId}${phone.verifiedName ? ` (${phone.verifiedName})` : ""}.` };
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      const hint = error.category === "auth" ? " Check WHATSAPP_ACCESS_TOKEN." : error.category === "permission" ? " The System User needs whatsapp_business_messaging and whatsapp_business_management." : "";
      return { status: "verification_failed", message: `${error.message}${hint}` };
    }
    return { status: "verification_failed", message: "Unexpected error while contacting Meta." };
  }
}
