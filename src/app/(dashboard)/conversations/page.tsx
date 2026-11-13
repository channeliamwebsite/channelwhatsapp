import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export const metadata: Metadata = { title: "Conversations" };

export default function ConversationsPage() {
  return <ModulePlaceholder href="/conversations" />;
}
