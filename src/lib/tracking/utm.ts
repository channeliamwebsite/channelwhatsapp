import { DEFAULT_TRACKING, type WorkspaceSettings } from "@/types/workspace";

/** Adds the workspace's UTM defaults without overwriting UTM params already on the URL. */
export function withUtm(url: string, settings: WorkspaceSettings | undefined, campaignName: string) {
  const t = settings?.tracking ?? DEFAULT_TRACKING;
  try {
    const u = new URL(url);
    const values = { utm_source: t.utmSource, utm_medium: t.utmMedium, utm_campaign: t.utmCampaign.replace("{campaign}", campaignName.toLowerCase().replace(/[^a-z0-9]+/g, "-")) };
    for (const [k, v] of Object.entries(values)) if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return url;
  }
}
