/**
 * Builds the overview dashboard for one workspace from its (mock) store data,
 * so every figure is consistent with that workspace's contacts and funnels.
 */
import { isCampaignEligible } from "@/lib/contacts/eligibility";
import { computeFunnelMetrics } from "@/lib/funnel/metrics";
import { audienceContacts } from "@/lib/funnel/simulate";
import { MOCK_NOW } from "@/lib/mock-data/workspaces";
import type { WorkspaceData } from "@/lib/store/hub-store";
import type { Campaign } from "@/types/campaign";
import type { CampaignStatus, DashboardData, MessagePerformancePoint } from "@/types/dashboard";
import type { Workspace } from "@/types/workspace";

const DAY = 86_400_000;
const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const istDate = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

const statusMap: Record<Campaign["status"], CampaignStatus> = {
  draft: "draft", scheduled: "scheduled", running: "sending", paused: "paused", completed: "completed", stopped: "stopped",
};

export function buildDashboardData(workspace: Workspace, data: WorkspaceData, firstName: string): DashboardData {
  const all = computeFunnelMetrics(data.recipients);
  const now = new Date(MOCK_NOW).getTime();

  // Daily sent/delivered/read for the last 14 days, from recipient messages.
  const days = Array.from({ length: 14 }, (_, i) => istDate(new Date(now - (13 - i) * DAY).toISOString()));
  const byDay = new Map(days.map((d) => [d, { sent: 0, delivered: 0, read: 0 }]));
  for (const m of data.recipients.flatMap((r) => r.messages)) {
    const bucket = byDay.get(istDate(m.sentAt));
    if (!bucket) continue;
    bucket.sent++;
    if (m.status === "delivered" || m.status === "read") bucket.delivered++;
    if (m.status === "read") bucket.read++;
  }
  const performance: MessagePerformancePoint[] = days.map((d) => ({ date: d, label: dayLabel.format(new Date(`${d}T12:00:00Z`)), ...byDay.get(d)! }));

  const recipientsOf = (id: string) => data.recipients.filter((r) => r.campaignId === id);
  const launched = data.campaigns.filter((c) => c.launchedAt).sort((a, b) => b.launchedAt!.localeCompare(a.launchedAt!));
  const groupCounts = new Map<string, number>();
  for (const c of data.contacts) {
    const primary = c.audienceGroups[0] ?? "No group";
    groupCounts.set(primary, (groupCounts.get(primary) ?? 0) + 1);
  }
  const monthPrefix = MOCK_NOW.slice(0, 7);

  return {
    source: "mock",
    isMockData: true,
    user: { firstName },
    periodLabel: "Last 14 days",
    stats: [
      { id: "contacts", label: "Total contacts", value: data.contacts.length, positiveIsGood: true, helper: `${data.contacts.filter(isCampaignEligible).length} campaign eligible` },
      { id: "campaigns", label: "Total campaigns", value: data.campaigns.length, positiveIsGood: true, helper: `${data.campaigns.filter((c) => c.status === "running").length} running now` },
      { id: "sent", label: "Messages sent", value: all.totals.sent, positiveIsGood: true, helper: "Across all funnel steps" },
      { id: "delivered", label: "Delivered", value: all.totals.delivered, positiveIsGood: true, helper: "of messages sent" },
      { id: "read", label: "Read", value: all.totals.read, positiveIsGood: true, helper: "of messages delivered" },
      { id: "failed", label: "Failed", value: all.totals.failed, positiveIsGood: false, helper: "of messages sent" },
    ],
    performance,
    recentCampaigns: launched.slice(0, 5).map((c) => {
      const m = computeFunnelMetrics(recipientsOf(c.id));
      return {
        id: c.id,
        name: c.name,
        audience: c.audienceGroups.join(", "),
        recipients: m.started,
        status: statusMap[c.status],
        createdAt: c.launchedAt!,
        stats: { sent: m.totals.sent, delivered: m.totals.delivered, read: m.totals.read, failed: m.totals.failed },
      };
    }),
    scheduledCampaigns: data.campaigns
      .filter((c) => c.status === "scheduled" && c.scheduledAt)
      .map((c) => ({
        id: c.id,
        name: c.name,
        template: data.templates.find((t) => t.id === c.funnel.message1.templateId)?.name ?? "—",
        audience: c.audienceGroups.join(", "),
        recipients: audienceContacts(data.contacts, c.audienceGroups).filter(isCampaignEligible).length,
        scheduledFor: c.scheduledAt!,
        dayLabel: weekday.format(new Date(c.scheduledAt!)),
        timeLabel: time.format(new Date(c.scheduledAt!)),
      })),
    audience: {
      totalContacts: data.contacts.length,
      optedIn: data.contacts.filter((c) => c.optInStatus === "opted_in").length,
      newThisMonth: data.contacts.filter((c) => c.createdAt.startsWith(monthPrefix)).length,
      segments: [...groupCounts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, contacts]) => ({ id: name, name, contacts })),
    },
    activity: launched.slice(0, 6).map((c, i) => {
      const m = computeFunnelMetrics(recipientsOf(c.id));
      return {
        id: `act_${c.id}`,
        type: c.status === "completed" ? "campaign_completed" : "campaign_scheduled",
        actor: "Funnel",
        message: `${c.name}: ${m.totals.sent} messages, ${m.replied} replies, ${m.converted} conversions`,
        timeLabel: i === 0 ? "Latest" : dayLabel.format(new Date(c.launchedAt!)),
      };
    }),
    whatsappAccount: {
      status: workspace.whatsappAccount.status,
      businessName: workspace.whatsappAccount.displayName,
      displayNumber: workspace.whatsappAccount.phoneNumber,
      qualityRating: workspace.whatsappAccount.qualityRating,
      messagingLimit: workspace.whatsappAccount.messagingLimit,
      lastSyncedLabel: "Sample data — not synced",
    },
  };
}
