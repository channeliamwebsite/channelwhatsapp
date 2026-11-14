import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { whatsappConfigStatus } from "@/lib/server/whatsapp/config-status";

/** Super Admin only: which WhatsApp server variables exist. Never returns secret values. */
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(whatsappConfigStatus(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
