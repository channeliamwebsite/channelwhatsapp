import type { Metadata } from "next";

import { AutomationsManager } from "@/components/automation/automations-manager";

export const metadata: Metadata = { title: "Automation" };

export default function AutomationPage() {
  return <AutomationsManager />;
}
