import type { FunnelDefinition } from "@/types/campaign";
import type { WhatsAppTemplate } from "@/types/template";

import { BRANCHES, BRANCH_LABEL } from "./engine";

export const WAIT_LIMITS = { min: 1, max: 336 } as const;

/** Returns human-readable problems; empty array = funnel can launch. */
export function validateFunnel(f: FunnelDefinition, templates: WhatsAppTemplate[]): string[] {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const problems: string[] = [];
  const checkTemplate = (id: string, where: string) => {
    const t = byId.get(id);
    if (!t) problems.push(`${where}: choose a template.`);
    else if (t.status !== "approved") problems.push(`${where}: “${t.name}” is not approved by Meta.`);
  };
  checkTemplate(f.message1.templateId, "Message 1");
  if (f.retry.maxAttempts < 0 || f.retry.maxAttempts > 5 || f.retry.delayMinutes < 1 || f.retry.delayMinutes > 1440) problems.push("Retries must be 0–5 attempts with a 1–1440 minute delay.");
  for (const [label, hours] of [["First wait", f.wait1Hours], ["Second wait", f.wait2Hours]] as const) {
    if (!Number.isFinite(hours) || hours < WAIT_LIMITS.min || hours > WAIT_LIMITS.max) problems.push(`${label} must be between ${WAIT_LIMITS.min} and ${WAIT_LIMITS.max} hours.`);
  }
  for (const step of [2, 3] as const) {
    const actions = step === 2 ? f.message2 : f.message3;
    for (const b of BRANCHES) {
      const a = actions[b];
      if (b === "replied" && f.exitOnReply && a.type !== "exit") problems.push(`Message ${step} · ${BRANCH_LABEL[b]} must exit the funnel.`);
      if (a.type === "send") checkTemplate(a.templateId, `Message ${step} · ${BRANCH_LABEL[b]}`);
    }
  }
  return problems;
}
