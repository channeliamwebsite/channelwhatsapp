/**
 * Approval status comes from Meta. The dashboard can only create drafts and
 * mark them "pending" (submitted); "approved"/"rejected" are written solely by
 * the future template-sync job.
 */
export type TemplateStatus = "draft" | "pending" | "approved" | "rejected";
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
  rejectedReason?: string;
  createdAt?: string;
  updatedAt?: string;
};
