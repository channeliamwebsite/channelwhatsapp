/**
 * Checks that a header media link really serves a file Meta can send — SERVER ONLY.
 * Meta downloads link media itself at send time; a web page (Instagram,
 * YouTube, Drive viewer…) makes every message fail after it was "sent".
 *
 * The server fetches an admin-supplied URL here, so it is SSRF-guarded:
 * https only, no private / loopback / link-local addresses (checked after DNS
 * resolution and again on every redirect hop), HEAD (or a 1-byte ranged GET),
 * short timeout, bodies never read.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { HEADER_MIME_TYPES, linkProblem, type MediaHeaderType } from "./media-rules";

/** WhatsApp's maximum size per media type. */
export const MEDIA_MAX_BYTES: Record<MediaHeaderType, number> = { image: 5 * 1024 * 1024, video: 16 * 1024 * 1024, document: 100 * 1024 * 1024 };

const PAGE_HOSTS = ["instagram.com", "facebook.com", "fb.watch", "youtube.com", "youtu.be", "tiktok.com", "twitter.com", "x.com", "linkedin.com"];

const EXTENSIONS: Record<MediaHeaderType, RegExp> = {
  image: /\.(jpe?g|png)$/i,
  video: /\.(mp4|3gp)$/i,
  document: /\.(pdf|txt|docx?|xlsx?|pptx?)$/i,
};

export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
  if (isIP(v) === 4) {
    const [a, b] = v.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

type Res = { status: number; headers: { get(name: string): string | null } };
export type LinkCheckDeps = {
  resolve: (hostname: string) => Promise<string[]>;
  request: (url: string, init: { method: "HEAD" | "GET"; headers: Record<string, string>; signal: AbortSignal }) => Promise<Res>;
};

const defaultDeps: LinkCheckDeps = {
  resolve: async (host) => (isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address)),
  request: async (url, init) => {
    const res = await fetch(url, { ...init, redirect: "manual", cache: "no-store" });
    void res.body?.cancel().catch(() => undefined); // never download the file
    return res;
  },
};

const pageMessage = "This is a web page, not a direct file link. Meta needs a link that downloads the file itself (for example ending in .mp4 or .jpg), or upload the file instead.";

/** Null when the link serves a suitable file; otherwise a message saying what's wrong. */
export async function checkMediaLink(link: string, headerType: MediaHeaderType, deps: LinkCheckDeps = defaultDeps, timeoutMs = 8000): Promise<string | null> {
  const basic = linkProblem(link);
  if (basic) return basic;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let url = new URL(link);
    for (let hop = 0; hop <= 3; hop++) {
      const host = url.hostname.replace(/^\[|\]$/g, "");
      if (PAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return pageMessage;
      if (url.protocol !== "https:") return "The link redirects to a non-https address.";
      let addresses: string[];
      try {
        addresses = await deps.resolve(host);
      } catch {
        return "The link’s address could not be found.";
      }
      if (!addresses.length || addresses.some(isPrivateAddress)) return "The link must point to a public internet address.";

      let res = await deps.request(url.toString(), { method: "HEAD", headers: {}, signal: controller.signal });
      if (res.status === 405 || res.status === 403 || res.status === 501) res = await deps.request(url.toString(), { method: "GET", headers: { Range: "bytes=0-0" }, signal: controller.signal });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return "The link redirects without a destination.";
        url = new URL(location, url);
        continue;
      }
      if (res.status !== 200 && res.status !== 206) return `The link returned HTTP ${res.status}; Meta must be able to download it without signing in.`;

      const type = (res.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
      const allowed = HEADER_MIME_TYPES[headerType];
      const octetWithExtension = type === "application/octet-stream" && EXTENSIONS[headerType].test(url.pathname);
      if (type === "text/html" || type === "application/xhtml+xml") return pageMessage;
      if (!allowed.includes(type) && !octetWithExtension) return `The link serves “${type || "unknown type"}”, but a ${headerType} header needs ${allowed.map((m) => m.split("/")[1]).join(", ")}.`;

      const total = Number(res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length") ?? NaN);
      if (Number.isFinite(total) && total > MEDIA_MAX_BYTES[headerType]) return `The file is ${(total / 1024 / 1024).toFixed(1)} MB; WhatsApp allows up to ${MEDIA_MAX_BYTES[headerType] / 1024 / 1024} MB for a ${headerType}.`;
      return null;
    }
    return "The link redirects too many times.";
  } catch (error) {
    return (error as Error)?.name === "AbortError" ? "The link took too long to respond." : "The link could not be reached.";
  } finally {
    clearTimeout(timer);
  }
}
