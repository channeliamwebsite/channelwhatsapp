"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { formatNumber } from "@/lib/utils";

type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizes?: number[];
};

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 25, 50],
}: PaginationBarProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-muted-foreground">
        Showing <span className="font-medium text-foreground tabular-nums">{formatNumber(from)}–{formatNumber(to)}</span> of{" "}
        <span className="font-medium text-foreground tabular-nums">{formatNumber(total)}</span>
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-muted-foreground">
          <span className="hidden sm:inline">Rows</span>
          <NativeSelect
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-[72px]"
          >
            {pageSizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </NativeSelect>
        </label>
        <span className="tabular-nums text-muted-foreground">
          {page} / {pageCount}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-lg" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon-lg" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
