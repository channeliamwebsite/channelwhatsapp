import { NextResponse, type NextRequest } from "next/server";

import { requireAdminMutation } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { toErrorResponse } from "@/lib/server/errors";
import { updateWhatsAppConfig } from "@/lib/server/repo";
import { whatsappConfigSchema } from "@/lib/server/schemas";

/** Save WhatsApp business details. No Meta API calls are made here. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/whatsapp">) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    await updateWhatsAppConfig(workspaceId, whatsappConfigSchema.parse(await request.json()));
    await audit({ actor: admin.email, action: "whatsapp.config", message: "Updated WhatsApp business details", workspaceId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
