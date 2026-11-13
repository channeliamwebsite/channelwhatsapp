import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin, requireAdminMutation } from "@/lib/server/auth";
import { listMessages, sendReply } from "@/lib/server/conversations";
import { toErrorResponse } from "@/lib/server/errors";
import { replySchema } from "@/lib/server/schemas";

type Ctx = RouteContext<"/api/workspaces/[workspaceId]/conversations/[conversationId]/messages">;

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { workspaceId, conversationId } = await ctx.params;
    return NextResponse.json({ messages: await listMessages(workspaceId, conversationId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    await requireAdminMutation(request);
    const { workspaceId, conversationId } = await ctx.params;
    await sendReply(workspaceId, conversationId, replySchema.parse(await request.json()).text);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
