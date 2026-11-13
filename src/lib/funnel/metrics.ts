import type { Branch } from "@/types/campaign";
import type { ExitReason, FunnelStep, MessageRecord, RecipientProgress } from "@/types/funnel";

import { BRANCHES } from "./engine";

const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);

export type StepMetrics = { step: FunnelStep; sent: number; delivered: number; read: number; failed: number; clicked: number };

export type FunnelMetrics = {
  audience: number;
  excluded: number;
  started: number;
  totals: { sent: number; delivered: number; read: number; failed: number; clicked: number };
  replied: number;
  converted: number;
  optedOut: number;
  completed: number;
  waiting: number;
  rates: {
    delivery: number;
    read: number;
    clickThrough: number;
    reply: number;
    conversion: number;
    m1ToM2: number;
    m2ToM3: number;
    completion: number;
  };
  steps: StepMetrics[];
  /** How many Message 2 / Message 3 sends each behaviour branch produced. */
  branches: Record<2 | 3, Record<Branch, number>>;
  exits: Partial<Record<ExitReason, number>>;
};

const isDelivered = (m: MessageRecord) => m.status === "delivered" || m.status === "read";

export function computeFunnelMetrics(recipients: RecipientProgress[]): FunnelMetrics {
  // Queued messages haven't been accepted by WhatsApp yet — they are not "sent".
  const accepted = (r: RecipientProgress) => r.messages.filter((m) => m.status !== "queued");
  const started = recipients.filter((r) => accepted(r).length > 0);
  const messages = recipients.flatMap(accepted);
  const steps = ([1, 2, 3] as FunnelStep[]).map((step) => {
    const ms = messages.filter((m) => m.step === step);
    return {
      step,
      sent: ms.length,
      delivered: ms.filter(isDelivered).length,
      read: ms.filter((m) => m.status === "read").length,
      failed: ms.filter((m) => m.status === "failed").length,
      clicked: ms.filter((m) => m.clicks.length > 0).length,
    };
  });
  const totals = steps.reduce(
    (a, s) => ({ sent: a.sent + s.sent, delivered: a.delivered + s.delivered, read: a.read + s.read, failed: a.failed + s.failed, clicked: a.clicked + s.clicked }),
    { sent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 },
  );
  const deliveredRecipients = started.filter((r) => accepted(r).some(isDelivered));
  const emptyBranches = () => Object.fromEntries(BRANCHES.map((b) => [b, 0])) as Record<Branch, number>;
  const branches = { 2: emptyBranches(), 3: emptyBranches() };
  for (const m of messages) if ((m.step === 2 || m.step === 3) && m.branch) branches[m.step][m.branch]++;
  const exits: Partial<Record<ExitReason, number>> = {};
  for (const r of recipients) if (r.exitReason) exits[r.exitReason] = (exits[r.exitReason] ?? 0) + 1;

  const replied = started.filter((r) => r.repliedAt).length;
  const converted = started.filter((r) => r.convertedAt).length;
  const completed = recipients.filter((r) => r.state === "completed").length;
  const reachedEnd = completed + (exits.converted ?? 0);

  return {
    audience: recipients.length,
    excluded: recipients.length - started.length,
    started: started.length,
    totals,
    replied,
    converted,
    optedOut: started.filter((r) => r.optedOutAt).length,
    completed,
    waiting: recipients.filter((r) => r.state === "waiting").length,
    rates: {
      delivery: pct(totals.delivered, totals.sent),
      read: pct(totals.read, totals.delivered),
      clickThrough: pct(totals.clicked, totals.delivered),
      reply: pct(replied, deliveredRecipients.length),
      conversion: pct(converted, started.length),
      m1ToM2: pct(steps[1].sent, steps[0].sent),
      m2ToM3: pct(steps[2].sent, steps[1].sent),
      completion: pct(reachedEnd, started.length),
    },
    steps,
    branches,
    exits,
  };
}
