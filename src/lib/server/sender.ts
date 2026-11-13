/** Outbound WhatsApp sending contract — SERVER ONLY. */
import type { WhatsAppTemplate } from "@/types/template";
import type { Workspace } from "@/types/workspace";

export type OutboundMessage = { to: string; template: WhatsAppTemplate; variables: string[]; buttonUrls: string[] };
export type SendResult = { ok: true; waMessageId: string } | { ok: false; retryable: boolean; error: string };
export interface MessageSender {
  send(message: OutboundMessage): Promise<SendResult>;
}

/**
 * Returns the WhatsApp Cloud API sender for a workspace, or null while the
 * integration is not configured. Implemented in the WhatsApp API phase.
 */
export function getSender(workspace: Workspace): MessageSender | null {
  void workspace;
  return null;
}

