/** ⚠️ MOCK DATA — WhatsApp message templates per workspace (not synced with Meta). */
import type { WhatsAppTemplate } from "@/types/template";

export function mockTemplatesFor(workspaceId: string, prefix: string, brand: string): WhatsAppTemplate[] {
  const t = (key: string, rest: Omit<WhatsAppTemplate, "id" | "name" | "language">): WhatsAppTemplate => ({
    id: `${workspaceId}_${key}`,
    name: `${prefix}_${key}`,
    language: "en",
    ...rest,
  });
  const site = `https://example.com/${prefix}`;
  return [
    t("launch_invite", { category: "MARKETING", status: "approved", body: `Hi {{1}}, ${brand} has something new for you. Tap below to see the details.`, buttons: [{ type: "url", text: "View details", url: `${site}/offer` }, { type: "quick_reply", text: "Stop updates" }] }),
    t("thanks_clicked", { category: "MARKETING", status: "approved", body: `Thanks for checking it out, {{1}}! Seats are filling fast — complete your registration here.`, buttons: [{ type: "url", text: "Register now", url: `${site}/register` }] }),
    t("reminder_read", { category: "MARKETING", status: "approved", body: `Hi {{1}}, just a reminder from ${brand} — the offer we shared is still open.`, buttons: [{ type: "url", text: "See offer", url: `${site}/offer` }] }),
    t("gentle_nudge", { category: "MARKETING", status: "approved", body: `Hi {{1}}, in case you missed our last message — here's a quick summary from ${brand}.`, buttons: [{ type: "url", text: "Read summary", url: `${site}/summary` }] }),
    t("last_chance", { category: "MARKETING", status: "approved", body: `Last chance, {{1}}! Registrations close tonight.`, buttons: [{ type: "url", text: "Register", url: `${site}/register` }] }),
    t("feedback_request", { category: "UTILITY", status: "pending", body: `Hi {{1}}, how was your experience with ${brand}?`, buttons: [{ type: "quick_reply", text: "Great" }, { type: "quick_reply", text: "Could be better" }] }),
    t("flash_sale_old", { category: "MARKETING", status: "rejected", body: `FLASH SALE!!! Buy now {{1}}!!!`, buttons: [] }),
  ];
}
