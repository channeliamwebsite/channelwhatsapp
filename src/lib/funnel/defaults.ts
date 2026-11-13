import type { FunnelDefinition } from "@/types/campaign";

/** Empty starting funnel: Message 1 must be chosen; follow-ups default to exit. */
export function defaultFunnel(): FunnelDefinition {
  const exit = { type: "exit" as const };
  const branches = { clicked: exit, read_not_clicked: exit, not_read: exit, replied: exit, failed: exit };
  return {
    message1: { templateId: "" },
    wait1Hours: 24,
    message2: { ...branches },
    wait2Hours: 48,
    message3: { ...branches },
    exitOnConversion: true,
    exitOnReply: true,
    retry: { maxAttempts: 2, delayMinutes: 15 },
  };
}
