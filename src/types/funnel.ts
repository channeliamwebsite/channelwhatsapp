import type { Branch } from "./campaign";

export type FunnelStep = 1 | 2 | 3;
/** "queued" until the sending pipeline confirms the WhatsApp API accepted it. */
export type DeliveryStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export type MessageRecord = {
  step: FunnelStep;
  templateId: string;
  /** Behaviour that triggered this message (steps 2 and 3). */
  branch?: Branch;
  /** `${campaignId}:${contactId}:${step}` — a message is never sent twice. */
  dedupeKey: string;
  status: DeliveryStatus;
  /** WhatsApp message id from the Cloud API — links webhook events to this record. */
  waMessageId?: string;
  attempts?: number;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  failedReason?: string;
  clicks: { url: string; at: string }[];
};

export type RecipientState = "waiting" | "completed" | "exited";

export type ExitReason =
  | "replied"
  | "opted_out"
  | "converted"
  | "campaign_stopped"
  | "no_further_message"
  | "delivery_failed"
  | "not_eligible";

/** Per-recipient funnel progress — one document per contact per campaign. */
export type RecipientProgress = {
  id: string;
  campaignId: string;
  contactId: string;
  state: RecipientState;
  currentStep: 0 | FunnelStep;
  messages: MessageRecord[];
  workspaceId?: string;
  repliedAt?: string;
  convertedAt?: string;
  optedOutAt?: string;
  exitReason?: ExitReason;
  /** Detail for `not_eligible`, e.g. "Opted out". */
  exitDetail?: string;
  nextActionAt?: string;
};
