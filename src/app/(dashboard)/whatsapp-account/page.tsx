import type { Metadata } from "next";

import { WhatsAppAccountManager } from "@/components/whatsapp/whatsapp-account-manager";

export const metadata: Metadata = { title: "WhatsApp Account" };

export default function WhatsAppAccountPage() {
  return <WhatsAppAccountManager />;
}
