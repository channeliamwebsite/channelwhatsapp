export type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "stopped";

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
};

export type ConversionGoal = { type: "link_click"; url: string } | { type: "reply" } | { type: "none" };

export type Campaign = {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  audienceGroups: string[];
  whatsappAccountId: string;
  funnel: FunnelDefinition;
  conversionGoal: ConversionGoal;
  createdAt: string;
  scheduledAt?: string;
  launchedAt?: string;
  /** Simulated clock for mock runs — real runs use server time. */
  clock?: string;
};
