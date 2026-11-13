import type { Metadata } from "next";

import { WorkspaceContacts } from "@/components/contacts/workspace-contacts";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  // Mock data only — changes live in browser memory and reset on reload.
  return <WorkspaceContacts />;
}
