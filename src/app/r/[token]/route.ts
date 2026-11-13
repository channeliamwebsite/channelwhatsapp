import { NextResponse, type NextRequest } from "next/server";

import { recordClick } from "@/lib/tracking/click-store";
import { verifyTrackedToken } from "@/lib/tracking/links";

/**
 * Tracked link redirect. Verifies the signed token, records the click FIRST,
 * then redirects. Invalid tokens never redirect (no open redirect).
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[token]">) {
  const { token } = await ctx.params;
  const noStore = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };
  let result: ReturnType<typeof verifyTrackedToken>;
  try {
    result = verifyTrackedToken(token);
  } catch (error) {
    // Misconfiguration (e.g. LINK_TRACKING_SECRET missing) — never redirect blindly.
    console.error("[tracking] cannot verify link", error);
    return new NextResponse("Link tracking is temporarily unavailable.", { status: 503, headers: noStore });
  }

  if (!result.ok) {
    return new NextResponse("This link is invalid or has expired.", { status: result.reason === "expired" ? 410 : 404, headers: noStore });
  }

  try {
    await recordClick(result.data, request.headers.get("user-agent") ?? "");
  } catch (error) {
    // Never block the visitor because analytics failed.
    console.error("[tracking] failed to record click", error);
  }

  return NextResponse.redirect(result.data.url, { status: 302, headers: noStore });
}
