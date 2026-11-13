/** Server-side validation for everything the client may write. Unknown keys are stripped. */
import { z } from "zod";

import { CONSENT_SOURCES } from "@/types/contact";

const id = z.string().regex(/^[A-Za-z0-9_\-:.]{1,120}$/, "invalid id");
const text = (max = 200) => z.string().trim().max(max);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""));
const isoDateTime = z.string().datetime({ offset: true });
const names = (max = 80) => z.array(text(max).min(1)).max(50);

export const contactSchema = z.object({
  id,
  fullName: text(120).min(1),
  phone: text(32).min(1),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(200)]),
  country: text(80),
  city: text(80),
  organisation: text(160),
  designation: text(120),
  audienceGroups: names(),
  tags: names(60),
  customFields: z.record(text(40).min(1), text(500)).refine((r) => Object.keys(r).length <= 30, "at most 30 custom fields").optional(),
  optInStatus: z.enum(["opted_in", "pending", "opted_out"]),
  consentSource: z.enum([...CONSENT_SOURCES, ""]),
  consentDate: isoDate,
  createdAt: isoDateTime,
}).refine((c) => c.optInStatus !== "opted_in" || (c.consentSource && c.consentDate), { message: "opted-in contacts need a consent source and date", path: ["consentSource"] });

export const audienceGroupSchema = z.object({ id, name: text(80).min(1), description: text(300), createdAt: isoDateTime });
export const tagSchema = z.object({ id, name: text(60).min(1), createdAt: isoDateTime });

export const segmentSchema = z.object({
  id,
  name: text(80).min(1),
  createdAt: isoDateTime,
  filter: z.object({
    groups: names(), groupsMatch: z.enum(["any", "all"]),
    tags: names(60), tagsMatch: z.enum(["any", "all"]),
    optInStatuses: z.array(z.enum(["opted_in", "pending", "opted_out"])).max(3),
    eligibleOnly: z.boolean(),
    addedAfter: isoDate, addedBefore: isoDate,
    customField: z.object({ key: text(40).min(1), value: text(500) }).nullable(),
  }),
});

const branchAction = z.discriminatedUnion("type", [z.object({ type: z.literal("send"), templateId: id }), z.object({ type: z.literal("exit") })]);
const branchMap = z.object({ clicked: branchAction, read_not_clicked: branchAction, not_read: branchAction, replied: branchAction, failed: branchAction });
const variable = z.discriminatedUnion("type", [
  z.object({ type: z.literal("field"), field: z.enum(["firstName", "fullName", "organisation", "city", "country", "designation"]) }),
  z.object({ type: z.literal("custom"), key: text(40).min(1) }),
  z.object({ type: z.literal("static"), value: text(500) }),
]);

export const campaignSchema = z.object({
  id,
  name: text(160).min(1),
  description: text(500),
  objective: text(300).optional(),
  status: z.enum(["draft", "scheduled", "running", "paused", "completed", "stopped", "failed"]),
  audienceGroups: names(),
  segmentIds: z.array(id).max(20).optional(),
  variables: z.array(variable).max(10).optional(),
  trackLinks: z.boolean().optional(),
  whatsappAccountId: text(120),
  funnel: z.object({
    message1: z.object({ templateId: z.string().max(120) }),
    wait1Hours: z.number().min(1).max(336),
    message2: branchMap,
    wait2Hours: z.number().min(1).max(336),
    message3: branchMap,
    exitOnConversion: z.boolean(),
    exitOnReply: z.boolean(),
    retry: z.object({ maxAttempts: z.number().int().min(0).max(5), delayMinutes: z.number().int().min(1).max(1440) }),
  }),
  conversionGoal: z.discriminatedUnion("type", [
    z.object({ type: z.literal("link_click"), url: z.string().max(2000) }),
    z.object({ type: z.literal("reply") }),
    z.object({ type: z.literal("none") }),
  ]),
  createdAt: isoDateTime,
  scheduledAt: isoDateTime.optional(),
});

const changes = <T extends z.ZodType>(item: T) => z.object({ upsert: z.array(item).max(5000).default([]), delete: z.array(id).max(5000).default([]) }).default({ upsert: [], delete: [] });

const templateName = z.string().regex(/^[a-z0-9_]{1,512}$/, "use lowercase letters, numbers and underscores");
export const templateSchema = z.object({
  id,
  name: templateName,
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  language: z.string().regex(/^[a-z]{2}(_[A-Z]{2})?$/),
  status: z.enum(["draft", "pending", "approved", "rejected"]),
  header: z.object({ type: z.enum(["none", "text", "image", "document", "video"]), text: text(60).optional() }).optional(),
  body: z.string().trim().min(1).max(1024),
  footer: text(60).optional(),
  buttons: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("url"), text: text(25).min(1), url: z.string().url().max(2000) }),
    z.object({ type: z.literal("quick_reply"), text: text(25).min(1) }),
    z.object({ type: z.literal("phone"), text: text(25).min(1), phone: text(20).min(5) }),
  ])).max(10),
  examples: z.array(text(200)).max(20).optional(),
  createdAt: isoDateTime.optional(),
});

const condition = z.object({ field: z.enum(["optInStatus", "group", "tag", "customField"]), operator: z.enum(["is", "is_not"]), value: text(200), key: text(40).optional() });
const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("send_template"), templateId: id }),
  z.object({ type: z.enum(["add_tag", "remove_tag"]), tag: text(60).min(1) }),
  z.object({ type: z.enum(["add_to_group", "remove_from_group"]), group: text(80).min(1) }),
  z.object({ type: z.literal("set_custom_field"), key: text(40).min(1), value: text(500) }),
]);
export const automationSchema = z.object({
  id,
  name: text(120).min(1),
  enabled: z.boolean(),
  trigger: z.object({
    type: z.enum(["contact_added", "message_read", "link_clicked", "contact_replied", "message_failed", "scheduled"]),
    campaignId: id.optional(),
    runAt: isoDateTime.optional(),
  }).refine((t) => t.type !== "scheduled" || t.runAt, { message: "scheduled automations need a time", path: ["runAt"] }),
  conditions: z.array(condition).max(10),
  actions: z.array(action).min(1).max(10),
  delayMinutes: z.number().int().min(0).max(60 * 24 * 30),
  createdAt: isoDateTime,
});

export const whatsappConfigSchema = z.object({
  businessName: text(120),
  displayName: text(120),
  phoneNumber: z.union([z.literal(""), z.string().regex(/^\+\d{8,15}$/, "use E.164 format, e.g. +919876543210")]),
  phoneNumberId: z.union([z.literal(""), z.string().regex(/^\d{5,30}$/, "numeric ID from Meta")]),
  wabaId: z.union([z.literal(""), z.string().regex(/^\d{5,30}$/, "numeric ID from Meta")]),
});

export const replySchema = z.object({ text: z.string().trim().min(1).max(4096) });
export const conversationPatchSchema = z.object({ status: z.enum(["open", "pending", "closed"]).optional(), markRead: z.boolean().optional() });

export const syncSchema = z.object({
  templates: changes(templateSchema),
  automations: changes(automationSchema),
  contacts: changes(contactSchema),
  audienceGroups: changes(audienceGroupSchema),
  tags: changes(tagSchema),
  segments: changes(segmentSchema),
  campaigns: changes(campaignSchema),
});
export type SyncPayload = z.infer<typeof syncSchema>;

const httpsUrl = z.union([z.literal(""), z.string().trim().url().max(500).refine((u) => u.startsWith("https://"), "must start with https://")]);

export const workspaceCreateSchema = z.object({ name: text(80).min(1), industry: text(120) });
export const workspaceUpdateSchema = z.object({
  name: text(80).min(1),
  industry: text(120),
  description: text(1000),
  logoUrl: httpsUrl,
  website: httpsUrl,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  settings: z.object({
    defaultCountry: text(80).min(1),
    timezone: text(60).min(1),
    notifications: z.object({ campaigns: z.boolean(), failures: z.boolean(), automations: z.boolean() }).optional(),
    tracking: z.object({ enabled: z.boolean(), utmSource: text(60), utmMedium: text(60), utmCampaign: text(100) }).optional(),
  }),
});
