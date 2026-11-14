/** Graph API configuration — SERVER ONLY. */
export const DEFAULT_GRAPH_API_VERSION = "v23.0";
export const GRAPH_BASE_URL = "https://graph.facebook.com";

/** META_API_VERSION must look like "v23.0"; anything else falls back to the default. */
export function graphApiVersion(env: Record<string, string | undefined> = process.env) {
  const v = env.META_API_VERSION?.trim();
  return v && /^v\d{1,3}\.\d{1,2}$/.test(v) ? v : DEFAULT_GRAPH_API_VERSION;
}

/** Meta object ids (phone number id, WABA id) are numeric; never interpolate anything else into a URL path. */
export const isMetaId = (id: string | undefined): id is string => Boolean(id && /^\d{5,30}$/.test(id));
