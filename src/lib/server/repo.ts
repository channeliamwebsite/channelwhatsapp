/**
 * Firestore data layer — SERVER ONLY.
 *
 *   workspaces/{w}
 *   workspaces/{w}/contacts|audienceGroups|tags|segments|campaigns|templates|recipients|activity|clicks|events|sends/{id}
 *
 * Isolation: data lives under its workspace path AND every document carries
 * `workspaceId`, which is stamped on write and checked on read.
 */
import type { DocumentData, DocumentReference, Firestore, WriteBatch } from "firebase-admin/firestore";

import { resolveAudience } from "@/lib/audience/segments";
import { countryCallingCode, phoneKey, validatePhone } from "@/lib/contacts/phone";
import { applyEvent } from "@/lib/funnel/engine";
import { validateFunnel } from "@/lib/funnel/validate";
import type { ActivityEvent } from "@/types/activity";
import type { Automation, AutomationRun } from "@/types/automation";
import type { AudienceGroup, Segment, Tag } from "@/types/audience";
import type { Campaign } from "@/types/campaign";
import type { Contact } from "@/types/contact";
import type { RecipientProgress } from "@/types/funnel";
import type { WhatsAppTemplate } from "@/types/template";
import type { Workspace } from "@/types/workspace";

import { ApiError } from "./errors";
import { db } from "./firebase-admin";
import type { SyncPayload } from "./schemas";

export type WorkspaceSummary = Workspace & { contactCount: number; campaignCount: number };
export type WorkspaceData = {
  contacts: Contact[];
  audienceGroups: AudienceGroup[];
  tags: Tag[];
  segments: Segment[];
  campaigns: Campaign[];
  recipients: RecipientProgress[];
  templates: WhatsAppTemplate[];
  automations: Automation[];
  automationRuns: AutomationRun[];
  activity: ActivityEvent[];
};

const COLORS = ["#e31e35", "#c026d3", "#2f6fde", "#ea7a0c", "#1a9e8a", "#6250d6"];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
export const wsRef = (id: string) => db().collection("workspaces").doc(id);
const initialsOf = (name: string) => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

/** Reads a workspace subcollection, dropping anything not stamped for this workspace. */
export async function listOwned<T>(workspaceId: string, name: string) {
  const snap = await wsRef(workspaceId).collection(name).get();
  return snap.docs.map((d) => d.data() as T & { workspaceId?: string }).filter((d) => !d.workspaceId || d.workspaceId === workspaceId) as T[];
}

function newWorkspace(name: string, industry: string, index: number, id = `${slug(name) || "workspace"}-${crypto.randomUUID().slice(0, 4)}`): Workspace {
  const now = new Date().toISOString();
  return {
    id, name, initials: initialsOf(name), industry, description: "", logoUrl: "", website: "",
    color: COLORS[index % COLORS.length],
    settings: { defaultCountry: "India", timezone: "Asia/Kolkata" },
    createdAt: now, updatedAt: now,
    whatsappAccount: { id: "", displayName: "", phoneNumber: "", status: "disconnected", qualityRating: "high", messagingLimit: "", webhookStatus: "not_configured", templateSync: { status: "never" } },
  };
}

/** Creates the initial client workspaces exactly once (empty — no demo data). */
export async function bootstrapWorkspaces() {
  try {
    await db().collection("system").doc("bootstrap").create({ at: new Date().toISOString() });
  } catch {
    return; // already bootstrapped — never recreate deleted workspaces
  }
  const batch = db().batch();
  [["channeliam", "Channeliam", "Business media"], ["she-power", "She Power", "Women entrepreneurship network"], ["jkg", "JKG", "Client workspace"], ["i-am-entrepreneur", "I Am Entrepreneur", "Entrepreneur community"]]
    .forEach(([id, name, industry], i) => batch.set(wsRef(id), newWorkspace(name, industry, i, id), { merge: true }));
  await batch.commit();
}

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  const snap = await db().collection("workspaces").orderBy("createdAt").get();
  return Promise.all(snap.docs.map(async (d) => {
    const [contacts, campaigns] = await Promise.all([d.ref.collection("contacts").count().get(), d.ref.collection("campaigns").count().get()]);
    return { ...(d.data() as Workspace), contactCount: contacts.data().count, campaignCount: campaigns.data().count };
  }));
}

export async function requireWorkspace(workspaceId: string) {
  const snap = await wsRef(workspaceId).get();
  if (!snap.exists) throw new ApiError(404, "Workspace not found.");
  return snap.data() as Workspace;
}

export async function createWorkspace(name: string, industry: string) {
  const count = (await db().collection("workspaces").count().get()).data().count;
  const workspace = newWorkspace(name, industry || "Client workspace", count);
  await wsRef(workspace.id).create(workspace);
  return workspace;
}

export async function updateWorkspace(workspaceId: string, input: Pick<Workspace, "name" | "industry" | "description" | "logoUrl" | "website" | "color" | "settings">) {
  await requireWorkspace(workspaceId);
  const now = new Date().toISOString();
  const batch = db().batch();
  batch.update(wsRef(workspaceId), { ...input, initials: initialsOf(input.name), updatedAt: now });
  logActivity(batch, workspaceId, { type: "workspace_updated", message: "Workspace details updated" }, now);
  await batch.commit();
}

/** Permanently deletes the workspace and ALL of its subcollections. */
export async function deleteWorkspace(workspaceId: string, confirmName: string) {
  const workspace = await requireWorkspace(workspaceId);
  if (confirmName.trim() !== workspace.name) throw new ApiError(400, "Type the workspace name exactly to confirm deletion.");
  const active = await wsRef(workspaceId).collection("campaigns").where("status", "in", ["running", "paused", "scheduled"]).limit(1).get();
  if (!active.empty) throw new ApiError(409, "Cancel this workspace’s active, paused or scheduled campaigns first.");
  await db().recursiveDelete(wsRef(workspaceId));
}

export async function loadWorkspaceData(workspaceId: string): Promise<WorkspaceData> {
  await requireWorkspace(workspaceId);
  const [activitySnap, runsSnap] = await Promise.all([
    wsRef(workspaceId).collection("activity").orderBy("at", "desc").limit(300).get(),
    wsRef(workspaceId).collection("automationRuns").orderBy("triggeredAt", "desc").limit(200).get(),
  ]);
  const [contacts, audienceGroups, tags, segments, campaigns, recipients, templates, automations] = await Promise.all([
    listOwned<Contact>(workspaceId, "contacts"),
    listOwned<AudienceGroup>(workspaceId, "audienceGroups"),
    listOwned<Tag>(workspaceId, "tags"),
    listOwned<Segment>(workspaceId, "segments"),
    listOwned<Campaign>(workspaceId, "campaigns"),
    listOwned<RecipientProgress>(workspaceId, "recipients"),
    listOwned<WhatsAppTemplate>(workspaceId, "templates"),
    listOwned<Automation>(workspaceId, "automations"),
  ]);
  return { contacts, audienceGroups, tags, segments, campaigns, recipients, templates, automations, automationRuns: runsSnap.docs.map((d) => d.data() as AutomationRun), activity: activitySnap.docs.map((d) => d.data() as ActivityEvent) };
}

export function logActivity(batch: WriteBatch, workspaceId: string, event: Omit<ActivityEvent, "id" | "workspaceId" | "at">, at: string) {
  const ref = wsRef(workspaceId).collection("activity").doc();
  batch.set(ref, { ...event, id: ref.id, workspaceId, at } satisfies ActivityEvent as DocumentData);
}

type Op = (b: WriteBatch) => void;
export async function commitInChunks(firestore: Firestore, ops: Op[]) {
  for (let i = 0; i < ops.length; i += 400) {
    const batch = firestore.batch();
    ops.slice(i, i + 400).forEach((op) => op(batch));
    await batch.commit();
  }
}

const EDITABLE: Campaign["status"][] = ["draft", "scheduled", "paused"];

/** Saves business details only. Connection, webhook and sync status are never set from the browser. */
export async function updateWhatsAppConfig(workspaceId: string, input: { businessName: string; displayName: string; phoneNumber: string; phoneNumberId: string; wabaId: string }) {
  const workspace = await requireWorkspace(workspaceId);
  const prev = workspace.whatsappAccount;
  const changedIds = prev.phoneNumberId !== input.phoneNumberId || prev.wabaId !== input.wabaId;
  const now = new Date().toISOString();
  const batch = db().batch();
  batch.update(wsRef(workspaceId), {
    whatsappAccount: {
      ...prev,
      ...input,
      id: input.wabaId ? `waba_${input.wabaId}` : "",
      // Saved IDs are unverified until the API integration checks them with Meta.
      status: changedIds || prev.status !== "connected" ? (input.phoneNumberId && input.wabaId ? "pending" : "disconnected") : prev.status,
      webhookStatus: prev.webhookStatus ?? "not_configured",
      templateSync: prev.templateSync ?? { status: "never" },
      verification: changedIds ? null : prev.verification ?? null,
    },
    updatedAt: now,
  });
  logActivity(batch, workspaceId, { type: "workspace_updated", message: "WhatsApp account details updated" }, now);
  await batch.commit();
}

/** Verify the workspace's WhatsApp setup with Meta; "connected" is set only on success. */
export async function verifyWhatsAppConnection(workspaceId: string) {
  const { checkWhatsAppConnection } = await import("./whatsapp/verify");
  const { credentialProviderFor } = await import("./whatsapp/credentials");
  const { createWhatsAppClient } = await import("./whatsapp/client");
  const workspace = await requireWorkspace(workspaceId);
  const result = await checkWhatsAppConnection(await credentialProviderFor(workspace).resolve(workspace), (accessToken, apiVersion) => createWhatsAppClient({ accessToken, apiVersion }));
  const prev = workspace.whatsappAccount;
  const now = new Date().toISOString();
  const connected = result.status === "connected";
  const phone = result.phone;
  const batch = db().batch();
  batch.update(wsRef(workspaceId), {
    whatsappAccount: {
      ...prev,
      status: connected ? "connected" : prev.phoneNumberId && prev.wabaId ? "pending" : "disconnected",
      verification: { status: result.status, message: result.message, at: now },
      ...(connected && phone ? {
        verifiedAt: now,
        displayName: phone.verifiedName ?? prev.displayName,
        phoneNumber: phone.displayPhoneNumber ? `+${phone.displayPhoneNumber.replace(/\D/g, "")}` : prev.phoneNumber,
        qualityRating: phone.qualityRating === "RED" ? "low" : phone.qualityRating === "YELLOW" ? "medium" : "high",
        messagingLimit: phone.messagingLimitTier ?? prev.messagingLimit,
        platformType: phone.platformType ?? "",
      } : {}),
    },
    updatedAt: now,
  });
  logActivity(batch, workspaceId, { type: "workspace_updated", message: connected ? "WhatsApp connection verified" : `WhatsApp verification: ${result.status.replace("_", " ")}` }, now);
  await batch.commit();
  return { status: result.status, message: result.message };
}

/** Send one approved template by name (e.g. Meta's "hello_world") to test the connection. */
export async function sendTestTemplate(workspaceId: string, input: { to: string; templateName: string; languageCode: string }) {
  const { credentialProviderFor } = await import("./whatsapp/credentials");
  const { createWhatsAppClient } = await import("./whatsapp/client");
  const { buildNamedTemplatePayload, PayloadError } = await import("./whatsapp/payloads");
  const { WhatsAppApiError } = await import("./whatsapp/errors");
  const workspace = await requireWorkspace(workspaceId);
  if (workspace.whatsappAccount.status !== "connected") throw new ApiError(409, "Verify the WhatsApp connection before sending a test message.");
  const creds = await credentialProviderFor(workspace).resolve(workspace);
  if (!creds.ok) throw new ApiError(409, creds.message);
  try {
    const payload = buildNamedTemplatePayload(input.to, input.templateName, input.languageCode);
    const client = createWhatsAppClient({ accessToken: creds.credentials.accessToken, apiVersion: creds.credentials.apiVersion });
    const res = await client.sendMessage(creds.credentials.phoneNumberId, payload);
    return { messageId: res.messageId, accepted: res.messageStatus ?? "accepted" };
  } catch (error) {
    if (error instanceof PayloadError) throw new ApiError(400, error.message);
    if (error instanceof WhatsAppApiError) throw new ApiError(error.retryable ? 503 : 422, error.message);
    throw error;
  }
}

/** Applies client edits after enforcing the business rules server-side. Returns new contact ids. */
export async function applySync(workspaceId: string, payload: SyncPayload): Promise<{ createdContactIds: string[] }> {
  const workspace = await requireWorkspace(workspaceId);
  const ref = wsRef(workspaceId);
  const now = new Date().toISOString();
  const ops: Op[] = [];
  const createdIds: string[] = [];
  const log = (event: Omit<ActivityEvent, "id" | "workspaceId" | "at">) => ops.push((b) => logActivity(b, workspaceId, event, now));
  const put = (col: string, docId: string, value: object) => ops.push((b) => b.set(ref.collection(col).doc(docId), { ...value, workspaceId } as DocumentData));
  const del = (col: string, docId: string) => ops.push((b) => b.delete(ref.collection(col).doc(docId)));

  // ---- contacts: phone validation, per-workspace uniqueness, consent history
  if (payload.contacts.upsert.length || payload.contacts.delete.length) {
    const existing = new Map((await listOwned<Contact>(workspaceId, "contacts")).map((c) => [c.id, c]));
    const deleting = new Set(payload.contacts.delete);
    const phoneOwner = new Map([...existing.values()].filter((c) => !deleting.has(c.id)).map((c) => [phoneKey(c.phone), c.id]));
    const created: string[] = [];
    createdIds.push(...payload.contacts.upsert.filter((c) => !existing.has(c.id)).map((c) => c.id));
    for (const input of payload.contacts.upsert) {
      const phone = validatePhone(input.phone, workspace.settings?.defaultCountry ?? "India");
      if (!phone.valid) throw new ApiError(400, `${input.fullName}: ${phone.error}`);
      const owner = phoneOwner.get(phone.e164);
      if (owner && owner !== input.id) throw new ApiError(409, `${phone.e164} already belongs to another contact in this workspace.`);
      phoneOwner.set(phone.e164, input.id);

      const prev = existing.get(input.id);
      const statusChanged = prev?.optInStatus !== input.optInStatus;
      const contact: Contact = {
        ...input,
        phone: phone.e164,
        countryCode: countryCallingCode(phone.e164),
        createdAt: prev?.createdAt ?? input.createdAt,
        updatedAt: now,
        optedInAt: input.optInStatus === "opted_in" ? (statusChanged ? now : prev?.optedInAt ?? now) : prev?.optedInAt,
        optedOutAt: input.optInStatus === "opted_out" ? (statusChanged ? now : prev?.optedOutAt ?? now) : prev?.optedOutAt,
        consentHistory: statusChanged
          ? [...(prev?.consentHistory ?? []), { status: input.optInStatus, source: input.consentSource || "Manual entry", at: now }]
          : prev?.consentHistory ?? [],
      };
      put("contacts", input.id, contact);
      if (!prev) created.push(input.fullName);
      else if (statusChanged && input.optInStatus !== "pending") log({ type: input.optInStatus === "opted_in" ? "contact_opted_in" : "contact_opted_out", message: `${input.fullName} ${input.optInStatus === "opted_in" ? "opted in" : "opted out"}`, contactId: input.id });
      else log({ type: "contact_updated", message: `${input.fullName} updated`, contactId: input.id });
    }
    if (created.length > 5) log({ type: "contacts_imported", message: `${created.length} contacts added` });
    else payload.contacts.upsert.filter((c) => !existing.has(c.id)).forEach((c) => log({ type: "contact_created", message: `${c.fullName} added`, contactId: c.id }));
    for (const contactId of payload.contacts.delete) {
      del("contacts", contactId);
      log({ type: "contact_deleted", message: `${existing.get(contactId)?.fullName ?? "Contact"} deleted`, contactId });
    }
  }

  // ---- groups / tags: unique names; groups & segments in use by live campaigns can't be deleted
  const live = (payload.audienceGroups.delete.length || payload.segments.delete.length)
    ? (await listOwned<Campaign>(workspaceId, "campaigns")).filter((c) => ["running", "paused", "scheduled"].includes(c.status))
    : [];
  for (const [col, change] of [["audienceGroups", payload.audienceGroups], ["tags", payload.tags]] as const) {
    if (!change.upsert.length && !change.delete.length) continue;
    const existing = await listOwned<{ id: string; name: string }>(workspaceId, col);
    const deleting = new Set(change.delete);
    const names = new Map(existing.filter((x) => !deleting.has(x.id)).map((x) => [x.name.toLowerCase(), x.id]));
    for (const item of change.upsert) {
      const owner = names.get(item.name.toLowerCase());
      if (owner && owner !== item.id) throw new ApiError(409, `“${item.name}” already exists in this workspace.`);
      names.set(item.name.toLowerCase(), item.id);
    }
    if (col === "audienceGroups") {
      for (const gid of change.delete) {
        const name = existing.find((x) => x.id === gid)?.name;
        if (name && live.some((c) => c.audienceGroups.includes(name))) throw new ApiError(409, `“${name}” is used by an active or scheduled campaign.`);
      }
    }
  }
  for (const sid of payload.segments.delete) if (live.some((c) => c.segmentIds?.includes(sid))) throw new ApiError(409, "This segment is used by an active or scheduled campaign.");
  for (const [col, change] of [["audienceGroups", payload.audienceGroups], ["tags", payload.tags], ["segments", payload.segments], ["automations", payload.automations]] as const) {
    change.upsert.forEach((item) => put(col, item.id, { ...item, updatedAt: now }));
    change.delete.forEach((docId) => del(col, docId));
  }

  // ---- campaigns: only drafts/scheduled/paused are editable; status changes go through actions
  const ids = [...payload.campaigns.upsert.map((c) => c.id), ...payload.campaigns.delete];
  const existingCampaigns = new Map((await Promise.all(ids.map((cid) => ref.collection("campaigns").doc(cid).get()))).filter((s) => s.exists).map((s) => [s.id, s.data() as Campaign]));
  for (const c of payload.campaigns.upsert) {
    const prev = existingCampaigns.get(c.id);
    if (c.status === "scheduled" && (!prev || prev.status !== "scheduled")) {
      if (workspace.whatsappAccount.status !== "connected") throw new ApiError(409, "Scheduling needs a connected WhatsApp account. Save as a draft for now.");
      if (!c.scheduledAt || c.scheduledAt <= now) throw new ApiError(400, "Choose a schedule time in the future.");
    }
    if (!prev) {
      if (c.status !== "draft" && c.status !== "scheduled") throw new ApiError(400, "New campaigns must be saved as a draft or scheduled.");
      put("campaigns", c.id, c);
      log({ type: "campaign_created", message: `Campaign “${c.name}” created`, campaignId: c.id });
      continue;
    }
    if (!EDITABLE.includes(prev.status)) throw new ApiError(409, `“${prev.name}” can no longer be edited.`);
    const status = prev.status === "paused" ? "paused" : c.status === "scheduled" || c.status === "draft" ? c.status : prev.status;
    put("campaigns", c.id, { ...c, status, launchedAt: prev.launchedAt, audienceGroups: prev.status === "paused" ? prev.audienceGroups : c.audienceGroups, segmentIds: prev.status === "paused" ? prev.segmentIds : c.segmentIds });
  }
  for (const cid of payload.campaigns.delete) {
    const prev = existingCampaigns.get(cid);
    if (prev && prev.status !== "draft" && prev.status !== "scheduled") throw new ApiError(409, "Only draft or scheduled campaigns can be deleted.");
    del("campaigns", cid);
  }
  // ---- templates: approval status is Meta's to decide
  if (payload.templates.upsert.length || payload.templates.delete.length) {
    const existing = new Map((await listOwned<WhatsAppTemplate>(workspaceId, "templates")).map((t) => [t.id, t]));
    const busy = new Set((await listOwned<Campaign>(workspaceId, "campaigns")).filter((c) => ["running", "paused", "scheduled"].includes(c.status))
      .flatMap((c) => [c.funnel.message1.templateId, ...Object.values(c.funnel.message2), ...Object.values(c.funnel.message3)].map((a) => (typeof a === "string" ? a : a.type === "send" ? a.templateId : ""))));
    for (const t of payload.templates.upsert) {
      const prev = existing.get(t.id);
      if (t.status === "approved" || t.status === "rejected") {
        if (!prev || prev.status !== t.status) throw new ApiError(403, "Approval status comes from Meta and can’t be set here.");
      }
      if (prev && (prev.status === "approved" || prev.status === "pending")) throw new ApiError(409, `“${prev.name}” is ${prev.status === "approved" ? "approved" : "awaiting Meta review"} and can’t be edited. Create a new template instead.`);
      if ([...existing.values()].some((x) => x.id !== t.id && x.name === t.name && x.language === t.language)) throw new ApiError(409, `A template named ${t.name} (${t.language}) already exists.`);
      put("templates", t.id, { ...t, createdAt: prev?.createdAt ?? now, updatedAt: now, rejectedReason: t.status === "draft" ? undefined : prev?.rejectedReason });
    }
    for (const tid of payload.templates.delete) {
      if (busy.has(tid)) throw new ApiError(409, "This template is used by an active or scheduled campaign.");
      del("templates", tid);
    }
  }

  await commitInChunks(db(), ops);
  return { createdContactIds: createdIds };
}

export type CampaignAction = "launch" | "pause" | "resume" | "stop";

export async function runCampaignAction(workspaceId: string, campaignId: string, action: CampaignAction) {
  const workspace = await requireWorkspace(workspaceId);
  const ref = wsRef(workspaceId);
  const campaignRef = ref.collection("campaigns").doc(campaignId);
  const snap = await campaignRef.get();
  if (!snap.exists || (snap.data()!.workspaceId && snap.data()!.workspaceId !== workspaceId)) throw new ApiError(404, "Campaign not found.");
  const campaign = snap.data() as Campaign;
  const now = new Date().toISOString();
  const withLog = async (update: Partial<Campaign>, type: ActivityEvent["type"], message: string, extra: Op[] = []) =>
    commitInChunks(db(), [...extra, ...(Object.keys(update).length ? [(b: WriteBatch) => b.update(campaignRef as DocumentReference, update)] : []), (b) => logActivity(b, workspaceId, { type, message, campaignId }, now)]);

  /** Atomically move from one of `from` to `to`, so concurrent clicks can't double-apply. */
  const transition = async (from: Campaign["status"][], to: Partial<Campaign>, message: string) =>
    db().runTransaction(async (tx) => {
      const current = (await tx.get(campaignRef)).data() as Campaign;
      if (!from.includes(current.status)) throw new ApiError(409, message);
      tx.update(campaignRef, to);
    });

  if (action === "pause") {
    await transition(["running"], { status: "paused" }, "Only active campaigns can be paused.");
    return withLog({}, "campaign_paused", `“${campaign.name}” paused`);
  }
  if (action === "resume") {
    if (campaign.status !== "paused") throw new ApiError(409, "Only paused campaigns can be resumed.");
    const problems = validateFunnel(campaign.funnel, await listOwned<WhatsAppTemplate>(workspaceId, "templates"));
    if (problems.length) throw new ApiError(400, problems[0]);
    await transition(["paused"], { status: "running" }, "Only paused campaigns can be resumed.");
    return withLog({}, "campaign_resumed", `“${campaign.name}” resumed`);
  }
  if (action === "stop") {
    if (!["running", "paused", "scheduled"].includes(campaign.status)) throw new ApiError(409, "This campaign is not active.");
    await transition(["running", "paused", "scheduled"], { status: "stopped" }, "This campaign is not active.");
    const waiting = await ref.collection("recipients").where("campaignId", "==", campaignId).where("state", "==", "waiting").get();
    const stopped = { ...campaign, status: "stopped" as const };
    return withLog({}, "campaign_cancelled", `“${campaign.name}” cancelled`, waiting.docs.map((d) => (b: WriteBatch) => b.set(d.ref, applyEvent(d.data() as RecipientProgress, { type: "campaign_stopped", at: now }, stopped) as DocumentData)));
  }

  // launch
  if (campaign.status !== "draft" && campaign.status !== "scheduled") throw new ApiError(409, "This campaign has already been launched.");
  if (workspace.whatsappAccount.status !== "connected") throw new ApiError(409, "Sending is unavailable: connect this workspace’s WhatsApp Business account first.");
  const [contacts, templates, segments] = await Promise.all([listOwned<Contact>(workspaceId, "contacts"), listOwned<WhatsAppTemplate>(workspaceId, "templates"), listOwned<Segment>(workspaceId, "segments")]);
  const problems = validateFunnel(campaign.funnel, templates);
  if (problems.length) throw new ApiError(400, problems[0]);
  const audience = resolveAudience(contacts, campaign.audienceGroups, segments.filter((s) => campaign.segmentIds?.includes(s.id)));
  if (!audience.eligible.length) throw new ApiError(400, "No campaign-eligible contacts in the selected audience.");
  const base = (c: Contact) => ({ id: `${campaignId}__${c.id}`, workspaceId, campaignId, contactId: c.id, currentStep: 0 as const, messages: [] });
  const recipients: RecipientProgress[] = [
    ...audience.eligible.map((c) => ({ ...base(c), state: "waiting" as const, nextActionAt: now })),
    ...audience.excluded.map(({ contact, reason }) => ({ ...base(contact), state: "exited" as const, exitReason: contact.optInStatus === "opted_out" ? ("opted_out" as const) : ("not_eligible" as const), exitDetail: reason })),
  ];
  // Claim the launch atomically first — a second click finds the campaign already running.
  await transition(["draft", "scheduled"], { status: "running", launchedAt: now }, "This campaign has already been launched.");
  // Recipients are queued for the sending pipeline; nothing is marked as sent here.
  await withLog({}, "campaign_launched", `“${campaign.name}” launched to ${audience.eligible.length} recipients`, recipients.map((r) => (b: WriteBatch) => b.create(ref.collection("recipients").doc(r.id), r as DocumentData)));
}
