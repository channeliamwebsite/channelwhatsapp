import Link from "next/link";

import type { AudienceOverview } from "@/types/dashboard";
import { formatNumber, formatPercent, percentOf } from "@/lib/utils";

import { AudienceDistributionChart } from "./audience-distribution-chart";
import { DashboardCard } from "./dashboard-card";

export function AudienceDistribution({
  audience,
}: {
  audience: AudienceOverview;
}) {
  return (
    <DashboardCard
      title="Audience distribution"
      description={`${formatPercent(percentOf(audience.optedIn, audience.totalContacts))} opted in · +${formatNumber(audience.newThisMonth)} this month`}
      action={
        <Link href="/audience-groups" className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
          Manage
        </Link>
      }
      contentClassName="pt-4"
    >
      {audience.totalContacts === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No contacts added yet.</p>
      ) : (
        <AudienceDistributionChart segments={audience.segments} />
      )}
    </DashboardCard>
  );
}
