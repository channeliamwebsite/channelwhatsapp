import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { ApiError } from "./errors";
import { adminAuth } from "./firebase-admin";
import { rateLimit } from "./rate-limit";

export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export type AdminUser = { uid: string; email: string };

/** The platform has exactly one account: the Super Admin set in SUPER_ADMIN_EMAIL. */
export function isSuperAdmin(email: string | undefined) {
  const allowed = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(allowed && email && email.toLowerCase() === allowed);
}

/** Verifies the session cookie (incl. revocation) and the Super Admin email. */
export async function requireAdmin(): Promise<AdminUser> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) throw new ApiError(401, "Please sign in.");
  const auth = adminAuth(); // throws a clear 503 when the server isn't configured
  let decoded;
  try {
    decoded = await auth.verifySessionCookie(token, true);
  } catch {
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }
  if (!isSuperAdmin(decoded.email)) throw new ApiError(403, "This account is not allowed to use the dashboard.");
  return { uid: decoded.uid, email: decoded.email! };
}

/** Mutations: same-origin check + Super Admin session + 120 writes/minute. */
export async function requireAdminMutation(request: NextRequest): Promise<AdminUser> {
  assertSameOrigin(request);
  const user = await requireAdmin();
  await rateLimit(`mutation:${user.uid}`, 120, 60);
  return user;
}

/** Blocks cross-site form posts against cookie-authenticated mutations. */
export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) throw new ApiError(403, "Cross-site request blocked.");
}
