/**
 * Meta / WhatsApp Cloud API error classification.
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 * Never put access tokens or message bodies into these messages.
 */
export type ErrorCategory =
  | "auth" | "permission" | "rate_limit" | "temporary" | "recipient" | "window"
  | "template" | "policy" | "account" | "not_found" | "invalid_request" | "network" | "invalid_response" | "unknown";

export type ClassifiedError = { category: ErrorCategory; retryable: boolean; message: string };

type Rule = { codes: number[]; category: ErrorCategory; retryable: boolean; message: string };

const RULES: Rule[] = [
  { codes: [190], category: "auth", retryable: false, message: "Access token is invalid or expired." },
  { codes: [0, 102, 104], category: "auth", retryable: false, message: "Authentication with Meta failed." },
  { codes: [3, 10, 200, 299], category: "permission", retryable: false, message: "The access token lacks the required WhatsApp permissions." },
  { codes: [4, 80007, 130429], category: "rate_limit", retryable: true, message: "Meta rate limit reached. Retry later." },
  { codes: [131056], category: "rate_limit", retryable: true, message: "Too many messages to this recipient in a short time (pair rate limit)." },
  { codes: [1, 2, 131000, 131016, 133004], category: "temporary", retryable: true, message: "WhatsApp service is temporarily unavailable." },
  { codes: [131026], category: "recipient", retryable: false, message: "Message undeliverable (recipient may not be on WhatsApp or hasn't accepted the latest terms)." },
  { codes: [131021], category: "recipient", retryable: false, message: "Sender and recipient numbers are the same." },
  { codes: [131047], category: "window", retryable: false, message: "More than 24 hours since the customer last replied — use an approved template." },
  { codes: [131049], category: "policy", retryable: false, message: "Meta chose not to deliver this marketing message (per-user marketing limit)." },
  { codes: [131050], category: "recipient", retryable: false, message: "The recipient has stopped marketing messages from this business." },
  { codes: [131042], category: "account", retryable: false, message: "Payment issue: the WhatsApp Business Account has no valid payment method, or a payment failed. In Business Settings → Billing & payments → WhatsApp Business accounts, add or fix the payment method." },
  { codes: [131031], category: "account", retryable: false, message: "The WhatsApp Business Account is locked by Meta (policy or integrity). Check WhatsApp Manager → Account quality." },
  { codes: [368], category: "account", retryable: false, message: "Temporarily blocked by Meta for a policy violation. Check WhatsApp Manager → Account quality." },
  { codes: [131045, 133010], category: "account", retryable: false, message: "The phone number is not registered for the Cloud API. Register it in WhatsApp Manager → Phone numbers." },
  { codes: [133005], category: "account", retryable: false, message: "Two-step verification PIN mismatch for this phone number." },
  { codes: [133006], category: "account", retryable: false, message: "The phone number must be re-verified before it can send messages." },
  { codes: [132000], category: "template", retryable: false, message: "The number of variables sent doesn't match the template. A template with {{1}}, {{2}} … needs a value for each; the test sender sends none, so use a template without variables." },
  { codes: [132001], category: "template", retryable: false, message: "This template doesn't exist in this language in the WhatsApp Business Account. Check the exact name and language code (e.g. en vs en_US), or use Templates → Sync from Meta to see what exists." },
  { codes: [132005], category: "template", retryable: false, message: "A variable value makes the template text too long." },
  { codes: [132007], category: "template", retryable: false, message: "The template content violates a WhatsApp policy." },
  { codes: [132012], category: "template", retryable: false, message: "A variable value has the wrong format for this template (for example text where media is expected)." },
  { codes: [132015], category: "template", retryable: false, message: "The template is paused by Meta because of low quality. Edit it in WhatsApp Manager or wait for it to resume." },
  { codes: [132016], category: "template", retryable: false, message: "The template is disabled by Meta and can no longer be sent." },
  { codes: [132068, 132069], category: "template", retryable: false, message: "The template’s flow is blocked or throttled by Meta." },
  { codes: [100, 131008, 131009, 131051, 131052, 131053, 135000], category: "invalid_request", retryable: false, message: "Meta rejected the request parameters." },
];

/** Classify a Graph API error (or an HTTP status without a Meta error body). */
export function classifyMetaError(input: { status?: number; code?: number; subcode?: number; message?: string }): ClassifiedError {
  if (input.code === 190 && input.subcode === 463) return { category: "auth", retryable: false, message: "Access token has expired (code 190/463)." };
  if (input.code === 190) return { category: "auth", retryable: false, message: `Access token is invalid${input.subcode ? ` (code 190/${input.subcode})` : " or expired (code 190)"}.` };
  // "Unsupported get request. Object … does not exist, cannot be loaded due to missing permissions"
  if (input.code === 100 && input.subcode === 33) return { category: "not_found", retryable: false, message: "Object not found, or the token has no access to it (code 100/33)." };
  if (typeof input.code === "number") {
    const rule = RULES.find((r) => r.codes.includes(input.code!));
    if (rule) return { category: rule.category, retryable: rule.retryable, message: `${rule.message} (code ${input.code})` };
  }
  const status = input.status ?? 0;
  if (status === 401) return { category: "auth", retryable: false, message: "Access token is invalid or expired." };
  if (status === 403) return { category: "permission", retryable: false, message: "Access denied by Meta." };
  if (status === 429) return { category: "rate_limit", retryable: true, message: "Meta rate limit reached. Retry later." };
  if (status >= 500) return { category: "temporary", retryable: true, message: `Meta returned HTTP ${status}.` };
  if (status >= 400) return { category: "invalid_request", retryable: false, message: `Meta rejected the request (HTTP ${status}${typeof input.code === "number" ? `, code ${input.code}` : ""}).` };
  return { category: "unknown", retryable: false, message: "Unknown WhatsApp API error." };
}

/**
 * Meta's own explanation (error_data.details), made safe to show: control
 * characters removed, phone-number-like digit runs and token-like strings
 * redacted, length capped.
 */
export function safeMetaDetails(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\bEAA[A-Za-z0-9]{10,}\b/g, "[redacted]")
    .replace(/\+?\d[\d\s-]{7,}\d/g, "[number]")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return undefined;
  return cleaned.length > 240 ? `${cleaned.slice(0, 239)}…` : cleaned;
}

/** Error thrown by the Graph API client. Safe to show to the Super Admin. */
export class WhatsAppApiError extends Error {
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  readonly status?: number;
  readonly code?: number;
  readonly fbtraceId?: string;
  /** Sanitised Meta explanation, when Meta gave one. */
  readonly details?: string;

  constructor(info: ClassifiedError & { status?: number; code?: number; fbtraceId?: string; details?: string }) {
    // Template / parameter errors are much clearer with Meta's own explanation attached.
    super(info.details && (info.category === "template" || info.category === "invalid_request") ? `${info.message} Meta: “${info.details}”` : info.message);
    this.details = info.details;
    this.name = "WhatsAppApiError";
    this.category = info.category;
    this.retryable = info.retryable;
    this.status = info.status;
    this.code = info.code;
    this.fbtraceId = info.fbtraceId;
  }
}
