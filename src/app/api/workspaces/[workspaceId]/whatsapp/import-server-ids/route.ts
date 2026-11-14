import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/server/audit";
import { requireAdminMutation } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { importServerWhatsAppIds } from "@/lib/server/repo";

/** Import the server-configured WABA ID + Phone Number ID into THIS workspace only. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/whatsapp/import-server-ids">) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    const ids = await importServerWhatsAppIds(workspaceId);
    await audit({ actor: admin.email, action: "whatsapp.import_ids", message: `Imported server WhatsApp IDs (WABA ${ids.wabaId})`, workspaceId });
    return NextResponse.json({ ok: true, ...ids });
  } catch (error) {
    return toErrorResponse(error);
  }
}
