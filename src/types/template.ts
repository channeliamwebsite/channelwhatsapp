export type TemplateStatus = "approved" | "pending" | "rejected";

export type WhatsAppTemplate = {
  id: string;
  name: string;
  category: "MARKETING" | "UTILITY";
  language: string;
  status: TemplateStatus;
  body: string;
  /** URL buttons are rewritten to tracked links at send time. */
  buttons: { type: "url" | "quick_reply"; text: string; url?: string }[];
};
