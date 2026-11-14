import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/server/audit";
import { requireAdminMutation } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { sendTestTemplate } from "@/lib/server/repo";
import { testMessageSchema } from "@/lib/server/schemas";

/** Send a single approved template (e.g. "hello_world") to a test number. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/whatsapp/test-message">) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    const input = testMessageSchema.parse(await request.json());
    const result = await sendTestTemplate(workspaceId, input);
    await audit({ actor: admin.email, action: "whatsapp.test_message", message: `Test template ${input.templateName} accepted by Meta`, workspaceId, targetId: result.messageId });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
