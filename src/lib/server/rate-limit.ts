import { createHash } from "node:crypto";

import { ApiError } from "./errors";
import { db } from "./firebase-admin";

/**
 * Fixed-window rate limit stored in Firestore, so it holds across serverless
 * instances. `rateLimits/{sha256(key)}` = { count, windowStart }.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const ref = db().collection("rateLimits").doc(createHash("sha256").update(key).digest("hex"));
  const now = Date.now();
  const allowed = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { count: number; windowStart: number } | undefined;
    if (!data || now - data.windowStart >= windowSeconds * 1000) {
      tx.set(ref, { count: 1, windowStart: now, expiresAt: new Date(now + windowSeconds * 1000) });
      return true;
    }
    if (data.count >= limit) return false;
    tx.update(ref, { count: data.count + 1 });
    return true;
  });
  if (!allowed) throw new ApiError(429, "Too many requests. Please wait a moment and try again.");
}

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
