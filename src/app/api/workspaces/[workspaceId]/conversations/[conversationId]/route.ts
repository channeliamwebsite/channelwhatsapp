import { NextResponse, type NextRequest } from "next/server";

import { requireAdminMutation } from "@/lib/server/auth";
import { updateConversation } from "@/lib/server/conversations";
import { toErrorResponse } from "@/lib/server/errors";
import { conversationPatchSchema } from "@/lib/server/schemas";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/conversations/[conversationId]">) {
  try {
    await requireAdminMutation(request);
    const { workspaceId, conversationId } = await ctx.params;
    await updateConversation(workspaceId, conversationId, conversationPatchSchema.parse(await request.json()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
