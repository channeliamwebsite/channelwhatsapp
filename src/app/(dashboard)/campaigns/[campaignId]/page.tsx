import { Suspense } from "react";
import type { Metadata } from "next";

import { CampaignDetail } from "@/components/campaigns/campaign-detail";

export const metadata: Metadata = { title: "Campaign" };

export default function CampaignPage({ params }: PageProps<"/campaigns/[campaignId]">) {
  // Campaign ids are only known at request time, so params are read inside Suspense.
  return (
    <Suspense fallback={<p className="py-16 text-center text-sm text-muted-foreground">Loading campaign…</p>}>
      <CampaignLoader params={params} />
    </Suspense>
  );
}

async function CampaignLoader({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return <CampaignDetail campaignId={decodeURIComponent(campaignId)} />;
}
