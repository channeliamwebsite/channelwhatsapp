import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { assertSameOrigin, isSuperAdmin, SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/server/auth";
import { ApiError, toErrorResponse } from "@/lib/server/errors";
import { audit } from "@/lib/server/audit";
import { adminAuth } from "@/lib/server/firebase-admin";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

/** Exchange a fresh Firebase ID token for an httpOnly session cookie. */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await rateLimit(`login:${clientIp(request.headers)}`, 10, 15 * 60);
    const { idToken } = z.object({ idToken: z.string().min(10).max(5000) }).parse(await request.json());
    const decoded = await adminAuth().verifyIdToken(idToken, true).catch(() => {
      throw new ApiError(401, "Sign-in could not be verified.");
    });
    if (!isSuperAdmin(decoded.email)) {
      await audit({ actor: decoded.email ?? decoded.uid, action: "auth.denied", message: "Sign-in rejected: not the Super Admin", ip: clientIp(request.headers) });
      throw new ApiError(403, "This account is not allowed to use the dashboard.");
    }
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) throw new ApiError(401, "Please sign in again.");

    const session = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    await audit({ actor: decoded.email!, action: "auth.login", message: "Signed in", ip: clientIp(request.headers) });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Sign out: revoke refresh tokens and clear the cookie. */
export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      const decoded = await adminAuth().verifySessionCookie(token).catch(() => null);
      if (decoded) {
        await adminAuth().revokeRefreshTokens(decoded.sub);
        await audit({ actor: decoded.email ?? decoded.sub, action: "auth.logout", message: "Signed out (all sessions revoked)" });
      }
    }
  } catch (error) {
    console.error("[auth] sign-out cleanup failed", error);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
