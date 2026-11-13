export type OptInStatus = "opted_in" | "pending" | "opted_out";

export const CONSENT_SOURCES = [
  "Website form",
  "Event registration",
  "WhatsApp click-to-chat",
  "Offline consent form",
  "Verified import",
  "Manual entry",
] as const;

export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export type Contact = {
  id: string;
  fullName: string;
  /** Stored in E.164 format, e.g. +919876543210. */
  phone: string;
  email: string;
  country: string;
  city: string;
  organisation: string;
  designation: string;
  audienceGroups: string[];
  tags: string[];
  optInStatus: OptInStatus;
  consentSource: ConsentSource | "";
  /** YYYY-MM-DD, empty when no consent recorded. */
  consentDate: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
};

export type ContactInput = Omit<Contact, "id" | "createdAt">;
