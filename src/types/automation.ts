export type AutomationTriggerType = "contact_added" | "message_read" | "link_clicked" | "contact_replied" | "message_failed" | "scheduled";

export type AutomationCondition = {
  field: "optInStatus" | "group" | "tag" | "customField";
  operator: "is" | "is_not";
  value: string;
  /** For customField conditions. */
  key?: string;
};

export type AutomationAction =
  | { type: "send_template"; templateId: string }
  | { type: "add_tag" | "remove_tag"; tag: string }
  | { type: "add_to_group" | "remove_from_group"; group: string }
  | { type: "set_custom_field"; key: string; value: string };

export type Automation = {
  id: string;
  workspaceId?: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: AutomationTriggerType;
    /** Limit message triggers to one campaign (optional). */
    campaignId?: string;
    /** For "scheduled": runs once at this time for contacts matching the conditions. */
    runAt?: string;
  };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  delayMinutes: number;
  createdAt: string;
  updatedAt?: string;
};

/** One execution for one contact. Written by the server runner only. */
export type AutomationRun = {
  id: string;
  workspaceId: string;
  automationId: string;
  contactId: string;
  trigger: AutomationTriggerType;
  status: "pending" | "succeeded" | "failed" | "skipped";
  detail?: string;
  triggeredAt: string;
  dueAt: string;
  executedAt?: string;
};
