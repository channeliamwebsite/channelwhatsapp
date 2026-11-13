import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { listConversations } from "@/lib/server/conversations";
import { toErrorResponse } from "@/lib/server/errors";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/conversations">) {
  try {
    await requireAdmin();
    const { workspaceId } = await ctx.params;
    const before = request.nextUrl.searchParams.get("before") ?? undefined;
    return NextResponse.json(await listConversations(workspaceId, before), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
