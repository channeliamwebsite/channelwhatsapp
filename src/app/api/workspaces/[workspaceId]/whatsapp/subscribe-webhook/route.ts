import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/server/audit";
import { requireAdminMutation } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { subscribeWorkspaceWebhook } from "@/lib/server/repo";

/** Subscribe the server's Meta app to this workspace's WABA webhooks. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/whatsapp/subscribe-webhook">) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    const result = await subscribeWorkspaceWebhook(workspaceId);
    await audit({ actor: admin.email, action: "whatsapp.subscribe_webhook", message: result.detail, workspaceId });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
