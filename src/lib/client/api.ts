/** Fetch wrapper for the dashboard API: JSON in/out, readable errors, 401 → login. */
export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the server re-checks the session
      window.location.assign("/login");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

/** Multipart upload to the dashboard API (the browser sets the multipart boundary). */
export async function apiUpload<T>(url: string, file: File, method: "POST" | "PUT" = "POST"): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(url, { method, body: form, cache: "no-store" });
  if (res.status === 413 && !res.headers.get("content-type")?.includes("json")) throw new Error("The file is too large to upload (4 MB maximum). Use a public HTTPS link instead.");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Upload failed (${res.status})`);
  return body as T;
}
