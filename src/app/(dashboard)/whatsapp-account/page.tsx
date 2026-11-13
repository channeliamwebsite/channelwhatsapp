import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export const metadata: Metadata = { title: "WhatsApp Account" };

export default function WhatsAppAccountPage() {
  return <ModulePlaceholder href="/whatsapp-account" />;
}
