import type { Metadata } from "next";

import { WorkspaceSettings } from "@/components/workspace/workspace-settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <WorkspaceSettings />;
}
