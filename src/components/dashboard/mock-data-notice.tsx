import Link from "next/link";
import { Info } from "lucide-react";

/** Page-level banner stating that the figures shown are mock data. */
export function MockDataNotice() {
  return (
    <div
      role="note"
      className="flex flex-col gap-2 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-[#7a3306] sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2.5">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold">You&apos;re viewing sample data.</strong>{" "}
          These figures are placeholders for design and are not real WhatsApp delivery data.
        </span>
      </p>
      <Link
        href="/whatsapp-account"
        className="shrink-0 pl-6.5 text-sm font-semibold underline-offset-4 hover:underline sm:pl-0"
      >
        Connect account
      </Link>
    </div>
  );
}
