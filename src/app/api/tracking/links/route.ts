import { NextResponse, type NextRequest } from "next/server";

import { createTrackedToken } from "@/lib/tracking/links";

/**
 * DEV ONLY — mints a tracked link for testing. Disabled in production because
 * there is no authentication yet; real links are minted by the send pipeline.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const step = Number(body?.step);
  if (!body || typeof body.url !== "string" || typeof body.workspaceId !== "string" || typeof body.campaignId !== "string" || typeof body.contactId !== "string" || ![1, 2, 3].includes(step)) {
    return NextResponse.json({ error: "workspaceId, campaignId, contactId, step (1-3) and url are required" }, { status: 400 });
  }
  try {
    const token = createTrackedToken({ workspaceId: body.workspaceId, campaignId: body.campaignId, contactId: body.contactId, step: step as 1 | 2 | 3, url: body.url });
    return NextResponse.json({ url: new URL(`/r/${token}`, request.nextUrl.origin).toString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid link" }, { status: 400 });
  }
}
