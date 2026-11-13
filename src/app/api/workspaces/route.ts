import { NextResponse, type NextRequest } from "next/server";

import { requireAdminMutation } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { toErrorResponse } from "@/lib/server/errors";
import { createWorkspace } from "@/lib/server/repo";
import { workspaceCreateSchema } from "@/lib/server/schemas";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminMutation(request);
    const input = workspaceCreateSchema.parse(await request.json());
    const workspace = await createWorkspace(input.name, input.industry);
    await audit({ actor: admin.email, action: "workspace.create", message: `Created workspace ${workspace.name}`, workspaceId: workspace.id });
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
