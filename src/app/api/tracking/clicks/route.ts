import { connection, NextResponse, type NextRequest } from "next/server";

import { listClicks } from "@/lib/tracking/click-store";

/** DEV ONLY — recent recorded clicks for a workspace/campaign. */
export async function GET(request: NextRequest) {
  await connection(); // always run per request
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  const campaignId = request.nextUrl.searchParams.get("campaignId") ?? undefined;
  return NextResponse.json({ clicks: listClicks({ workspaceId, campaignId }) }, { headers: { "Cache-Control": "no-store" } });
}
