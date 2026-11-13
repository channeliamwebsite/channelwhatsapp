import { NextResponse, type NextRequest } from "next/server";

import { requireAdminMutation } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { enqueueTrigger } from "@/lib/server/automation-runner";
import { applySync } from "@/lib/server/repo";
import { syncSchema } from "@/lib/server/schemas";

/** Persist validated creates/updates/deletes for contacts, groups and campaign drafts. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/sync">) {
  try {
    await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    const { createdContactIds } = await applySync(workspaceId, syncSchema.parse(await request.json()));
    const at = new Date().toISOString();
    await enqueueTrigger(workspaceId, createdContactIds.map((contactId) => ({ type: "contact_added" as const, contactId, at })));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
