import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/server/audit";
import { requireAdminMutation } from "@/lib/server/auth";
import { ApiError, toErrorResponse } from "@/lib/server/errors";
import { syncTemplatesFromMeta } from "@/lib/server/repo";

/** Pull this workspace's message templates and their real status from Meta. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/whatsapp/templates/sync">) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    const result = await syncTemplatesFromMeta(workspaceId);
    await audit({ actor: admin.email, action: "whatsapp.template_sync", message: result.ok ? `Template sync: ${result.total} in Meta, ${result.created} new, ${result.updated} updated, ${result.missing} missing` : `Template sync failed: ${result.message}`, workspaceId });
    if (!result.ok) throw new ApiError(502, result.message);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
