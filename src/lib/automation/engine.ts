/** Pure automation rules — shared by the UI (descriptions) and the server runner. */
import type { Automation, AutomationAction, AutomationCondition, AutomationTriggerType } from "@/types/automation";
import type { Contact } from "@/types/contact";

export const TRIGGER_LABEL: Record<AutomationTriggerType, string> = {
  contact_added: "Contact is added",
  message_read: "Campaign message is read",
  link_clicked: "Tracked link is clicked",
  contact_replied: "Contact replies",
  message_failed: "Message delivery fails",
  scheduled: "Scheduled time",
};

export type TriggerEvent = { type: AutomationTriggerType; contactId: string; campaignId?: string; at: string };

export function matchesTrigger(a: Automation, e: TriggerEvent) {
  if (!a.enabled || a.trigger.type !== e.type) return false;
  return !a.trigger.campaignId || a.trigger.campaignId === e.campaignId;
}

export function conditionHolds(c: AutomationCondition, contact: Contact) {
  const value = c.value.trim().toLowerCase();
  const actual =
    c.field === "optInStatus" ? [contact.optInStatus]
    : c.field === "group" ? contact.audienceGroups
    : c.field === "tag" ? contact.tags
    : [contact.customFields?.[c.key ?? ""] ?? ""];
  const hit = actual.some((x) => x.toLowerCase() === value);
  return c.operator === "is" ? hit : !hit;
}

export const conditionsHold = (a: Automation, contact: Contact) => a.conditions.every((c) => conditionHolds(c, contact));

/** Applies the contact-changing actions; returns the updated contact. */
export function applyContactActions(contact: Contact, actions: AutomationAction[]): Contact {
  let c = contact;
  for (const a of actions) {
    if (a.type === "add_tag" && !c.tags.includes(a.tag)) c = { ...c, tags: [...c.tags, a.tag] };
    if (a.type === "remove_tag") c = { ...c, tags: c.tags.filter((t) => t !== a.tag) };
    if (a.type === "add_to_group" && !c.audienceGroups.includes(a.group)) c = { ...c, audienceGroups: [...c.audienceGroups, a.group] };
    if (a.type === "remove_from_group") c = { ...c, audienceGroups: c.audienceGroups.filter((g) => g !== a.group) };
    if (a.type === "set_custom_field") c = { ...c, customFields: { ...c.customFields, [a.key]: a.value } };
  }
  return c;
}
