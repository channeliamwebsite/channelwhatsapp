import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return <ModulePlaceholder href="/templates" />;
}
