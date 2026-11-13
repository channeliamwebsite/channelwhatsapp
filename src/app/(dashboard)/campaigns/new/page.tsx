import type { Metadata } from "next";

import { CampaignBuilder } from "@/components/campaigns/campaign-builder";

export const metadata: Metadata = { title: "New campaign" };

export default function NewCampaignPage() {
  return <CampaignBuilder />;
}
