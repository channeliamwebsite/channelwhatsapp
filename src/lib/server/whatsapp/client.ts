/**
 * WhatsApp Cloud API (Meta Graph API) client — SERVER ONLY.
 * The token travels only in the Authorization header and is never logged or
 * included in errors.
 */
import { GRAPH_BASE_URL, isMetaId } from "./config";
import { classifyMetaError, WhatsAppApiError } from "./errors";
import { META_TEMPLATE_FIELDS, parseMetaTemplate, type MetaTemplate } from "./template-sync-rules";

export type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export type ClientOptions = { accessToken: string; apiVersion: string; timeoutMs?: number; fetch?: FetchLike; baseUrl?: string };

export type SendResponse = { messageId: string; waId?: string; messageStatus?: string };

export type PhoneNumberInfo = {
  id: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  codeVerificationStatus?: string;
  platformType?: string;
  status?: string;
  nameStatus?: string;
  messagingLimitTier?: string;
  throughputLevel?: string;
};

const PHONE_FIELDS = "id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,status,name_status,messaging_limit_tier,throughput";

export function createWhatsAppClient(options: ClientOptions) {
  const doFetch: FetchLike = options.fetch ?? ((input, init) => fetch(input, init));
  const base = `${options.baseUrl ?? GRAPH_BASE_URL}/${options.apiVersion}`;
  const timeoutMs = options.timeoutMs ?? 15_000;

  async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await doFetch(`${base}/${path}`, {
        method,
        headers: { Authorization: `Bearer ${options.accessToken}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = (error as Error)?.name === "AbortError";
      throw new WhatsAppApiError({ category: "network", retryable: true, message: timedOut ? `Meta API timed out after ${timeoutMs} ms.` : "Could not reach the Meta API." });
    } finally {
      clearTimeout(timer);
    }

    const raw = await res.text().catch(() => "");
    let json: unknown;
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      throw new WhatsAppApiError({ category: "invalid_response", retryable: res.status >= 500, status: res.status, message: `Meta returned a non-JSON response (HTTP ${res.status}).` });
    }
    const err = (json as { error?: { code?: number; message?: string; fbtrace_id?: string } }).error;
    if (!res.ok || err) {
      const classified = classifyMetaError({ status: res.status, code: err?.code });
      throw new WhatsAppApiError({ ...classified, status: res.status, code: err?.code, fbtraceId: err?.fbtrace_id });
    }
    return json as T;
  }

  return {
    /** POST /{phone-number-id}/messages — returns the WhatsApp message id. */
    async sendMessage(phoneNumberId: string, payload: object): Promise<SendResponse> {
      if (!isMetaId(phoneNumberId)) throw new WhatsAppApiError({ category: "invalid_request", retryable: false, message: "Invalid Phone Number ID." });
      const json = await request<{ messages?: { id?: unknown; message_status?: string }[]; contacts?: { wa_id?: string }[] }>("POST", `${phoneNumberId}/messages`, payload);
      const id = json.messages?.[0]?.id;
      if (typeof id !== "string" || !id) throw new WhatsAppApiError({ category: "invalid_response", retryable: false, message: "Meta accepted the request but returned no message id." });
      return { messageId: id, waId: json.contacts?.[0]?.wa_id, messageStatus: json.messages?.[0]?.message_status };
    },

    /** GET /{phone-number-id} — phone number details (also validates the token). */
    async getPhoneNumber(phoneNumberId: string): Promise<PhoneNumberInfo> {
      if (!isMetaId(phoneNumberId)) throw new WhatsAppApiError({ category: "invalid_request", retryable: false, message: "Invalid Phone Number ID." });
      const j = await request<Record<string, unknown>>("GET", `${phoneNumberId}?fields=${PHONE_FIELDS}`);
      if (typeof j.id !== "string") throw new WhatsAppApiError({ category: "invalid_response", retryable: false, message: "Meta returned no phone number details." });
      const str = (k: string) => (typeof j[k] === "string" ? (j[k] as string) : undefined);
      return {
        id: j.id,
        displayPhoneNumber: str("display_phone_number"),
        verifiedName: str("verified_name"),
        qualityRating: str("quality_rating"),
        codeVerificationStatus: str("code_verification_status"),
        platformType: str("platform_type"),
        status: str("status"),
        nameStatus: str("name_status"),
        messagingLimitTier: str("messaging_limit_tier"),
        throughputLevel: (j.throughput as { level?: string } | undefined)?.level,
      };
    },

    /** GET /{waba-id}/phone_numbers — ids of numbers registered under the WABA. */
    async listPhoneNumberIds(wabaId: string): Promise<string[]> {
      if (!isMetaId(wabaId)) throw new WhatsAppApiError({ category: "invalid_request", retryable: false, message: "Invalid WhatsApp Business Account ID." });
      const j = await request<{ data?: { id?: unknown }[] }>("GET", `${wabaId}/phone_numbers?fields=id&limit=100`);
      if (!Array.isArray(j.data)) throw new WhatsAppApiError({ category: "invalid_response", retryable: false, message: "Meta returned no phone number list." });
      return j.data.map((d) => d.id).filter((x): x is string => typeof x === "string");
    },

    /**
     * GET /{waba-id}/message_templates — EVERY page (needs whatsapp_business_management).
     * Throws rather than return a partial list: a partial list would make the
     * sync treat the missing templates as deleted.
     */
    async listTemplates(wabaId: string, maxPages = 50): Promise<MetaTemplate[]> {
      if (!isMetaId(wabaId)) throw new WhatsAppApiError({ category: "invalid_request", retryable: false, message: "Invalid WhatsApp Business Account ID." });
      const templates: MetaTemplate[] = [];
      let after: string | undefined;
      for (let page = 0; page < maxPages; page++) {
        const query = new URLSearchParams({ fields: META_TEMPLATE_FIELDS, limit: "100", ...(after ? { after } : {}) });
        const j = await request<{ data?: unknown[]; paging?: { cursors?: { after?: unknown }; next?: unknown } }>("GET", `${wabaId}/message_templates?${query}`);
        if (!Array.isArray(j.data)) throw new WhatsAppApiError({ category: "invalid_response", retryable: false, message: "Meta returned no template list." });
        for (const item of j.data) {
          const t = parseMetaTemplate(item);
          if (!t) throw new WhatsAppApiError({ category: "invalid_response", retryable: false, message: "Meta returned a template in an unexpected format." });
          templates.push(t);
        }
        const cursor = j.paging?.cursors?.after;
        after = typeof j.paging?.next === "string" && typeof cursor === "string" && cursor ? cursor : undefined;
        if (!after) return templates;
      }
      throw new WhatsAppApiError({ category: "invalid_response", retryable: false, message: `More than ${maxPages * 100} templates — sync stopped without changes.` });
    },
  };
}

export type WhatsAppClient = ReturnType<typeof createWhatsAppClient>;
