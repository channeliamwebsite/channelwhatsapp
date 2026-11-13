import type { Metadata } from "next";

import { AudienceGroupsManager } from "@/components/audience/audience-groups-manager";

export const metadata: Metadata = { title: "Audience Groups" };

export default function AudienceGroupsPage() {
  return <AudienceGroupsManager />;
}
