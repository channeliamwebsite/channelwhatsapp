import type { Metadata } from "next";

import { ConversationsInbox } from "@/components/conversations/conversations-inbox";

export const metadata: Metadata = { title: "Conversations" };

export default function ConversationsPage() {
  return <ConversationsInbox />;
}
