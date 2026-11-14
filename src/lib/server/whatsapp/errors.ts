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
  { codes: [368, 131031, 131042, 131045, 133005, 133010, 133006], category: "account", retryable: false, message: "WhatsApp Business account issue (locked, unpaid, unregistered or not verified)." },
  { codes: [132000, 132001, 132005, 132007, 132012, 132015, 132016, 132068, 132069], category: "template", retryable: false, message: "Template rejected by Meta (missing, paused, disabled, or parameters don't match)." },
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

/** Error thrown by the Graph API client. Safe to show to the Super Admin. */
export class WhatsAppApiError extends Error {
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  readonly status?: number;
  readonly code?: number;
  readonly fbtraceId?: string;

  constructor(info: ClassifiedError & { status?: number; code?: number; fbtraceId?: string }) {
    super(info.message);
    this.name = "WhatsAppApiError";
    this.category = info.category;
    this.retryable = info.retryable;
    this.status = info.status;
    this.code = info.code;
    this.fbtraceId = info.fbtraceId;
  }
}
