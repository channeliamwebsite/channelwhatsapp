/**
 * Approval status comes from Meta. The dashboard can only create drafts and
 * mark them "pending"; "approved", "rejected", "paused" and "disabled" are
 * written solely by the server-side Meta template sync. Only "approved" may be sent.
 */
export type TemplateStatus = "draft" | "pending" | "approved" | "rejected" | "paused" | "disabled";
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type TemplateButton =
  | { type: "url"; text: string; url: string }
  | { type: "quick_reply"; text: string }
  | { type: "phone"; text: string; phone: string };

export type WhatsAppTemplate = {
  id: string;
  workspaceId?: string;
  /** Lowercase letters, numbers and underscores — Meta's naming rule. */
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  header?: { type: "none" | "text" | "image" | "document" | "video"; text?: string };
  body: string;
  footer?: string;
  buttons: TemplateButton[];
  /** Sample values for {{1}}, {{2}} … (Meta requires examples for review). */
  examples?: string[];
  /** Set by sync once Meta knows the template. */
  metaTemplateId?: string;
  /** Meta's raw status (e.g. APPROVED, IN_APPEAL, LIMIT_EXCEEDED) from the last sync. */
  metaStatus?: string;
  /** WABA the template was synced from — a template can only be sent through that account. */
  wabaId?: string;
  rejectedReason?: string;
  /** Why the dashboard can't send this Meta template (unsupported components). */
  unsupportedReason?: string;
  /** Extra status information from sync, e.g. the template no longer exists in Meta. */
  statusDetail?: string;
  createdAt?: string;
  updatedAt?: string;
};
