import { checkConsent } from "@/lib/funnel/engine";
import { phoneKey } from "@/lib/contacts/phone";
import type { Segment, SegmentFilter } from "@/types/audience";
import type { Contact } from "@/types/contact";

/** Shared by the UI (live counts) and the server (campaign launch). */
export function matchesSegment(c: Contact, f: SegmentFilter) {
  const has = (list: string[], wanted: string[], mode: "any" | "all") =>
    wanted.length === 0 || (mode === "all" ? wanted.every((w) => list.includes(w)) : wanted.some((w) => list.includes(w)));
  if (!has(c.audienceGroups, f.groups, f.groupsMatch)) return false;
  if (!has(c.tags, f.tags, f.tagsMatch)) return false;
  if (f.optInStatuses.length && !f.optInStatuses.includes(c.optInStatus)) return false;
  if (f.addedAfter && c.createdAt.slice(0, 10) < f.addedAfter) return false;
  if (f.addedBefore && c.createdAt.slice(0, 10) > f.addedBefore) return false;
  if (f.customField?.key && (c.customFields?.[f.customField.key] ?? "").toLowerCase() !== f.customField.value.toLowerCase()) return false;
  if (f.eligibleOnly && !checkConsent(c).ok) return false;
  return true;
}

export type AudienceBreakdown = {
  /** Unique, eligible recipients (one per phone number). */
  eligible: Contact[];
  excluded: { contact: Contact; reason: string }[];
};

/** Groups (any) ∪ segments, de-duplicated by contact and by phone number. */
export function resolveAudience(contacts: Contact[], groups: string[], segments: Segment[]): AudienceBreakdown {
  const inAudience = contacts.filter((c) => c.audienceGroups.some((g) => groups.includes(g)) || segments.some((s) => matchesSegment(c, s.filter)));
  const seenPhones = new Set<string>();
  const result: AudienceBreakdown = { eligible: [], excluded: [] };
  for (const c of inAudience) {
    const consent = checkConsent(c);
    if (!consent.ok) {
      result.excluded.push({ contact: c, reason: consent.reason });
      continue;
    }
    const key = phoneKey(c.phone);
    if (seenPhones.has(key)) {
      result.excluded.push({ contact: c, reason: "Duplicate phone number" });
      continue;
    }
    seenPhones.add(key);
    result.eligible.push(c);
  }
  return result;
}
