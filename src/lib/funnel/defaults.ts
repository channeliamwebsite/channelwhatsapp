import type { FunnelDefinition } from "@/types/campaign";

/** Sensible starting funnel using a workspace's standard templates. */
export function defaultFunnel(workspaceId: string): FunnelDefinition {
  const tpl = (key: string) => ({ type: "send" as const, templateId: `${workspaceId}_${key}` });
  return {
    message1: { templateId: `${workspaceId}_launch_invite` },
    wait1Hours: 24,
    message2: {
      clicked: tpl("thanks_clicked"),
      read_not_clicked: tpl("reminder_read"),
      not_read: tpl("gentle_nudge"),
      replied: { type: "exit" },
      failed: { type: "exit" },
    },
    wait2Hours: 48,
    message3: {
      clicked: tpl("last_chance"),
      read_not_clicked: tpl("last_chance"),
      not_read: { type: "exit" },
      replied: { type: "exit" },
      failed: { type: "exit" },
    },
    exitOnConversion: true,
  };
}
