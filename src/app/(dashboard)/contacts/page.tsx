import { Suspense } from "react";
import type { Metadata } from "next";

import { WorkspaceContacts } from "@/components/contacts/workspace-contacts";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  // useSearchParams (?contact=) needs a Suspense boundary.
  return (
    <Suspense>
      <WorkspaceContacts />
    </Suspense>
  );
}
