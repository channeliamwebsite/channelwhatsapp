import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return <ModulePlaceholder href="/reports" />;
}
