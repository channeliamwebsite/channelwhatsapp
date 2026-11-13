import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { ApiError, toErrorResponse } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { enqueueScheduled, processDueRuns } from "@/lib/server/automation-runner";
import { processWorkspace } from "@/lib/server/funnel-pipeline";
import type { Workspace } from "@/types/workspace";

/**
 * Scheduled processor (Vercel Cron / Cloud Scheduler): funnel steps + automations.
 * Requires `Authorization: Bearer <CRON_SECRET>`.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const given = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) throw new ApiError(401, "Unauthorized");

    const now = new Date().toISOString();
    const workspaces = (await db().collection("workspaces").get()).docs.map((d) => d.data() as Workspace);
    const results = [];
    for (const w of workspaces) {
      await enqueueScheduled(w.id, now);
      const automations = await processDueRuns(w, now);
      const funnel = w.whatsappAccount.status === "connected" ? await processWorkspace(w, now) : { skipped: "WhatsApp not connected" };
      results.push({ workspaceId: w.id, automations, funnel });
    }
    return NextResponse.json({ at: now, results });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = POST;
