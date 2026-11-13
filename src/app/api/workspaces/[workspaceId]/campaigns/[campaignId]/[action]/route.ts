import { NextResponse, type NextRequest } from "next/server";

import { requireAdminMutation } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { ApiError, toErrorResponse } from "@/lib/server/errors";
import { runCampaignAction, type CampaignAction } from "@/lib/server/repo";

const ACTIONS: CampaignAction[] = ["launch", "pause", "resume", "stop"];

export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/campaigns/[campaignId]/[action]">) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId, campaignId, action } = await ctx.params;
    if (!ACTIONS.includes(action as CampaignAction)) throw new ApiError(404, "Unknown action.");
    await runCampaignAction(workspaceId, campaignId, action as CampaignAction);
    await audit({ actor: admin.email, action: `campaign.${action}`, message: `Campaign ${action}`, workspaceId, targetId: campaignId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
