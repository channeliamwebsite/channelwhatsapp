import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";

import { computeFunnelMetrics } from "@/lib/funnel/metrics";
import { describeSyncFailure, summarizeSyncBody } from "@/lib/server/sync-failure";
import { checkMediaLink, isPrivateAddress, type LinkCheckDeps } from "@/lib/server/whatsapp/media-link-check";
import type { RecipientProgress } from "@/types/funnel";

const rec = (o: Partial<RecipientProgress>): RecipientProgress => ({ id: "r", workspaceId: "w", campaignId: "c", contactId: "ct", currentStep: 0, messages: [], state: "waiting", ...o } as RecipientProgress);

test("waiting recipients are not counted as excluded", () => {
  const m = computeFunnelMetrics([
    rec({ id: "1", state: "waiting", nextActionAt: "2026-11-18T04:11:27.757Z" }),
    rec({ id: "2", state: "waiting" }),
    rec({ id: "3", state: "exited", exitReason: "opted_out" }),
    rec({ id: "4", state: "exited", exitReason: "not_eligible", exitDetail: "No consent" }),
    rec({ id: "5", state: "exited", exitReason: "campaign_stopped" }),
  ]);
  assert.equal(m.audience, 5);
  assert.equal(m.excluded, 2, "only consent / eligibility exits");
  assert.equal(m.awaitingFirstSend, 2);
  assert.equal(m.started, 0);
});

const headers = (h: Record<string, string>) => ({ get: (k: string) => h[k.toLowerCase()] ?? null });
function deps(responses: { status: number; h?: Record<string, string> }[], addresses: Record<string, string[]> = {}) {
  const calls: { url: string; method: string; range?: string }[] = [];
  const d: LinkCheckDeps = {
    resolve: async (host) => addresses[host] ?? ["93.184.216.34"],
    request: async (url, init) => {
      calls.push({ url, method: init.method, range: init.headers.Range });
      const r = responses.shift() ?? { status: 500 };
      return { status: r.status, headers: headers(r.h ?? {}) };
    },
  };
  return { d, calls };
}

test("a direct video file passes; size and type are enforced", async () => {
  assert.equal(await checkMediaLink("https://cdn.example.com/a.mp4", "video", deps([{ status: 200, h: { "content-type": "video/mp4", "content-length": "5000000" } }]).d), null);
  assert.equal(await checkMediaLink("https://cdn.example.com/a.mp4", "video", deps([{ status: 200, h: { "content-type": "application/octet-stream" } }]).d), null, "octet-stream with matching extension");
  assert.match(await checkMediaLink("https://cdn.example.com/a.bin", "video", deps([{ status: 200, h: { "content-type": "application/octet-stream" } }]).d) ?? "", /needs mp4/);
  assert.match(await checkMediaLink("https://cdn.example.com/a.mp4", "video", deps([{ status: 200, h: { "content-type": "video/mp4", "content-length": String(20 * 1024 * 1024) } }]).d) ?? "", /20\.0 MB.*16 MB/);
  assert.match(await checkMediaLink("https://cdn.example.com/a.jpg", "video", deps([{ status: 200, h: { "content-type": "image/jpeg" } }]).d) ?? "", /image\/jpeg.*video/);
});

test("web pages are refused (Instagram reel, HTML responses)", async () => {
  const insta = deps([]);
  assert.match(await checkMediaLink("https://www.instagram.com/reel/DewTgNpDCmO/", "video", insta.d) ?? "", /web page, not a direct file link/);
  assert.equal(insta.calls.length, 0, "known page hosts are refused without fetching");
  assert.match(await checkMediaLink("https://example.com/watch", "video", deps([{ status: 200, h: { "content-type": "text/html; charset=utf-8" } }]).d) ?? "", /web page/);
  assert.match(await checkMediaLink("https://example.com/private.mp4", "video", deps([{ status: 401 }]).d) ?? "", /HTTP 401.*without signing in/);
});

test("HEAD not allowed falls back to a 1-byte ranged GET", async () => {
  const x = deps([{ status: 405 }, { status: 206, h: { "content-type": "image/png", "content-range": "bytes 0-0/120000" } }]);
  assert.equal(await checkMediaLink("https://cdn.example.com/a.png", "image", x.d), null);
  assert.deepEqual(x.calls.map((c) => [c.method, c.range]), [["HEAD", undefined], ["GET", "bytes=0-0"]]);
});

test("SSRF guard: private addresses refused, including after DNS and redirects", async () => {
  for (const ip of ["10.0.0.5", "127.0.0.1", "169.254.169.254", "172.20.1.1", "192.168.1.1", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) assert.ok(isPrivateAddress(ip), ip);
  for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700::1111"]) assert.ok(!isPrivateAddress(ip), ip);
  const rebinding = deps([], { "evil.example.com": ["10.1.2.3"] });
  assert.match(await checkMediaLink("https://evil.example.com/a.mp4", "video", rebinding.d) ?? "", /public internet address/);
  assert.equal(rebinding.calls.length, 0);
  const redirect = deps([{ status: 302, h: { location: "https://internal.example.com/a.mp4" } }], { "internal.example.com": ["192.168.0.10"] });
  assert.match(await checkMediaLink("https://cdn.example.com/a.mp4", "video", redirect.d) ?? "", /public internet address/);
  assert.match(await checkMediaLink("https://cdn.example.com/a.mp4", "video", deps([{ status: 302, h: { location: "http://cdn.example.com/a.mp4" } }]).d) ?? "", /non-https/);
  const loop = deps(Array.from({ length: 5 }, () => ({ status: 302, h: { location: "https://cdn.example.com/next.mp4" } })));
  assert.match(await checkMediaLink("https://cdn.example.com/a.mp4", "video", loop.d) ?? "", /too many/);
  assert.match(await checkMediaLink("http://cdn.example.com/a.mp4", "video", deps([]).d) ?? "", /https/);
});

test("failed sync saves are described without field values", () => {
  const body = { contacts: { upsert: [{ id: "c1", fullName: "Asha Menon", phone: "+919847012345", email: "bad" }], delete: [] }, campaigns: { upsert: [], delete: ["x"] }, tags: { upsert: [], delete: [] } };
  assert.equal(summarizeSyncBody(body), "contacts: 1 saved · campaigns: 1 deleted");
  const zerr = z.object({ contacts: z.object({ upsert: z.array(z.object({ email: z.string().email() })) }) }).safeParse(body).error!;
  const text = describeSyncFailure(zerr, body);
  assert.match(text, /validation.*contacts\.upsert\.0\.email/);
  assert.ok(!text.includes("Asha") && !text.includes("9847012345") && !text.includes("bad"));
  const api = describeSyncFailure({ status: 400, message: "Asha: invalid phone +91 98470 12345" }, body);
  assert.match(api, /\(400\).*\[number\]/);
  assert.ok(!api.includes("98470"));
});
