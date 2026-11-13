/**
 * ⚠️ MOCK click store — in server memory only (lost on restart, not shared
 * between instances). Replace with a Firestore write to
 *   workspaces/{w}/campaigns/{c}/clicks/{id}
 * plus an update of the recipient's funnel progress (Cloud Function).
 */
import type { TrackedLinkData } from "./links";

export type ClickEvent = TrackedLinkData & { id: string; at: string; userAgent: string };

const store = globalThis as typeof globalThis & { __cwhClicks?: ClickEvent[] };
const clicks = (store.__cwhClicks ??= []);

export async function recordClick(data: TrackedLinkData, userAgent: string): Promise<ClickEvent> {
  const event: ClickEvent = { ...data, id: crypto.randomUUID(), at: new Date().toISOString(), userAgent: userAgent.slice(0, 200) };
  clicks.unshift(event);
  if (clicks.length > 1000) clicks.length = 1000;
  return event;
}

export function listClicks(filter: { workspaceId: string; campaignId?: string }) {
  return clicks.filter((c) => c.workspaceId === filter.workspaceId && (!filter.campaignId || c.campaignId === filter.campaignId)).slice(0, 50);
}
