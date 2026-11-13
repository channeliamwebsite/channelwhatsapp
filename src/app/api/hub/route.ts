import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { bootstrapWorkspaces, listWorkspaces } from "@/lib/server/repo";

/** Signed-in admin + all workspaces (with counts). */
export async function GET() {
  try {
    const user = await requireAdmin();
    await bootstrapWorkspaces();
    return NextResponse.json({ user: { email: user.email }, workspaces: await listWorkspaces() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
