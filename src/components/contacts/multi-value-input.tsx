"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";

type MultiValueInputProps = {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
  placeholder?: string;
};

/** Chip picker: choose from suggestions or type a new value and press Enter. */
export function MultiValueInput({ id, value, onChange, suggestions, placeholder }: MultiValueInputProps) {
  const [draft, setDraft] = React.useState("");
  const available = suggestions.filter((s) => !value.includes(s));

  function add(item: string) {
    const v = item.trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setDraft("");
  }

  return (
    <div className="rounded-lg border border-input bg-card p-1.5 shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15">
      <div className="flex flex-wrap gap-1.5">
        {value.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-md bg-accent py-0.5 pl-2 pr-1 text-xs font-medium text-accent-foreground">
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(value.filter((x) => x !== item))}
              className="rounded p-0.5 hover:bg-primary/10"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={value.length ? "" : placeholder}
          className="h-7 min-w-28 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {available.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 border-t border-border pt-1.5">
          {available.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
              )}
            >
              <Plus className="size-3" aria-hidden="true" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
