import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/server/audit";
import { requireAdminMutation } from "@/lib/server/auth";
import { ApiError, toErrorResponse } from "@/lib/server/errors";
import { sendTestTemplate } from "@/lib/server/repo";
import { testMessageSchema } from "@/lib/server/schemas";

/** Send a single approved template (e.g. "hello_world") to a test number. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/whatsapp/test-message">) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    const input = testMessageSchema.parse(await request.json());
    let result: Awaited<ReturnType<typeof sendTestTemplate>>;
    try {
      result = await sendTestTemplate(workspaceId, input);
    } catch (error) {
      // Record failures too (never the recipient's number), so the exact Meta error can be looked up later.
      if (error instanceof ApiError) await audit({ actor: admin.email, action: "whatsapp.test_message_failed", message: `Test template ${input.templateName} (${input.languageCode}) failed: ${error.message}`, workspaceId });
      throw error;
    }
    await audit({ actor: admin.email, action: "whatsapp.test_message", message: `Test template ${input.templateName} accepted by Meta`, workspaceId, targetId: result.messageId });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
