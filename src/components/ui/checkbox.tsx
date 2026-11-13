"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & { indeterminate?: boolean };

export function Checkbox({ indeterminate = false, className, ...props }: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      data-slot="checkbox"
      className={cn("size-4 shrink-0 cursor-pointer rounded border-input accent-primary disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}
