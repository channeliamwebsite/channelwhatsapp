/**
 * Meta template sync rules — pure (no I/O), unit tested.
 * Meta is the only source of truth for template approval status.
 */
import type { TemplateButton, TemplateCategory, TemplateStatus, WhatsAppTemplate } from "@/types/template";

type MetaButton = { type: string; text?: string; url?: string; phone_number?: string };
type MetaComponent = { type: string; format?: string; text?: string; buttons?: MetaButton[] };

export type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  rejected_reason?: string;
  components: MetaComponent[];
};

/** Fields requested from GET /{waba-id}/message_templates. */
export const META_TEMPLATE_FIELDS = "id,name,language,status,category,rejected_reason,components";

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

/** Validates one item of Meta's template list. Returns null if it doesn't look like a template. */
export function parseMetaTemplate(raw: unknown): MetaTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id), name = str(r.name), language = str(r.language), status = str(r.status);
  if (!id || !/^\d{1,30}$/.test(id) || !name || !language || !status) return null;
  const components = Array.isArray(r.components)
    ? r.components.filter((c): c is MetaComponent => Boolean(c) && typeof (c as MetaComponent).type === "string")
    : [];
  return { id, name, language, status, category: str(r.category), rejected_reason: str(r.rejected_reason), components };
}

/**
 * Meta status → dashboard status. Anything that is not clearly sendable or
 * temporarily paused (DISABLED, DELETED, PENDING_DELETION, LIMIT_EXCEEDED,
 * ARCHIVED, unknown values) maps to "disabled": fail closed.
 */
export function mapMetaStatus(status: string): Exclude<TemplateStatus, "draft"> {
  switch (status.toUpperCase()) {
    case "APPROVED": return "approved";
    case "PENDING":
    case "IN_APPEAL": return "pending";
    case "REJECTED": return "rejected";
    case "PAUSED": return "paused";
    default: return "disabled";
  }
}

const CATEGORIES: TemplateCategory[] = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const HEADER_FORMATS = { TEXT: "text", IMAGE: "image", DOCUMENT: "document", VIDEO: "video" } as const;

type Content = Pick<WhatsAppTemplate, "category" | "header" | "body" | "footer" | "buttons" | "unsupportedReason">;

/** Converts Meta components into the dashboard template shape, noting anything we can't send. */
export function contentFromMeta(t: MetaTemplate): Content {
  const unsupported: string[] = [];
  const category = CATEGORIES.find((c) => c === t.category?.toUpperCase()) ?? "MARKETING";
  if (category === "AUTHENTICATION") unsupported.push("authentication templates");
  let header: WhatsAppTemplate["header"] = { type: "none" };
  let body = "";
  let footer: string | undefined;
  const buttons: TemplateButton[] = [];
  for (const c of t.components) {
    const type = c.type.toUpperCase();
    if (type === "HEADER") {
      const format = HEADER_FORMATS[(c.format ?? "TEXT").toUpperCase() as keyof typeof HEADER_FORMATS];
      if (!format) unsupported.push(`${(c.format ?? "").toLowerCase()} headers`);
      else header = format === "text" ? { type: "text", text: c.text ?? "" } : { type: format };
    } else if (type === "BODY") body = c.text ?? "";
    else if (type === "FOOTER") footer = c.text || undefined;
    else if (type === "BUTTONS") {
      for (const b of c.buttons ?? []) {
        const bt = b.type.toUpperCase();
        if (bt === "URL") buttons.push({ type: "url", text: b.text ?? "", url: b.url ?? "" });
        else if (bt === "QUICK_REPLY") buttons.push({ type: "quick_reply", text: b.text ?? "" });
        else if (bt === "PHONE_NUMBER") buttons.push({ type: "phone", text: b.text ?? "", phone: b.phone_number ?? "" });
        else unsupported.push(`${bt.toLowerCase().replace(/_/g, " ")} buttons`);
      }
    } else unsupported.push(`${type.toLowerCase()} components`);
  }
  return {
    category, header, body, footer, buttons,
    unsupportedReason: unsupported.length ? `Not supported for sending yet: ${[...new Set(unsupported)].join(", ")}.` : undefined,
  };
}

export const NOT_FOUND_DETAIL = "No longer found in this WhatsApp Business Account.";

export type SyncPlan = {
  /** Full template records to write (only those that changed). */
  writes: WhatsAppTemplate[];
  created: number;
  updated: number;
  unchanged: number;
  /** Previously synced templates that Meta no longer returns (now disabled). */
  missing: number;
};

const SYNCED_FIELDS = ["name", "language", "status", "metaStatus", "metaTemplateId", "wabaId", "category", "header", "body", "footer", "buttons", "rejectedReason", "unsupportedReason", "statusDetail"] as const;
const fingerprint = (t: Partial<WhatsAppTemplate>) => JSON.stringify(SYNCED_FIELDS.map((k) => t[k] ?? null));

/**
 * Plans how a COMPLETE Meta template list updates a workspace's templates.
 *  - Matches by Meta template id, then by name + language (so a dashboard
 *    draft becomes the Meta template instead of a duplicate).
 *  - Templates Meta no longer returns, that were previously synced, become
 *    "disabled" so they can't be sent.
 *  - Dashboard drafts unknown to Meta are left untouched.
 * Must only be called with the full list (all pages fetched successfully).
 */
export function planTemplateSync(
  local: WhatsAppTemplate[],
  meta: MetaTemplate[],
  ctx: { workspaceId: string; wabaId: string; now: string; newId: () => string },
): SyncPlan {
  const key = (name: string, language: string) => `${name}|${language}`;
  const byMetaId = new Map(local.filter((t) => t.metaTemplateId).map((t) => [t.metaTemplateId!, t]));
  const byKey = new Map(local.map((t) => [key(t.name, t.language), t]));
  const plan: SyncPlan = { writes: [], created: 0, updated: 0, unchanged: 0, missing: 0 };
  const matched = new Set<string>();
  const seenMeta = new Set<string>();

  for (const m of meta) {
    if (seenMeta.has(m.id)) continue;
    seenMeta.add(m.id);
    const existing = byMetaId.get(m.id) ?? byKey.get(key(m.name, m.language));
    if (existing) matched.add(existing.id);
    const status = mapMetaStatus(m.status);
    const rejected = m.rejected_reason && m.rejected_reason.toUpperCase() !== "NONE" ? m.rejected_reason.replace(/_/g, " ").toLowerCase() : undefined;
    const next: WhatsAppTemplate = {
      ...(existing ?? { id: ctx.newId(), createdAt: ctx.now }),
      ...contentFromMeta(m),
      workspaceId: ctx.workspaceId,
      name: m.name,
      language: m.language,
      status,
      metaStatus: m.status.toUpperCase(),
      metaTemplateId: m.id,
      wabaId: ctx.wabaId,
      rejectedReason: status === "rejected" || status === "paused" || status === "disabled" ? rejected : undefined,
      statusDetail: undefined,
    };
    if (existing && fingerprint(existing) === fingerprint(next)) {
      plan.unchanged++;
      continue;
    }
    plan.writes.push({ ...next, updatedAt: ctx.now });
    if (existing) plan.updated++;
    else plan.created++;
  }

  for (const t of local) {
    if (!t.metaTemplateId || matched.has(t.id)) continue;
    if (t.status === "disabled" && t.statusDetail === NOT_FOUND_DETAIL) continue;
    plan.writes.push({ ...t, workspaceId: ctx.workspaceId, status: "disabled", metaStatus: "NOT_FOUND", statusDetail: NOT_FOUND_DETAIL, updatedAt: ctx.now });
    plan.missing++;
  }
  return plan;
}
