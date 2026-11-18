/** Audit text for a rejected dashboard save — pure, unit tested. Never includes field values. */
import type { ZodError } from "zod";

type Failure = ZodError | { status: number; message: string };

/** "contacts: 2 saved, 1 deleted · campaigns: 1 saved" — what the request tried to change. */
export function summarizeSyncBody(body: unknown): string {
  if (!body || typeof body !== "object") return "unreadable request";
  const parts = Object.entries(body as Record<string, unknown>).flatMap(([key, value]) => {
    const v = value as { upsert?: unknown; delete?: unknown } | null;
    const up = Array.isArray(v?.upsert) ? v!.upsert.length : 0;
    const del = Array.isArray(v?.delete) ? v!.delete.length : 0;
    return up || del ? [`${key}: ${[up && `${up} saved`, del && `${del} deleted`].filter(Boolean).join(", ")}`] : [];
  });
  return parts.length ? parts.join(" · ") : "no changes";
}

const redactDigits = (s: string) => s.replace(/\+?\d[\d\s-]{6,}\d/g, "[number]");

export function describeSyncFailure(error: Failure, body: unknown): string {
  const what = summarizeSyncBody(body);
  if ("issues" in error) {
    const issues = error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "request"}: ${i.message}`).join("; ");
    return `Save rejected (validation) — ${issues} [${what}]`.slice(0, 600);
  }
  return `Save rejected (${error.status}) — ${redactDigits(error.message)} [${what}]`.slice(0, 600);
}
