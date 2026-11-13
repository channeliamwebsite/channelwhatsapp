import type { Metadata } from "next";

import { FunnelsOverview } from "@/components/funnel/funnels-overview";

export const metadata: Metadata = { title: "Funnels" };

export default function AutomationPage() {
  return <FunnelsOverview />;
}
