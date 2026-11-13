/** ⚠️ MOCK DATA — seed funnel campaigns per workspace. */
import { defaultFunnel } from "@/lib/funnel/defaults";
import type { Campaign } from "@/types/campaign";

type Seed = Pick<Campaign, "name" | "description" | "status" | "audienceGroups"> & {
  launchedAt?: string;
  scheduledAt?: string;
  /** Funnel stages already processed by the mock clock (0 = Message 1 sent). */
  stages: number;
};

const SEEDS: Record<string, Seed[]> = {
  channeliam: [
    { name: "Startup Summit 2026 — Invite", description: "Three-step invite funnel for the annual summit", status: "running", audienceGroups: ["Founders & investors", "Event attendees"], launchedAt: "2026-11-10T04:30:00.000Z", stages: 1 },
    { name: "Diwali Festive Offers", description: "Festive subscription offer", status: "completed", audienceGroups: ["Active customers"], launchedAt: "2026-11-01T12:30:00.000Z", stages: 3 },
    { name: "Webinar: Scaling D2C Brands", description: "Webinar registration follow-up", status: "paused", audienceGroups: ["Webinar leads"], launchedAt: "2026-11-06T10:30:00.000Z", stages: 1 },
    { name: "Weekly Digest relaunch", description: "Draft re-engagement funnel", status: "draft", audienceGroups: ["Newsletter subscribers"], stages: 0 },
  ],
  "she-power": [
    { name: "She Power Awards — Nominations", description: "Call for nominations", status: "running", audienceGroups: ["Women founders"], launchedAt: "2026-11-11T05:00:00.000Z", stages: 0 },
    { name: "Mentor meetup — December", description: "Scheduled mentor invite", status: "scheduled", audienceGroups: ["Mentors"], scheduledAt: "2026-11-20T04:30:00.000Z", stages: 0 },
  ],
  jkg: [{ name: "January batch enquiries", description: "Draft enquiry nurture funnel", status: "draft", audienceGroups: ["Course enquiries"], stages: 0 }],
  iae: [
    { name: "IAE Dubai Meetup", description: "Meetup invite funnel", status: "completed", audienceGroups: ["Members", "Event attendees"], launchedAt: "2026-11-02T06:00:00.000Z", stages: 3 },
    { name: "Premium membership upsell", description: "Upsell to premium tier", status: "stopped", audienceGroups: ["Members"], launchedAt: "2026-11-08T06:00:00.000Z", stages: 1 },
  ],
};

export type CampaignSeed = { campaign: Campaign; stages: number };

export function mockCampaignsFor(workspaceId: string): CampaignSeed[] {
  return (SEEDS[workspaceId] ?? []).map((s, i) => ({
    stages: s.stages,
    campaign: {
      id: `${workspaceId}_cmp_${i + 1}`,
      name: s.name,
      description: s.description,
      status: s.status,
      audienceGroups: s.audienceGroups,
      whatsappAccountId: `waba_${workspaceId}`,
      funnel: defaultFunnel(workspaceId),
      conversionGoal: { type: "link_click", url: `https://example.com/${workspaceId}/register` },
      createdAt: s.launchedAt ?? s.scheduledAt ?? "2026-11-12T06:00:00.000Z",
      launchedAt: s.launchedAt,
      scheduledAt: s.scheduledAt,
    },
  }));
}
