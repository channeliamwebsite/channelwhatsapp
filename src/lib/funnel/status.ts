/**
 * Delivery-status ordering shared by funnel recipients and conversation messages.
 * Webhook statuses can arrive out of order and more than once; a message must
 * never regress (read → delivered) and a delivered/read message can't "fail".
 */
export type DeliveryLike = "queued" | "sent" | "delivered" | "read" | "failed";

const RANK: Record<Exclude<DeliveryLike, "failed">, number> = { queued: 0, sent: 1, delivered: 2, read: 3 };

/** Returns the status to keep after receiving `incoming` for a message currently at `current`. */
export function nextDeliveryStatus(current: DeliveryLike, incoming: DeliveryLike): DeliveryLike {
  if (incoming === "failed") return current === "queued" || current === "sent" ? "failed" : current;
  if (current === "failed") return incoming === "delivered" || incoming === "read" ? incoming : current;
  return RANK[incoming] > RANK[current] ? incoming : current;
}
