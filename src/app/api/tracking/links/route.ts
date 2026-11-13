import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAdminMutation } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { createTrackedToken } from "@/lib/tracking/links";

const schema = z.object({
  workspaceId: z.string().min(1).max(120),
  campaignId: z.string().min(1).max(120),
  contactId: z.string().min(1).max(120),
  step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  url: z.string().url().max(2000),
});

/** Mint a signed tracked link (Super Admin only) — e.g. to test a funnel link. */
export async function POST(request: NextRequest) {
  try {
    await requireAdminMutation(request);
    const token = createTrackedToken(schema.parse(await request.json()));
    return NextResponse.json({ url: new URL(`/r/${token}`, request.nextUrl.origin).toString() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
