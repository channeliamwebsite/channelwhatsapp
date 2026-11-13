/**
 * Funnel engine — pure functions used by the server (launch, stop, click
 * tracking) and by the future sending scheduler. No I/O, no clock reads: callers pass `now`.
 */
import { getIneligibleReason, ineligibleReasonLabel } from "@/lib/contacts/eligibility";
import type { Branch, Campaign } from "@/types/campaign";
import type { Contact } from "@/types/contact";
import type { ExitReason, FunnelStep, MessageRecord, RecipientProgress } from "@/types/funnel";
import type { WhatsAppTemplate } from "@/types/template";

export const BRANCHES: Branch[] = ["clicked", "read_not_clicked", "not_read", "replied", "failed"];

export const BRANCH_LABEL: Record<Branch, string> = {
  clicked: "Link clicked",
  read_not_clicked: "Read, not clicked",
  not_read: "No interaction",
  replied: "Replied",
  failed: "Delivery failed",
};

export const EXIT_LABEL: Record<ExitReason, string> = {
  replied: "Replied",
  opted_out: "Opted out",
  converted: "Converted",
  campaign_stopped: "Campaign stopped",
  no_further_message: "No further message",
  delivery_failed: "Delivery failed",
  not_eligible: "Not eligible",
};

/** Branches whose action is fixed to "exit": replies exit when exitOnReply is on. */
export const lockedExitBranches = (funnel: Pick<Campaign["funnel"], "exitOnReply">): Branch[] => (funnel.exitOnReply ? ["replied"] : []);

export const dedupeKey = (campaignId: string, contactId: string, step: FunnelStep) => `${campaignId}:${contactId}:${step}`;

export const addHours = (iso: string, hours: number) => new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();

/** Behaviour after a message. Precedence: replied > failed > clicked > read > not read. */
export function classifyBehaviour(message: MessageRecord, progress: RecipientProgress): Branch {
  if (progress.repliedAt && progress.repliedAt >= message.sentAt) return "replied";
  if (message.status === "failed") return "failed";
  if (message.clicks.length > 0) return "clicked";
  if (message.status === "read") return "read_not_clicked";
  return "not_read";
}

export type GuardResult = { ok: true } | { ok: false; reason: string };
const fail = (reason: string): GuardResult => ({ ok: false, reason });

/** Marketing consent: opted in, valid number AND a recorded source + date. */
export function checkConsent(contact: Contact): GuardResult {
  const reason = getIneligibleReason(contact);
  if (reason) return fail(ineligibleReasonLabel[reason]);
  if (!contact.consentSource || !contact.consentDate) return fail("No recorded consent");
  return { ok: true };
}

/** Every rule that must hold before a funnel message may be sent. */
export function checkSendGuards(args: {
  campaign: Campaign;
  contact: Contact | undefined;
  template: WhatsAppTemplate | undefined;
  progress: RecipientProgress;
  step: FunnelStep;
}): GuardResult {
  const { campaign, contact, template, progress, step } = args;
  if (campaign.status !== "running") return fail("Campaign is not running");
  if (progress.state !== "waiting") return fail("Recipient has left the funnel");
  if (!contact) return fail("Contact no longer exists");
  const consent = checkConsent(contact);
  if (!consent.ok) return consent;
  // Funnel messages are always templates, so they are allowed outside the
  // 24-hour customer service window. Free-form messages are never used here.
  if (!template) return fail("Template not found");
  if (template.status !== "approved") return fail("Template is not approved by Meta");
  if (progress.messages.some((m) => m.dedupeKey === dedupeKey(campaign.id, contact.id, step))) return fail("Message already sent");
  return { ok: true };
}

export type PlannedAction =
  | { type: "send"; step: FunnelStep; templateId: string; branch?: Branch }
  | { type: "exit"; reason: ExitReason }
  | { type: "complete" }
  | { type: "wait" }
  | { type: "none" };

/** Decide what happens next for one recipient at time `now`. */
export function planNextAction(progress: RecipientProgress, campaign: Campaign, now: string): PlannedAction {
  if (progress.state !== "waiting") return { type: "none" };
  if (progress.nextActionAt && progress.nextActionAt > now) return { type: "wait" };
  const f = campaign.funnel;
  if (progress.currentStep === 0) return { type: "send", step: 1, templateId: f.message1.templateId };
  if (progress.currentStep === 3) return { type: "complete" };

  const last = progress.messages[progress.messages.length - 1];
  // Never evaluate behaviour for a message the WhatsApp API hasn't accepted yet.
  if (last.status === "queued") return { type: "wait" };
  const branch = classifyBehaviour(last, progress);
  if (branch === "replied" && f.exitOnReply) return { type: "exit", reason: "replied" };
  const action = (progress.currentStep === 1 ? f.message2 : f.message3)[branch];
  if (action.type === "exit") return { type: "exit", reason: branch === "failed" ? "delivery_failed" : "no_further_message" };
  return { type: "send", step: (progress.currentStep + 1) as FunnelStep, templateId: action.templateId, branch };
}

export type FunnelEvent = { type: "reply" | "opt_out" | "conversion" | "campaign_stopped"; at: string };

/** Apply a recipient event. Exits take effect immediately. */
export function applyEvent(progress: RecipientProgress, event: FunnelEvent, campaign: Campaign): RecipientProgress {
  if (progress.state !== "waiting") {
    // Still record the facts for analytics, but never re-open the funnel.
    if (event.type === "reply" && !progress.repliedAt) return { ...progress, repliedAt: event.at };
    if (event.type === "conversion" && !progress.convertedAt) return { ...progress, convertedAt: event.at };
    return progress;
  }
  const exit = (reason: ExitReason, extra: Partial<RecipientProgress> = {}): RecipientProgress => ({
    ...progress, ...extra, state: "exited", exitReason: reason, nextActionAt: undefined,
  });
  switch (event.type) {
    case "reply":
      return campaign.funnel.exitOnReply ? exit("replied", { repliedAt: event.at }) : { ...progress, repliedAt: progress.repliedAt ?? event.at };
    case "opt_out":
      return exit("opted_out", { optedOutAt: event.at });
    case "conversion":
      return campaign.funnel.exitOnConversion ? exit("converted", { convertedAt: event.at }) : { ...progress, convertedAt: event.at };
    case "campaign_stopped":
      return exit("campaign_stopped");
  }
}

/** Hours to wait after sending `step` before evaluating behaviour. */
export function waitAfter(step: FunnelStep, campaign: Campaign) {
  return step === 1 ? campaign.funnel.wait1Hours : step === 2 ? campaign.funnel.wait2Hours : 24;
}

/** Unique contacts in any of the campaign's audience groups. */
export function audienceContacts(contacts: Contact[], groups: string[]) {
  return contacts.filter((c) => c.audienceGroups.some((g) => groups.includes(g)));
}
