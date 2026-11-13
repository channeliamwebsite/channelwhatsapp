import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/server/audit";
import { requireAdminMutation, SESSION_COOKIE } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { adminAuth } from "@/lib/server/firebase-admin";

/** Sign out of every device: revokes all refresh tokens and session cookies. */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminMutation(request);
    await adminAuth().revokeRefreshTokens(admin.uid);
    await audit({ actor: admin.email, action: "auth.revoke_all", message: "Signed out of all sessions" });
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
