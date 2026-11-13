import type { VariableSource } from "@/types/campaign";
import type { Contact } from "@/types/contact";
import type { WhatsAppTemplate } from "@/types/template";

/** Values for {{1}}, {{2}} … for one recipient. */
export function resolveVariables(sources: VariableSource[] | undefined, contact: Contact) {
  return (sources ?? []).map((s) => {
    if (s.type === "static") return s.value;
    if (s.type === "custom") return contact.customFields?.[s.key] ?? "";
    if (s.field === "firstName") return contact.fullName.split(/\s+/)[0] ?? "";
    return contact[s.field] ?? "";
  });
}

/** Highest placeholder number used by any of the templates. */
export function placeholderCount(templates: (WhatsAppTemplate | undefined)[]) {
  let max = 0;
  for (const t of templates) for (const m of t?.body.matchAll(/\{\{(\d+)\}\}/g) ?? []) max = Math.max(max, Number(m[1]));
  return max;
}

export function renderBody(body: string, values: string[]) {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => values[Number(n) - 1] || `{{${n}}}`);
}
