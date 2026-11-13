/**
 * ⚠️ MOCK DATA — initial client workspaces and their seed configuration.
 */
import type { Workspace } from "@/types/workspace";

export const MOCK_NOW = "2026-11-13T09:00:00.000Z";
export const DEFAULT_WORKSPACE_ID = "channeliam";

export type WorkspaceSeed = {
  workspace: Workspace;
  contactCount: number;
  groups: { name: string; description: string }[];
  tags: string[];
  organisations: string[];
  templatePrefix: string;
};

const account = (id: string, displayName: string, phoneNumber: string, status: Workspace["whatsappAccount"]["status"]) => ({
  id: `waba_${id}`,
  displayName,
  phoneNumber,
  status,
  qualityRating: "high" as const,
  messagingLimit: status === "connected" ? "10K / day" : "—",
});

export const WORKSPACE_SEEDS: WorkspaceSeed[] = [
  {
    workspace: { id: "channeliam", name: "Channeliam", initials: "CH", industry: "Business media", color: "#e31e35", createdAt: "2025-01-06T00:00:00.000Z", whatsappAccount: account("channeliam", "Channeliam", "+91 98XXX XX210", "connected") },
    contactCount: 70,
    groups: [
      { name: "Active customers", description: "Customers with an active subscription" },
      { name: "Newsletter subscribers", description: "Weekly business digest readers" },
      { name: "Founders & investors", description: "Startup founders and angel investors" },
      { name: "Event attendees", description: "Registered for Channeliam events" },
      { name: "Webinar leads", description: "Signed up through webinar landing pages" },
    ],
    tags: ["VIP", "Startup", "Investor", "D2C", "Summit 2026", "Podcast guest", "Partner", "Kerala"],
    organisations: ["Zentrix Labs", "Malabar Foods", "Kochi Fintech Hub", "Spice Route D2C", "Lumen Ventures", "Greenleaf Organics", "Backwater Studios", "Nimbus Logistics"],
    templatePrefix: "channeliam",
  },
  {
    workspace: { id: "she-power", name: "She Power", initials: "SP", industry: "Women entrepreneurship network", color: "#c026d3", createdAt: "2025-03-12T00:00:00.000Z", whatsappAccount: account("she-power", "She Power", "+91 97XXX XX481", "connected") },
    contactCount: 54,
    groups: [
      { name: "Women founders", description: "Founders in the She Power network" },
      { name: "Mentors", description: "Volunteer mentors and advisors" },
      { name: "Workshop attendees", description: "Attended a She Power workshop" },
      { name: "Award nominees", description: "She Power Awards 2026 nominees" },
    ],
    tags: ["Mentor", "Founder", "Kochi chapter", "Award 2026", "Speaker"],
    organisations: ["Bloom Botanicals", "Kaavya Designs", "Nila Foods", "Sakhi Crafts", "Aura Wellness", "Thread & Loom"],
    templatePrefix: "shepower",
  },
  {
    workspace: { id: "jkg", name: "JKG", initials: "JK", industry: "Education & training", color: "#2f6fde", createdAt: "2025-06-02T00:00:00.000Z", whatsappAccount: account("jkg", "JKG", "+91 96XXX XX732", "pending") },
    contactCount: 40,
    groups: [
      { name: "Course enquiries", description: "Enquired about a course" },
      { name: "Students", description: "Currently enrolled" },
      { name: "Alumni", description: "Completed a programme" },
    ],
    tags: ["Batch 2026", "Scholarship", "Online", "Referral"],
    organisations: ["Self", "Infopark Systems", "Calicut Traders", "Edu Partners"],
    templatePrefix: "jkg",
  },
  {
    workspace: { id: "iae", name: "I Am Entrepreneur", initials: "IA", industry: "Entrepreneur community & events", color: "#ea7a0c", createdAt: "2025-02-20T00:00:00.000Z", whatsappAccount: account("iae", "I Am Entrepreneur", "+971 50XXX X904", "connected") },
    contactCount: 62,
    groups: [
      { name: "Members", description: "Paid community members" },
      { name: "Event attendees", description: "Attended an IAE meetup" },
      { name: "Startup founders", description: "Early-stage founders" },
      { name: "Sponsors", description: "Event sponsors and partners" },
    ],
    tags: ["Premium", "Speaker", "Startup", "Sponsor", "GCC"],
    organisations: ["Desert Bloom Trading", "Gulf Startup Studio", "Pearl Logistics", "Oasis Tech", "Majlis Media"],
    templatePrefix: "iae",
  },
  {
    workspace: { id: "other", name: "Other Clients", initials: "OC", industry: "Shared workspace for smaller clients", color: "#6f6466", createdAt: "2025-08-15T00:00:00.000Z", whatsappAccount: account("other", "Channeliam Clients", "Not connected", "disconnected") },
    contactCount: 25,
    groups: [
      { name: "Client leads", description: "Leads collected for smaller clients" },
      { name: "General enquiries", description: "Inbound enquiries" },
    ],
    tags: ["Retail", "Services", "Hot lead"],
    organisations: ["Local Retail Co.", "Smile Dental", "Urban Interiors"],
    templatePrefix: "clients",
  },
];
