/**
 * Parses and validates WhatsApp Cloud API webhook payloads (object
 * "whatsapp_business_account"). Pure — unit tested. Anything malformed is
 * dropped individually instead of failing the whole delivery.
 */
import type { MessageType } from "@/types/conversation";

export type InboundEvent = {
  waMessageId: string;
  from: string;
  timestamp: string;
  type: MessageType;
  text?: string;
  media?: { mediaId?: string; mimeType?: string; filename?: string; caption?: string };
  /** WhatsApp id of the message this one replies to (context.id). */
  contextId?: string;
  /** Quick-reply / interactive payload id, used for opt-out buttons. */
  buttonPayload?: string;
};

export type StatusEvent = {
  waMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipientId?: string;
  error?: { code?: number; title?: string };
};

export type WebhookBatch = { phoneNumberId: string; inbound: InboundEvent[]; statuses: StatusEvent[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 4096) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined);
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

/** Meta timestamps are Unix seconds as strings. */
export function metaTimestamp(v: unknown): string | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000_000) return undefined;
  return new Date(n * 1000).toISOString();
}

const MEDIA: MessageType[] = ["image", "document", "audio", "video"];

function parseMessage(m: unknown): InboundEvent | null {
  if (!isObj(m)) return null;
  const waMessageId = str(m.id, 256);
  const from = str(m.from, 32);
  const timestamp = metaTimestamp(m.timestamp);
  const type = str(m.type, 32);
  if (!waMessageId || !from || !/^\d{6,15}$/.test(from) || !timestamp || !type) return null;
  const base = { waMessageId, from, timestamp, contextId: isObj(m.context) ? str(m.context.id, 256) : undefined };

  if (type === "text" && isObj(m.text)) return { ...base, type: "text", text: str(m.text.body) ?? "" };
  if (MEDIA.includes(type as MessageType) && isObj(m[type])) {
    const media = m[type] as Record<string, unknown>;
    return { ...base, type: type as MessageType, text: str(media.caption), media: { mediaId: str(media.id, 256), mimeType: str(media.mime_type, 128), filename: str(media.filename, 256), caption: str(media.caption) } };
  }
  if (type === "button" && isObj(m.button)) {
    return { ...base, type: "text", text: str(m.button.text, 256) ?? "", buttonPayload: str(m.button.payload, 256) };
  }
  if (type === "interactive" && isObj(m.interactive)) {
    const reply = isObj(m.interactive.button_reply) ? m.interactive.button_reply : isObj(m.interactive.list_reply) ? m.interactive.list_reply : null;
    return { ...base, type: "text", text: reply ? str(reply.title, 256) ?? "" : "[interactive message]", buttonPayload: reply ? str(reply.id, 256) : undefined };
  }
  // location, contacts, sticker, reaction, unsupported… stored as a labelled text placeholder.
  return { ...base, type: "text", text: `[${type.replace(/[^a-z_]/g, "")} message]` };
}

function parseStatus(s: unknown): StatusEvent | null {
  if (!isObj(s)) return null;
  const waMessageId = str(s.id, 256);
  const status = str(s.status, 16);
  const timestamp = metaTimestamp(s.timestamp);
  if (!waMessageId || !timestamp || !status || !["sent", "delivered", "read", "failed"].includes(status)) return null;
  const e = arr(s.errors)[0];
  return {
    waMessageId,
    status: status as StatusEvent["status"],
    timestamp,
    recipientId: str(s.recipient_id, 32),
    error: isObj(e) ? { code: typeof e.code === "number" ? e.code : undefined, title: str(e.title, 200) } : undefined,
  };
}

export function parseWebhookPayload(body: unknown): { batches: WebhookBatch[]; dropped: number } {
  let dropped = 0;
  const batches: WebhookBatch[] = [];
  if (!isObj(body) || body.object !== "whatsapp_business_account") return { batches, dropped: 1 };
  for (const entry of arr(body.entry)) {
    if (!isObj(entry)) { dropped++; continue; }
    for (const change of arr(entry.changes)) {
      if (!isObj(change) || change.field !== "messages" || !isObj(change.value)) { dropped++; continue; }
      const value = change.value;
      const phoneNumberId = isObj(value.metadata) ? str(value.metadata.phone_number_id, 64) : undefined;
      if (!phoneNumberId || !/^\d{5,30}$/.test(phoneNumberId)) { dropped++; continue; }
      const inbound: InboundEvent[] = [];
      const statuses: StatusEvent[] = [];
      for (const m of arr(value.messages)) {
        const parsed = parseMessage(m);
        if (parsed) inbound.push(parsed); else dropped++;
      }
      for (const s of arr(value.statuses)) {
        const parsed = parseStatus(s);
        if (parsed) statuses.push(parsed); else dropped++;
      }
      batches.push({ phoneNumberId, inbound, statuses });
    }
  }
  return { batches, dropped };
}
