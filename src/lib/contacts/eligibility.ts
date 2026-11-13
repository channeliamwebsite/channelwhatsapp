import type { Contact } from "@/types/contact";

import { isValidPhone } from "./phone";

export type IneligibleReason = "opted_out" | "pending_consent" | "invalid_phone";

/**
 * A contact may receive campaign messages ONLY when they have opted in and
 * have a valid WhatsApp number. Opted-out contacts are never eligible.
 */
export function getIneligibleReason(contact: Contact): IneligibleReason | null {
  if (contact.optInStatus === "opted_out") return "opted_out";
  if (contact.optInStatus !== "opted_in") return "pending_consent";
  if (!isValidPhone(contact.phone)) return "invalid_phone";
  return null;
}

export function isCampaignEligible(contact: Contact) {
  return getIneligibleReason(contact) === null;
}

export const ineligibleReasonLabel: Record<IneligibleReason, string> = {
  opted_out: "Opted out",
  pending_consent: "Consent pending",
  invalid_phone: "Invalid number",
};

export function splitByEligibility(contacts: Contact[]) {
  const eligible: Contact[] = [];
  const excluded: { contact: Contact; reason: IneligibleReason }[] = [];
  for (const contact of contacts) {
    const reason = getIneligibleReason(contact);
    if (reason) excluded.push({ contact, reason });
    else eligible.push(contact);
  }
  return { eligible, excluded };
}
