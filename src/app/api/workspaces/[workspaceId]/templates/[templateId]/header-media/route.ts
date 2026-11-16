import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/server/audit";
import { requireAdminMutation } from "@/lib/server/auth";
import { ApiError, toErrorResponse } from "@/lib/server/errors";
import { setTemplateHeaderMedia } from "@/lib/server/repo";
import { headerMediaLinkSchema } from "@/lib/server/schemas";

type Ctx = RouteContext<"/api/workspaces/[workspaceId]/templates/[templateId]/header-media">;

/** Set a template's header media: multipart "file" (uploaded to Meta) or JSON { link, filename? }. */
export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId, templateId } = await ctx.params;
    let input: Parameters<typeof setTemplateHeaderMedia>[2];
    if ((request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      const file = (await request.formData().catch(() => null))?.get("file");
      if (!(file instanceof File)) throw new ApiError(400, "Choose a file to upload.");
      input = { file };
    } else {
      input = headerMediaLinkSchema.parse(await request.json());
    }
    const media = await setTemplateHeaderMedia(workspaceId, templateId, input);
    await audit({ actor: admin.email, action: "template.header_media", message: `Header media set (${media?.source})`, workspaceId, targetId: templateId });
    return NextResponse.json({ ok: true, headerMedia: media });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdminMutation(request);
    const { workspaceId, templateId } = await ctx.params;
    await setTemplateHeaderMedia(workspaceId, templateId, null);
    await audit({ actor: admin.email, action: "template.header_media", message: "Header media removed", workspaceId, targetId: templateId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
