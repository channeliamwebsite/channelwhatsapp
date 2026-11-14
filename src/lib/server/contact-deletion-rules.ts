/** Pure rules for contact deletion (unit tested). */
/** Workspace subcollections whose documents carry a `contactId` field. */
export const CONTACT_LINKED_COLLECTIONS = [
  "recipients",     // funnel progress per campaign
  "messages",       // conversation messages
  "conversations",  // conversation threads
  "clicks",         // tracked-link clicks
  "events",         // funnel event idempotency records
  "automationRuns", // automation execution history
  "activity",       // activity log entries about the contact
  "waMessages",     // WhatsApp message-id correlation
] as const;

/** Duplicate-send claims are keyed `${campaignId}:${contactId}:${step}#${attempt}`. */
export function sendClaimBelongsTo(docId: string, contactId: string) {
  return docId.split("#")[0].split(":")[1] === contactId;
}
