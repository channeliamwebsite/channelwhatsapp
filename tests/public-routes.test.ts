import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * The sign-in gate (src/proxy.ts) runs on every path its matcher matches.
 * Public pages must NOT match; every dashboard page must still match.
 */
const source = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
const pattern = /matcher:\s*\["([^"]+)"\]/.exec(source)?.[1];
const gate = new RegExp(`^${pattern!.replace(/\\\\/g, "\\")}$`);
const protectedByGate = (path: string) => gate.test(path);

test("legal pages are public", () => {
  assert.ok(pattern, "matcher found");
  for (const p of ["/privacy-policy", "/terms-of-service", "/login"]) assert.equal(protectedByGate(p), false, p);
});

test("dashboard pages remain protected", () => {
  for (const p of ["/", "/contacts", "/campaigns", "/campaigns/new", "/campaigns/abc", "/audience-groups", "/templates", "/conversations", "/automation", "/funnels", "/reports", "/workspaces", "/whatsapp-account", "/settings"]) {
    assert.equal(protectedByGate(p), true, p);
  }
});
