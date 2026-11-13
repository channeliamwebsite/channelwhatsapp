/** "running" is shown as Active and "stopped" as Cancelled. */
export type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "stopped" | "failed";

/** Recipient behaviour after a message, used to choose the next step. */
export type Branch = "clicked" | "read_not_clicked" | "not_read" | "replied" | "failed";

export type BranchAction = { type: "send"; templateId: string } | { type: "exit" };

export type FunnelDefinition = {
  message1: { templateId: string };
  /** Hours to wait after Message 1 before evaluating behaviour. */
  wait1Hours: number;
  message2: Record<Branch, BranchAction>;
  wait2Hours: number;
  /** Chosen by the recipient's behaviour after Message 2. */
  message3: Record<Branch, BranchAction>;
  exitOnConversion: boolean;
  /** When false, a reply follows the "replied" branch instead of exiting. */
  exitOnReply: boolean;
  /** Retries for retryable send failures before the message counts as failed. */
  retry: { maxAttempts: number; delayMinutes: number };
};

/** What fills a template placeholder ({{1}}, {{2}} …) for each recipient. */
export type VariableSource =
  | { type: "field"; field: "firstName" | "fullName" | "organisation" | "city" | "country" | "designation" }
  | { type: "custom"; key: string }
  | { type: "static"; value: string };

export type ConversionGoal = { type: "link_click"; url: string } | { type: "reply" } | { type: "none" };

export type Campaign = {
  id: string;
  workspaceId?: string;
  name: string;
  description: string;
  objective?: string;
  status: CampaignStatus;
  audienceGroups: string[];
  /** Saved segments combined (OR) with the groups. */
  segmentIds?: string[];
  /** Placeholder values, in order, applied to every funnel template. */
  variables?: VariableSource[];
  /** Rewrite template URL buttons to signed tracked links. */
  trackLinks?: boolean;
  whatsappAccountId: string;
  funnel: FunnelDefinition;
  conversionGoal: ConversionGoal;
  createdAt: string;
  scheduledAt?: string;
  launchedAt?: string;
};
