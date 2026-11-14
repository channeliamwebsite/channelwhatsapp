import { NextResponse, type NextRequest } from "next/server";

import { verifyWebhookSignature } from "@/lib/server/whatsapp/signature";
import { processWebhookBatches, verifySubscription } from "@/lib/server/whatsapp/webhook";
import { parseWebhookPayload } from "@/lib/server/whatsapp/webhook-payload";
import { firestoreWebhookStore } from "@/lib/server/whatsapp/webhook-store";

const MAX_BODY_BYTES = 1_000_000;
const text = (body: string, status: number) => new NextResponse(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/** Meta webhook verification: echo hub.challenge only for the right verify token. */
export async function GET(request: NextRequest) {
  const result = verifySubscription(request.nextUrl.searchParams, process.env.WHATSAPP_VERIFY_TOKEN);
  return text(result.body, result.status);
}

/**
 * WhatsApp events. The signature is checked on the raw body before any JSON
 * parsing. Processing is idempotent, so on a transient failure we return 500
 * and let Meta retry instead of acknowledging lost events.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.error("[webhook] META_APP_SECRET is not configured");
    return text("Not configured", 503);
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return text("Payload too large", 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return text("Payload too large", 413);
  if (!verifyWebhookSignature(raw, request.headers.get("x-hub-signature-256"), secret)) return text("Invalid signature", 401);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return text("Bad Request", 400);
  }
  const { batches, dropped } = parseWebhookPayload(body);
  try {
    const summary = await processWebhookBatches(batches, firestoreWebhookStore);
    if (dropped || summary.unknownNumbers) console.warn("[webhook] skipped events", { dropped, unknownNumbers: summary.unknownNumbers });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // No payload or PII in logs — only the error class/code.
    console.error("[webhook] processing failed; Meta will retry", { name: (error as Error)?.name, code: (error as { code?: unknown })?.code });
    return text("Temporary error", 500);
  }
}
