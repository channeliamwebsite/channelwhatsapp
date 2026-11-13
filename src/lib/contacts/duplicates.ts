import type { Contact } from "@/types/contact";

import { phoneKey } from "./phone";

export type DuplicateGroup = {
  key: string;
  matchedOn: "phone" | "email";
  contacts: Contact[];
};

/** Groups contacts sharing the same normalised phone number or email. */
export function findDuplicateGroups(contacts: Contact[]): DuplicateGroup[] {
  const byPhone = new Map<string, Contact[]>();
  const byEmail = new Map<string, Contact[]>();
  for (const c of contacts) {
    const p = phoneKey(c.phone);
    byPhone.set(p, [...(byPhone.get(p) ?? []), c]);
    const e = c.email.trim().toLowerCase();
    if (e) byEmail.set(e, [...(byEmail.get(e) ?? []), c]);
  }

  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();
  for (const [key, list] of byPhone) {
    if (list.length > 1) {
      groups.push({ key, matchedOn: "phone", contacts: list });
      list.forEach((c) => seen.add(c.id));
    }
  }
  for (const [key, list] of byEmail) {
    // Skip email groups already fully covered by a phone match.
    if (list.length > 1 && !list.every((c) => seen.has(c.id))) {
      groups.push({ key, matchedOn: "email", contacts: list });
    }
  }
  return groups;
}

/** Existing contacts that clash with a candidate (excluding `ignoreId`). */
export function findMatches(
  contacts: Contact[],
  candidate: { phone: string; email: string },
  ignoreId?: string,
) {
  const p = candidate.phone.trim() ? phoneKey(candidate.phone) : "";
  const e = candidate.email.trim().toLowerCase();
  return {
    phone: p ? contacts.find((c) => c.id !== ignoreId && phoneKey(c.phone) === p) : undefined,
    email: e ? contacts.find((c) => c.id !== ignoreId && c.email.toLowerCase() === e) : undefined,
  };
}

/** Merge `others` into `primary`: union of groups/tags, fill empty fields. */
export function mergeContacts(primary: Contact, others: Contact[]): Contact {
  const merged = { ...primary };
  for (const o of others) {
    merged.audienceGroups = [...new Set([...merged.audienceGroups, ...o.audienceGroups])];
    merged.tags = [...new Set([...merged.tags, ...o.tags])];
    for (const field of ["email", "country", "city", "organisation", "designation"] as const) {
      if (!merged[field] && o[field]) merged[field] = o[field];
    }
    // An opt-out anywhere wins — never resurrect consent through a merge.
    if (o.optInStatus === "opted_out") {
      merged.optInStatus = "opted_out";
    }
  }
  return merged;
}
