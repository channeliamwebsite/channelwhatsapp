"use client";

import { useHub } from "@/lib/store/hub-store";

import { ContactsManager } from "./contacts-manager";

/** Remounts the manager per workspace so filters and selection never leak across clients. */
export function WorkspaceContacts() {
  const { workspace } = useHub();
  return <ContactsManager key={workspace.id} isMockData />;
}
