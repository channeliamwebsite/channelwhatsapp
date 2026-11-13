import { connection, NextResponse } from "next/server";

import { listAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";

export async function GET() {
  try {
    await connection();
    await requireAdmin();
    return NextResponse.json({ entries: await listAudit(100) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
