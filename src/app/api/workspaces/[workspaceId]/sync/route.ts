import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { requireAdminMutation, type AdminUser } from "@/lib/server/auth";
import { ApiError, toErrorResponse } from "@/lib/server/errors";
import { audit } from "@/lib/server/audit";
import { enqueueTrigger } from "@/lib/server/automation-runner";
import { applySync } from "@/lib/server/repo";
import { syncSchema } from "@/lib/server/schemas";
import { describeSyncFailure } from "@/lib/server/sync-failure";

/** Persist validated creates/updates/deletes for contacts, groups and campaign drafts. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/sync">) {
  let admin: AdminUser | null = null;
  let workspaceId = "";
  let body: unknown;
  try {
    admin = await requireAdminMutation(request);
    workspaceId = (await ctx.params).workspaceId;
    body = await request.json();
    const { createdContactIds, deletedContactCount } = await applySync(workspaceId, syncSchema.parse(body));
    if (deletedContactCount) await audit({ actor: admin.email, action: "contact.delete", message: `Deleted ${deletedContactCount} contact(s) and all linked data`, workspaceId });
    const at = new Date().toISOString();
    await enqueueTrigger(workspaceId, createdContactIds.map((contactId) => ({ type: "contact_added" as const, contactId, at })));
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Record rejected saves (reason + what was being saved, never field values) so they can be diagnosed later.
    if (admin && workspaceId && (error instanceof ZodError || error instanceof ApiError)) {
      await audit({ actor: admin.email, action: "workspace.sync_failed", message: describeSyncFailure(error, body), workspaceId }).catch(() => undefined);
    }
    return toErrorResponse(error);
  }
}
