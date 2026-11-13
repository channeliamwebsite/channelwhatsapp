/** Append-only audit log written by the server — never by the browser. */
export type ActivityEvent = {
  id: string;
  workspaceId: string;
  type:
    | "contact_created" | "contact_updated" | "contact_deleted" | "contact_opted_in" | "contact_opted_out"
    | "contacts_imported" | "campaign_created" | "campaign_launched" | "campaign_paused" | "campaign_resumed"
    | "campaign_cancelled" | "workspace_updated" | "message_event";
  message: string;
  contactId?: string;
  campaignId?: string;
  at: string;
};
