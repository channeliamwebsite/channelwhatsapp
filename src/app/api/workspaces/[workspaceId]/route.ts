import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin, requireAdminMutation } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { toErrorResponse } from "@/lib/server/errors";
import { deleteWorkspace, loadWorkspaceData, updateWorkspace } from "@/lib/server/repo";
import { workspaceUpdateSchema } from "@/lib/server/schemas";

type Ctx = RouteContext<"/api/workspaces/[workspaceId]">;

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { workspaceId } = await ctx.params;
    return NextResponse.json(await loadWorkspaceData(workspaceId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    await updateWorkspace(workspaceId, workspaceUpdateSchema.parse(await request.json()));
    await audit({ actor: admin.email, action: "workspace.update", message: "Updated workspace profile/settings", workspaceId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    const { confirmName } = z.object({ confirmName: z.string().max(80) }).parse(await request.json());
    await deleteWorkspace(workspaceId, confirmName);
    await audit({ actor: admin.email, action: "workspace.delete", message: `Deleted workspace ${confirmName} and all its data`, workspaceId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
