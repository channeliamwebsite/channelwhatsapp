import { CircleCheck, CircleSlash, Clock, Contact as ContactIcon } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { isCampaignEligible } from "@/lib/contacts/eligibility";
import { formatNumber, formatPercent, percentOf } from "@/lib/utils";
import type { Contact } from "@/types/contact";

export function ContactsStats({ contacts }: { contacts: Contact[] }) {
  const total = contacts.length;
  const optedIn = contacts.filter((c) => c.optInStatus === "opted_in").length;
  const pending = contacts.filter((c) => c.optInStatus === "pending").length;
  const optedOut = contacts.filter((c) => c.optInStatus === "opted_out").length;
  const eligible = contacts.filter(isCampaignEligible).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard label="Total contacts" value={total} icon={ContactIcon} tone="neutral" helper="Across all audience groups" />
      <StatCard label="Opted in" value={optedIn} icon={CircleCheck} tone="success" helper={`${formatNumber(eligible)} campaign eligible`} />
      <StatCard label="Pending consent" value={pending} icon={Clock} tone="info" helper={`${formatPercent(percentOf(pending, total))} of contacts`} />
      <StatCard label="Opted out" value={optedOut} icon={CircleSlash} tone="danger" helper="Excluded from campaigns" />
    </div>
  );
}
