import { db } from "./firebase-admin";

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  message: string;
  workspaceId?: string;
  targetId?: string;
  ip?: string;
};

/** Append-only audit log for critical operations (root collection `auditLogs`). */
export async function audit(entry: Omit<AuditEntry, "id" | "at">) {
  try {
    const ref = db().collection("auditLogs").doc();
    await ref.set({ ...entry, id: ref.id, at: new Date().toISOString() } satisfies AuditEntry);
  } catch (error) {
    // Never fail the user's action because the audit write failed — but surface it in logs.
    console.error("[audit] write failed", error);
  }
}

export async function listAudit(limit = 100) {
  const snap = await db().collection("auditLogs").orderBy("at", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as AuditEntry);
}
