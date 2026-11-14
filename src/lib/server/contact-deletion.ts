/**
 * Complete deletion of a contact's data within one workspace — SERVER ONLY.
 * Removes every record linked to the contact. Idempotent: running it again
 * finds nothing more to delete, so a partial failure can simply be retried.
 */
import { CONTACT_LINKED_COLLECTIONS, sendClaimBelongsTo } from "./contact-deletion-rules";
import { db } from "./firebase-admin";

export { CONTACT_LINKED_COLLECTIONS, sendClaimBelongsTo };

export type DeletionCounts = Record<(typeof CONTACT_LINKED_COLLECTIONS)[number] | "sends", number>;

export async function deleteContactLinkedData(workspaceId: string, contactIds: string[]): Promise<DeletionCounts> {
  const counts = Object.fromEntries([...CONTACT_LINKED_COLLECTIONS, "sends"].map((c) => [c, 0])) as DeletionCounts;
  if (!contactIds.length) return counts;
  const ws = db().collection("workspaces").doc(workspaceId);
  const writer = db().bulkWriter();
  let failure: unknown = null;
  writer.onWriteError((err) => {
    if (err.failedAttempts < 5) return true; // retry transient failures
    failure = err;
    return false;
  });

  for (let i = 0; i < contactIds.length; i += 30) {
    const chunk = contactIds.slice(i, i + 30);
    for (const name of CONTACT_LINKED_COLLECTIONS) {
      const snap = await ws.collection(name).where("contactId", "in", chunk).select().get();
      snap.docs.forEach((d) => void writer.delete(d.ref));
      counts[name] += snap.size;
    }
    const claims = await ws.collection("sends").where("contactId", "in", chunk).select().get();
    claims.docs.forEach((d) => void writer.delete(d.ref));
    counts.sends += claims.size;
  }
  // Older send claims have no contactId field — match them by document id.
  const wanted = new Set(contactIds);
  const legacy = await ws.collection("sends").select().get();
  for (const d of legacy.docs) {
    if (!d.get("contactId") && [...wanted].some((id) => sendClaimBelongsTo(d.id, id))) {
      void writer.delete(d.ref);
      counts.sends++;
    }
  }

  await writer.close();
  if (failure) throw failure;
  return counts;
}
