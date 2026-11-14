import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/server/audit";
import { requireAdminMutation } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { verifyWhatsAppConnection } from "@/lib/server/repo";

/** Verify the workspace's WhatsApp credentials and number with Meta. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/whatsapp/verify">) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    const result = await verifyWhatsAppConnection(workspaceId);
    await audit({ actor: admin.email, action: "whatsapp.verify", message: `Verification result: ${result.status}`, workspaceId });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
