import { cn } from "@/lib/utils";

/** Compact list of chips with "+N" overflow. */
export function ChipList({ items, max = 2, className }: { items: string[]; max?: number; className?: string }) {
  if (items.length === 0) return <span className="text-muted-foreground/60">—</span>;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <span className={cn("flex gap-1", className)} title={items.join(", ")}>
      {shown.map((item) => (
        <span key={item} className="whitespace-nowrap rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
          {item}
        </span>
      ))}
      {rest > 0 && <span className="rounded-md px-1 py-0.5 text-[11px] font-medium text-muted-foreground">+{rest}</span>}
    </span>
  );
}
