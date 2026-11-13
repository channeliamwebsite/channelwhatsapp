import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

/** Full-page placeholder shown while the workspace loads. */
export function DashboardSkeleton() {
  return (
    <div className="flex min-h-dvh bg-background" role="status" aria-label="Loading workspace">
      <div className="hidden w-64 shrink-0 bg-sidebar lg:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-16 border-b border-border bg-card" />
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  );
}
