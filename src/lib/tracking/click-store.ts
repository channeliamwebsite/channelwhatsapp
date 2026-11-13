/**
 * Click storage in Firestore: workspaces/{w}/clicks/{id}. When the click
 * belongs to a funnel recipient it is ingested as a funnel event, which the
 * engine reads when choosing the next step.
 */
import { FieldValue } from "firebase-admin/firestore";

import { db } from "@/lib/server/firebase-admin";
import { ingestEvent } from "@/lib/server/funnel-pipeline";

import type { TrackedLinkData } from "./links";

export type ClickEvent = TrackedLinkData & { id: string; at: string; userAgent: string };

export async function recordClick(data: TrackedLinkData, userAgent: string): Promise<ClickEvent> {
  const event: ClickEvent = { ...data, id: crypto.randomUUID(), at: new Date().toISOString(), userAgent: userAgent.slice(0, 200) };
  const workspace = db().collection("workspaces").doc(data.workspaceId);
  await workspace.collection("clicks").doc(event.id).set({ ...event, createdAt: FieldValue.serverTimestamp() });

  await ingestEvent({ id: `click_${event.id}`, workspaceId: data.workspaceId, type: "click", at: event.at, campaignId: data.campaignId, contactId: data.contactId, step: data.step, url: data.url });
  return event;
}

export async function listClicks(filter: { workspaceId: string; campaignId?: string }) {
  let query = db().collection("workspaces").doc(filter.workspaceId).collection("clicks").orderBy("at", "desc").limit(50);
  if (filter.campaignId) query = query.where("campaignId", "==", filter.campaignId);
  return (await query.get()).docs.map((d) => d.data() as ClickEvent);
}
