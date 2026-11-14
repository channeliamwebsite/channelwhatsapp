import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { CONTACT_LINKED_COLLECTIONS, sendClaimBelongsTo } from "@/lib/server/contact-deletion-rules";

test("send claims are matched to the right contact by document id", () => {
  assert.equal(sendClaimBelongsTo("cmp_abc:ct_123:2#1", "ct_123"), true);
  assert.equal(sendClaimBelongsTo("cmp_abc:ct_123:2#3", "ct_12"), false, "no prefix matches");
  assert.equal(sendClaimBelongsTo("cmp_abc:ct_999:1#1", "ct_123"), false);
});

/** Every server-side write of a document with a contactId field must be covered by the cascade. */
test("cascade covers every workspace collection that stores contactId", () => {
  const files: string[] = [];
  const walk = (dir: string) => readdirSync(dir).forEach((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : files.push(join(dir, f))));
  walk(new URL("../src/lib", import.meta.url).pathname);
  const written = new Set<string>();
  for (const f of files.filter((x) => x.endsWith(".ts"))) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/collection\("([a-zA-Z]+)"\)/g)) written.add(m[1]);
  }
  // Collections that never hold per-contact data.
  const notContactLinked = new Set(["workspaces", "contacts", "campaigns", "templates", "audienceGroups", "tags", "segments", "automations", "auditLogs", "rateLimits", "system", "sends"]);
  const uncovered = [...written].filter((c) => !notContactLinked.has(c) && !(CONTACT_LINKED_COLLECTIONS as readonly string[]).includes(c));
  assert.deepEqual(uncovered, [], `collections not handled by contact deletion: ${uncovered.join(", ")}`);
});
