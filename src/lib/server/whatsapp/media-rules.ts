/** Template header media rules — pure (no I/O), unit tested. */
import type { TemplateHeaderMedia, WhatsAppTemplate } from "@/types/template";

export type MediaHeaderType = "image" | "video" | "document";

/** Vercel rejects request bodies over ~4.5 MB, so uploads through the dashboard are capped at 4 MB. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** Meta deletes uploaded media after 30 days; stop using it a day early. */
export const MEDIA_ID_USABLE_DAYS = 29;

/** File types WhatsApp accepts for each header type (Cloud API supported media). */
export const HEADER_MIME_TYPES: Record<MediaHeaderType, string[]> = {
  image: ["image/jpeg", "image/png"],
  video: ["video/mp4", "video/3gpp"],
  document: [
    "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

export const isMediaHeader = (type: string | undefined): type is MediaHeaderType => type === "image" || type === "video" || type === "document";

export function headerTypeForMime(mime: string): MediaHeaderType | null {
  const m = mime.toLowerCase().split(";")[0].trim();
  return (Object.keys(HEADER_MIME_TYPES) as MediaHeaderType[]).find((k) => HEADER_MIME_TYPES[k].includes(m)) ?? null;
}

/** Meta downloads link media itself; it must be a public HTTPS URL. */
export function linkProblem(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return "Enter a valid URL.";
  }
  if (url.protocol !== "https:") return "The link must start with https://.";
  if (link.length > 2000) return "The link is too long.";
  if (/^(localhost|127\.|10\.|192\.168\.|\[::1\])/.test(url.hostname) || url.hostname.endsWith(".local")) return "The link must be publicly reachable by Meta.";
  return null;
}

export const safeFilename = (name: string | undefined) => name?.replace(/[\u0000-\u001f\u007f/\\]+/g, "").trim().slice(0, 240) || undefined;

/** Why this media can't be used for this header right now, or null. */
export function headerMediaProblem(headerType: MediaHeaderType, media: TemplateHeaderMedia | undefined, ctx: { phoneNumberId: string; now: string }): string | null {
  if (!media) return `This template has ${headerType === "image" ? "an" : "a"} ${headerType} header. Add header media on the Templates page.`;
  if (media.source === "link") return linkProblem(media.link);
  if (headerTypeForMime(media.mimeType) !== headerType) return `The uploaded file is not a valid ${headerType} for this template’s header. Upload a new one.`;
  if (media.phoneNumberId !== ctx.phoneNumberId) return "The header media was uploaded for a different WhatsApp number. Upload it again.";
  const ageDays = (new Date(ctx.now).getTime() - new Date(media.uploadedAt).getTime()) / 86_400_000;
  if (!(ageDays >= 0) || ageDays > MEDIA_ID_USABLE_DAYS) return "The uploaded header media has expired (Meta keeps uploads for 30 days). Upload it again or use a link.";
  return null;
}

/** When an uploaded file stops being usable (for display). */
export const uploadUsableUntil = (uploadedAt: string) => new Date(new Date(uploadedAt).getTime() + MEDIA_ID_USABLE_DAYS * 86_400_000).toISOString();

/** Cloud API header parameter for the media. */
export function headerParameter(headerType: MediaHeaderType, media: TemplateHeaderMedia) {
  const ref = media.source === "upload" ? { id: media.mediaId } : { link: media.link };
  if (headerType === "document") return { type: "document" as const, document: { ...ref, ...(media.filename ? { filename: media.filename } : {}) } };
  return headerType === "image" ? { type: "image" as const, image: ref } : { type: "video" as const, video: ref };
}

/** Header media problem for a dashboard template, ignoring number/expiry (used at campaign launch). */
export function templateNeedsHeaderMedia(t: Pick<WhatsAppTemplate, "header" | "headerMedia">) {
  return isMediaHeader(t.header?.type) && !t.headerMedia;
}
