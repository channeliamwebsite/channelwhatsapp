/**
 * Signed tracked links — SERVER ONLY (uses node:crypto and the secret).
 *
 *   /r/<payload>.<signature>
 *
 * payload   = base64url(JSON { v, w, c, ct, s, u, iat })
 * signature = base64url(HMAC-SHA256(LINK_TRACKING_SECRET, payload))
 *
 * The signature makes every field tamper-proof, so the redirect endpoint can
 * never be abused as an open redirect: it only sends people to destinations
 * we signed ourselves.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type TrackedLinkData = {
  workspaceId: string;
  campaignId: string;
  contactId: string;
  step: 1 | 2 | 3;
  url: string;
};

type Payload = { v: 1; w: string; c: string; ct: string; s: 1 | 2 | 3; u: string; iat: number };

const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

function secret() {
  const value = process.env.LINK_TRACKING_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("LINK_TRACKING_SECRET must be set (32+ characters) in production.");
  }
  return "dev-only-insecure-link-tracking-secret-change-me";
}

const b64 = (input: Buffer | string) => Buffer.from(input).toString("base64url");
const sign = (payload: string) => b64(createHmac("sha256", secret()).update(payload).digest());

export function isSafeDestination(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function createTrackedToken(data: TrackedLinkData, issuedAt = Date.now()) {
  if (!isSafeDestination(data.url)) throw new Error("Destination must be an http(s) URL.");
  const payload: Payload = { v: 1, w: data.workspaceId, c: data.campaignId, ct: data.contactId, s: data.step, u: data.url, iat: issuedAt };
  const encoded = b64(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export type VerifyResult = { ok: true; data: TrackedLinkData; issuedAt: number } | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "unsafe_destination" };

export function verifyTrackedToken(token: string, now = Date.now()): VerifyResult {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra !== undefined || token.length > 4096) return { ok: false, reason: "malformed" };

  const expected = Buffer.from(sign(encoded));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "bad_signature" };

  let p: Payload;
  try {
    p = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (p.v !== 1 || ![1, 2, 3].includes(p.s)) return { ok: false, reason: "malformed" };
  if (now - p.iat > MAX_AGE_MS) return { ok: false, reason: "expired" };
  if (!isSafeDestination(p.u)) return { ok: false, reason: "unsafe_destination" };
  return { ok: true, issuedAt: p.iat, data: { workspaceId: p.w, campaignId: p.c, contactId: p.ct, step: p.s, url: p.u } };
}
