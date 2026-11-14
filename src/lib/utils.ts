import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const compactFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

export function formatCompact(value: number) {
  return compactFormatter.format(value);
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

/** Share of `part` in `total` as a percentage (0 when total is 0). */
export function percentOf(part: number, total: number) {
  return total === 0 ? 0 : (part / total) * 100;
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** Formats an ISO timestamp as e.g. "10 Nov 2026" (IST, deterministic on server and client). */
export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** Formats an ISO timestamp as e.g. "14 Nov 2026, 12:30 pm IST". */
export function formatDateTime(iso: string) {
  return `${dateTimeFormatter.format(new Date(iso))} IST`;
}
