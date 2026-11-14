/** Cloud API message payload builders (pure — unit tested). */
import { validatePhone } from "@/lib/contacts/phone";
import { placeholderCount } from "@/lib/funnel/variables";
import type { WhatsAppTemplate } from "@/types/template";

export class PayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayloadError";
  }
}

/** Cloud API expects the number in international format without "+". */
export function toRecipient(phone: string) {
  const result = validatePhone(phone);
  if (!result.valid) throw new PayloadError(`Invalid recipient number: ${result.error}`);
  return result.e164.slice(1);
}

export function buildTextPayload(to: string, body: string, previewUrl = false) {
  const text = body.trim();
  if (!text) throw new PayloadError("Message text is empty.");
  if (text.length > 4096) throw new PayloadError("Message text exceeds 4096 characters.");
  return { messaging_product: "whatsapp", recipient_type: "individual", to: toRecipient(to), type: "text", text: { body: text, preview_url: previewUrl } };
}

type Component = { type: "body" | "header"; parameters: { type: "text"; text: string }[] };

/**
 * Template payload from a dashboard template record. Only templates whose
 * status is "approved" (set exclusively by Meta sync) may be sent.
 */
export function buildTemplatePayload(to: string, template: WhatsAppTemplate, variables: string[]) {
  if (template.status !== "approved") throw new PayloadError(`Template “${template.name}” is not approved by Meta.`);
  if (!/^[a-z0-9_]{1,512}$/.test(template.name)) throw new PayloadError("Invalid template name.");
  if (!/^[a-z]{2,3}(_[A-Z]{2})?$/.test(template.language)) throw new PayloadError("Invalid template language code.");
  if (template.header && template.header.type !== "none" && template.header.type !== "text") {
    throw new PayloadError("Media headers need a media URL, which templates don’t store yet.");
  }
  if (template.header?.type === "text" && /\{\{\d+\}\}/.test(template.header.text ?? "")) {
    throw new PayloadError("Header variables are not supported yet.");
  }
  if (template.buttons.some((b) => b.type === "url" && /\{\{\d+\}\}/.test(b.url))) {
    throw new PayloadError("Dynamic URL buttons are not supported yet.");
  }
  const needed = placeholderCount([template]);
  const values = variables.slice(0, needed).map((v) => v.trim());
  if (values.length < needed || values.some((v) => !v)) throw new PayloadError(`Template “${template.name}” needs ${needed} non-empty variable(s).`);
  if (values.some((v) => v.length > 1024 || /[\n\t]| {5,}/.test(v))) throw new PayloadError("Template variables can’t contain new lines, tabs, more than 4 spaces in a row, or exceed 1024 characters.");

  const components: Component[] = needed ? [{ type: "body", parameters: values.map((text) => ({ type: "text", text })) }] : [];
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toRecipient(to),
    type: "template",
    template: { name: template.name, language: { code: template.language }, ...(components.length ? { components } : {}) },
  };
}

/** Template by name with no parameters (e.g. Meta’s sample "hello_world") — Meta validates approval. */
export function buildNamedTemplatePayload(to: string, name: string, languageCode: string) {
  if (!/^[a-z0-9_]{1,512}$/.test(name)) throw new PayloadError("Invalid template name.");
  if (!/^[a-z]{2,3}(_[A-Z]{2})?$/.test(languageCode)) throw new PayloadError("Invalid language code (e.g. en_US).");
  return { messaging_product: "whatsapp", recipient_type: "individual", to: toRecipient(to), type: "template", template: { name, language: { code: languageCode } } };
}
