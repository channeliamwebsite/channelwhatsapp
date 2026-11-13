export type CampaignStatus = "draft" | "scheduled" | "sending" | "paused" | "stopped" | "completed" | "failed";

export type MessageStats = {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
};

export type DashboardStat = {
  id: "contacts" | "campaigns" | "active" | "completed" | "sent" | "delivered" | "read" | "failed" | "replies";
  label: string;
  value: number;
  /** Percentage change vs. previous period (omitted when unknown). */
  change?: number;
  /** Whether an increase is good (e.g. false for failed messages). */
  positiveIsGood: boolean;
  helper: string;
};

export type MessagePerformancePoint = {
  date: string;
  label: string;
  sent: number;
  delivered: number;
  read: number;
};

export type RecentCampaign = {
  id: string;
  name: string;
  audience: string;
  /** Contacts targeted by the campaign. */
  recipients: number;
  status: CampaignStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
  stats: MessageStats;
};

export type ScheduledCampaign = {
  id: string;
  name: string;
  template: string;
  audience: string;
  recipients: number;
  scheduledFor: string;
  dayLabel: string;
  timeLabel: string;
};

export type AudienceSegment = {
  id: string;
  name: string;
  contacts: number;
};

export type AudienceOverview = {
  totalContacts: number;
  optedIn: number;
  newThisMonth: number;
  segments: AudienceSegment[];
};

export type ConnectionStatus = "connected" | "pending" | "disconnected";

export type WhatsAppAccountStatus = {
  status: ConnectionStatus;
  businessName: string;
  displayNumber: string;
  qualityRating: "high" | "medium" | "low";
  messagingLimit: string;
  lastSyncedLabel: string;
};

export type ActivityType =
  | "campaign_completed"
  | "campaign_scheduled"
  | "contacts_imported"
  | "template_approved"
  | "template_rejected"
  | "member_joined";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  actor: string;
  message: string;
  timeLabel: string;
};

export type DashboardData = {
  periodLabel: string;
  stats: DashboardStat[];
  performance: MessagePerformancePoint[];
  recentCampaigns: RecentCampaign[];
  scheduledCampaigns: ScheduledCampaign[];
  audience: AudienceOverview;
  activity: import("./activity").ActivityEvent[];
  /** New contacts per day in the selected range. */
  contactGrowth: { date: string; label: string; contacts: number }[];
  whatsappAccount: WhatsAppAccountStatus;
};
