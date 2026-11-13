/**
 * WhatsApp Business configuration. `status`, webhook and sync fields are set
 * only by the server after verifying with Meta — never from the browser.
 * Access tokens are NOT stored here (they will live in a server secret store).
 */
export type WhatsAppAccount = {
  id: string;
  displayName: string;
  phoneNumber: string;
  status: "connected" | "pending" | "disconnected";
  qualityRating: "high" | "medium" | "low";
  messagingLimit: string;
  businessName?: string;
  phoneNumberId?: string;
  wabaId?: string;
  webhookStatus?: "not_configured" | "pending_verification" | "verified" | "error";
  templateSync?: { status: "never" | "ok" | "error"; message?: string; lastSyncedAt?: string };
  lastSyncedAt?: string;
};

export type WorkspaceSettings = {
  /** Country assumed for numbers typed without a country code. */
  defaultCountry: string;
  timezone: string;
  /** Which activity events appear in the notification menu. */
  notifications?: { campaigns: boolean; failures: boolean; automations: boolean };
  /** Tracked links: on/off and UTM parameters added to destination URLs. */
  tracking?: { enabled: boolean; utmSource: string; utmMedium: string; utmCampaign: string };
};

export const DEFAULT_NOTIFICATIONS = { campaigns: true, failures: true, automations: true };
export const DEFAULT_TRACKING = { enabled: true, utmSource: "whatsapp", utmMedium: "message", utmCampaign: "{campaign}" };

/** A client workspace. Every workspace-owned record carries its `workspaceId`. */
export type Workspace = {
  id: string;
  name: string;
  initials: string;
  industry: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  /** Brand accent colour. */
  color: string;
  settings?: WorkspaceSettings;
  createdAt: string;
  updatedAt?: string;
  whatsappAccount: WhatsAppAccount;
};
