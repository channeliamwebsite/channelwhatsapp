import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/server/audit";
import { requireAdminMutation } from "@/lib/server/auth";
import { ApiError, toErrorResponse } from "@/lib/server/errors";
import { uploadWorkspaceMedia } from "@/lib/server/repo";

/** Upload one file (multipart field "file") to Meta for this workspace's number. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/workspaces/[workspaceId]/whatsapp/media">) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId } = await ctx.params;
    const file = (await request.formData().catch(() => null))?.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Choose a file to upload.");
    const result = await uploadWorkspaceMedia(workspaceId, file);
    await audit({ actor: admin.email, action: "whatsapp.media_upload", message: `Uploaded ${result.headerType} (${result.mimeType}) to Meta`, workspaceId, targetId: result.mediaId });
    return NextResponse.json({ mediaId: result.mediaId, mimeType: result.mimeType, filename: result.filename, headerType: result.headerType });
  } catch (error) {
    return toErrorResponse(error);
  }
}
