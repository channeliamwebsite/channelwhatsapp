import { NextResponse, type NextRequest } from "next/server";

import { requireAdminMutation } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { ApiError, toErrorResponse } from "@/lib/server/errors";
import { processWorkspace } from "@/lib/server/funnel-pipeline";
import { requireWorkspace, runCampaignAction, type CampaignAction } from "@/lib/server/repo";

const ACTIONS: CampaignAction[] = ["launch", "pause", "resume", "stop"];
/** Recipients sent immediately on Launch / Resume; the rest are picked up by the scheduled job. */
const IMMEDIATE_SEND_LIMIT = 100;

// Launch / Resume send the first messages before responding.
export const maxDuration = 60;

export type ImmediateSending = { sent: number; held: number; exited: number; remaining: boolean; issues: string[]; skipped?: string };

export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/campaigns/[campaignId]/[action]">) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId, campaignId, action } = await ctx.params;
    if (!ACTIONS.includes(action as CampaignAction)) throw new ApiError(404, "Unknown action.");
    await runCampaignAction(workspaceId, campaignId, action as CampaignAction);
    await audit({ actor: admin.email, action: `campaign.${action}`, message: `Campaign ${action}`, workspaceId, targetId: campaignId });

    let sending: ImmediateSending | undefined;
    if (action === "launch" || action === "resume") {
      // The campaign is already running at this point; a failure here only delays sending to the scheduled job.
      try {
        const workspace = await requireWorkspace(workspaceId);
        const s = await processWorkspace(workspace, new Date().toISOString(), IMMEDIATE_SEND_LIMIT, { campaignId });
        sending = { sent: s.sent, held: s.held ?? 0, exited: s.exited, remaining: s.reachedLimit === true, issues: s.issues ?? [], ...(s.skipped ? { skipped: s.skipped } : {}) };
      } catch (error) {
        console.error("[campaign] immediate send failed; the scheduled job will retry", { name: (error as Error)?.name });
        sending = { sent: 0, held: 0, exited: 0, remaining: true, issues: [], skipped: "Sending could not start now; the scheduled job will retry." };
      }
      await audit({ actor: admin.email, action: "campaign.send_now", message: sending.skipped ?? `Sent ${sending.sent} on ${action}${sending.held ? `, ${sending.held} held` : ""}${sending.issues.length ? ` — ${sending.issues[0]}` : ""}`, workspaceId, targetId: campaignId });
    }
    return NextResponse.json({ ok: true, ...(sending ? { sending } : {}) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
