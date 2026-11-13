export type ConversationStatus = "open" | "pending" | "closed";
export type MessageType = "text" | "template" | "image" | "document" | "audio" | "video";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "received";

/** One thread per contact per workspace. Written only by webhook ingestion / real sends. */
export type Conversation = {
  id: string;
  workspaceId: string;
  contactId: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastDirection: MessageDirection;
  /** Inbound message time — opens Meta's 24-hour customer service window. */
  lastInboundAt?: string;
};

export type ConversationMessage = {
  id: string;
  workspaceId: string;
  conversationId: string;
  contactId: string;
  direction: MessageDirection;
  type: MessageType;
  text?: string;
  templateId?: string;
  media?: { mediaId?: string; url?: string; mimeType?: string; filename?: string; caption?: string };
  status: MessageStatus;
  /** WhatsApp message id — links status webhooks to this message. */
  waMessageId?: string;
  error?: string;
  timestamp: string;
};
