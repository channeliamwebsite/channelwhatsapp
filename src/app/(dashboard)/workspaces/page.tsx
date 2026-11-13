import type { Metadata } from "next";

import { WorkspacesManager } from "@/components/workspace/workspaces-manager";

export const metadata: Metadata = { title: "Workspaces" };

export default function WorkspacesPage() {
  return <WorkspacesManager />;
}
