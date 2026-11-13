/**
 * ⚠️ MOCK DATA — for UI development only.
 *
 * None of these figures come from WhatsApp, Firebase or any delivery system.
 * They exist so the dashboard can be designed before integrations are built.
 * Replace `getDashboardData()` with a real data source when the WhatsApp
 * Business API and Firestore are connected.
 */
import type { DashboardData, MessagePerformancePoint } from "@/types/dashboard";

const performance: MessagePerformancePoint[] = [
  { date: "2026-10-29", label: "Oct 29", sent: 3120, delivered: 3010, read: 2210 },
  { date: "2026-10-30", label: "Oct 30", sent: 2860, delivered: 2768, read: 2030 },
  { date: "2026-10-31", label: "Oct 31", sent: 4210, delivered: 4068, read: 3122 },
  { date: "2026-11-01", label: "Nov 1", sent: 1980, delivered: 1912, read: 1386 },
  { date: "2026-11-02", label: "Nov 2", sent: 1640, delivered: 1590, read: 1102 },
  { date: "2026-11-03", label: "Nov 3", sent: 5320, delivered: 5148, read: 4012 },
  { date: "2026-11-04", label: "Nov 4", sent: 4480, delivered: 4320, read: 3368 },
  { date: "2026-11-05", label: "Nov 5", sent: 3940, delivered: 3812, read: 2905 },
  { date: "2026-11-06", label: "Nov 6", sent: 4710, delivered: 4562, read: 3540 },
  { date: "2026-11-07", label: "Nov 7", sent: 6120, delivered: 5930, read: 4688 },
  { date: "2026-11-08", label: "Nov 8", sent: 2350, delivered: 2276, read: 1640 },
  { date: "2026-11-09", label: "Nov 9", sent: 2090, delivered: 2018, read: 1452 },
  { date: "2026-11-10", label: "Nov 10", sent: 5860, delivered: 5672, read: 4410 },
  { date: "2026-11-11", label: "Nov 11", sent: 4920, delivered: 4766, read: 3702 },
];

const totals = performance.reduce(
  (acc, point) => ({
    sent: acc.sent + point.sent,
    delivered: acc.delivered + point.delivered,
    read: acc.read + point.read,
  }),
  { sent: 0, delivered: 0, read: 0 },
);

const failed = totals.sent - totals.delivered - 412; // remainder are "pending"

const mockDashboardData: DashboardData = {
  source: "mock",
  isMockData: true,
  user: { firstName: "Aisha" },
  periodLabel: "Last 14 days",
  stats: [
    { id: "contacts", label: "Total contacts", value: 48_265, change: 6.4, positiveIsGood: true, helper: "1,284 added this month" },
    { id: "campaigns", label: "Total campaigns", value: 126, change: 12.0, positiveIsGood: true, helper: "9 active right now" },
    { id: "sent", label: "Messages sent", value: totals.sent, change: 18.2, positiveIsGood: true, helper: "Across all campaigns" },
    { id: "delivered", label: "Delivered", value: totals.delivered, change: 17.5, positiveIsGood: true, helper: "of messages sent" },
    { id: "read", label: "Read", value: totals.read, change: 21.3, positiveIsGood: true, helper: "of messages delivered" },
    { id: "failed", label: "Failed", value: failed, change: -8.6, positiveIsGood: false, helper: "of messages sent" },
  ],
  performance,
  recentCampaigns: [
    {
      id: "cmp_1042",
      name: "Diwali Festive Offers",
      audience: "Active customers",
      recipients: 12_650,
      status: "completed",
      createdAt: "2026-11-10T18:30:00+05:30",
      stats: { sent: 12_480, delivered: 12_102, read: 9_430, failed: 218 },
    },
    {
      id: "cmp_1041",
      name: "Channeliam Startup Summit — RSVP",
      audience: "Founders & investors",
      recipients: 6_380,
      status: "sending",
      createdAt: "2026-11-11T10:00:00+05:30",
      stats: { sent: 3_920, delivered: 3_640, read: 2_105, failed: 41 },
    },
    {
      id: "cmp_1040",
      name: "Weekly Business Digest #45",
      audience: "Newsletter subscribers",
      recipients: 18_420,
      status: "completed",
      createdAt: "2026-11-07T09:00:00+05:30",
      stats: { sent: 18_210, delivered: 17_688, read: 12_940, failed: 302 },
    },
    {
      id: "cmp_1039",
      name: "Webinar: Scaling D2C Brands",
      audience: "Registered attendees",
      recipients: 2_660,
      status: "completed",
      createdAt: "2026-11-05T16:00:00+05:30",
      stats: { sent: 2_640, delivered: 2_598, read: 2_204, failed: 12 },
    },
    {
      id: "cmp_1038",
      name: "Payment Reminder — Premium Plan",
      audience: "Renewals due",
      recipients: 870,
      status: "failed",
      createdAt: "2026-11-04T11:15:00+05:30",
      stats: { sent: 860, delivered: 402, read: 288, failed: 458 },
    },
  ],
  scheduledCampaigns: [
    {
      id: "sch_201",
      name: "Startup Summit — Day-before reminder",
      template: "event_reminder_v2",
      audience: "Summit registrants",
      recipients: 4_210,
      scheduledFor: "2026-11-12T09:00:00+05:30",
      dayLabel: "Tomorrow",
      timeLabel: "9:00 AM",
    },
    {
      id: "sch_202",
      name: "Weekly Business Digest #46",
      template: "weekly_digest",
      audience: "Newsletter subscribers",
      recipients: 18_640,
      scheduledFor: "2026-11-14T09:00:00+05:30",
      dayLabel: "Sat, Nov 14",
      timeLabel: "9:00 AM",
    },
    {
      id: "sch_203",
      name: "Founder Stories — Episode 12",
      template: "content_drop",
      audience: "Founders & investors",
      recipients: 6_380,
      scheduledFor: "2026-11-17T18:00:00+05:30",
      dayLabel: "Tue, Nov 17",
      timeLabel: "6:00 PM",
    },
  ],
  audience: {
    totalContacts: 48_265,
    optedIn: 44_910,
    newThisMonth: 1_284,
    // Primary audience per contact — segments sum to totalContacts.
    segments: [
      { id: "seg_customers", name: "Active customers", contacts: 14_820 },
      { id: "seg_newsletter", name: "Newsletter subscribers", contacts: 12_960 },
      { id: "seg_founders", name: "Founders & investors", contacts: 8_410 },
      { id: "seg_events", name: "Event attendees", contacts: 7_345 },
      { id: "seg_other", name: "Other", contacts: 4_730 },
    ],
  },
  activity: [
    { id: "act_1", type: "campaign_completed", actor: "System", message: "Diwali Festive Offers finished sending to 12,480 contacts", timeLabel: "18 min ago" },
    { id: "act_2", type: "contacts_imported", actor: "Rahul Menon", message: "imported 1,240 contacts from summit_registrations.xlsx", timeLabel: "1 hr ago" },
    { id: "act_3", type: "template_approved", actor: "Meta", message: "approved the template event_reminder_v2", timeLabel: "3 hr ago" },
    { id: "act_4", type: "campaign_scheduled", actor: "Aisha Rahman", message: "scheduled Weekly Business Digest #46 for Sat, 9:00 AM", timeLabel: "5 hr ago" },
    { id: "act_5", type: "template_rejected", actor: "Meta", message: "rejected payment_reminder_v1 — promotional content in utility template", timeLabel: "Yesterday" },
    { id: "act_6", type: "member_joined", actor: "Neha Pillai", message: "joined the workspace as Agent", timeLabel: "Yesterday" },
  ],
  whatsappAccount: {
    status: "connected",
    businessName: "Channeliam",
    displayNumber: "+91 98XXX XX210",
    qualityRating: "high",
    messagingLimit: "10K / day",
    lastSyncedLabel: "Sample data — not synced",
  },
};

/**
 * Returns dashboard data. Currently mock data only; swap the implementation
 * for a Firestore / API read later without touching the UI components.
 */
export async function getDashboardData(): Promise<DashboardData> {
  return mockDashboardData;
}
