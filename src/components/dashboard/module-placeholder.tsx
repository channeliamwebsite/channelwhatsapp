import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getNavItem } from "@/lib/navigation";

import { PageHeader } from "./page-header";

/** Temporary page body for modules that are not built yet. */
export function ModulePlaceholder({ href }: { href: string }) {
  const item = getNavItem(href);
  const Icon = item.icon;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={item.title} description={item.description} />
      <Card className="items-center px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-semibold">{item.title} is coming soon</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This module is part of the roadmap and will be built in an upcoming phase.
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-6" })}>
          <ArrowLeft aria-hidden="true" />
          Back to overview
        </Link>
      </Card>
    </div>
  );
}
