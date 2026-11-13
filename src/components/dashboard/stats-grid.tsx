import { AlertTriangle, CheckCheck, Contact, Eye, Megaphone, Send, type LucideIcon } from "lucide-react";

import type { DashboardStat } from "@/types/dashboard";
import { formatPercent, percentOf } from "@/lib/utils";

import { StatCard } from "./stat-card";

const statMeta: Record<
  DashboardStat["id"],
  { icon: LucideIcon; tone: "brand" | "success" | "info" | "danger" | "neutral" }
> = {
  contacts: { icon: Contact, tone: "neutral" },
  campaigns: { icon: Megaphone, tone: "neutral" },
  sent: { icon: Send, tone: "brand" },
  delivered: { icon: CheckCheck, tone: "success" },
  read: { icon: Eye, tone: "info" },
  failed: { icon: AlertTriangle, tone: "danger" },
};

export function StatsGrid({ stats }: { stats: DashboardStat[] }) {
  const byId = Object.fromEntries(stats.map((s) => [s.id, s.value])) as Record<DashboardStat["id"], number>;

  function helperFor(stat: DashboardStat) {
    switch (stat.id) {
      case "delivered":
      case "failed":
        return `${formatPercent(percentOf(stat.value, byId.sent))} ${stat.helper}`;
      case "read":
        return `${formatPercent(percentOf(stat.value, byId.delivered))} ${stat.helper}`;
      default:
        return stat.helper;
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
      {stats.map((stat) => (
        <StatCard
          key={stat.id}
          label={stat.label}
          value={stat.value}
          change={stat.change}
          positiveIsGood={stat.positiveIsGood}
          helper={helperFor(stat)}
          icon={statMeta[stat.id].icon}
          tone={statMeta[stat.id].tone}
        />
      ))}
    </div>
  );
}
