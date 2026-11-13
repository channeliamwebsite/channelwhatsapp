import type { Metadata } from "next";

import { WorkspaceOverview } from "@/components/dashboard/workspace-overview";

export const metadata: Metadata = {
  title: "Overview",
};

export default function OverviewPage() {
  return <WorkspaceOverview />;
}
