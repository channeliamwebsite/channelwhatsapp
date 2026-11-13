export type WhatsAppAccount = {
  id: string;
  displayName: string;
  phoneNumber: string;
  status: "connected" | "pending" | "disconnected";
  qualityRating: "high" | "medium" | "low";
  messagingLimit: string;
};

/** A client workspace. All contacts, groups, campaigns etc. are scoped to one. */
export type Workspace = {
  id: string;
  name: string;
  initials: string;
  industry: string;
  /** Brand accent used for the workspace avatar. */
  color: string;
  createdAt: string;
  whatsappAccount: WhatsAppAccount;
};
