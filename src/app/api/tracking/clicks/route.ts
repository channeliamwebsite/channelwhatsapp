import { connection, NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { ApiError, toErrorResponse } from "@/lib/server/errors";
import { listClicks } from "@/lib/tracking/click-store";

/** Recent recorded clicks for a workspace / campaign (Super Admin only). */
export async function GET(request: NextRequest) {
  try {
    await connection();
    await requireAdmin();
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) throw new ApiError(400, "workspaceId is required");
    const campaignId = request.nextUrl.searchParams.get("campaignId") ?? undefined;
    return NextResponse.json({ clicks: await listClicks({ workspaceId, campaignId }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
