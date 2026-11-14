import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { COMPANY } from "@/lib/legal/company";

/** Public pages (no sign-in): Privacy Policy and Terms of Service. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="bg-sidebar">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/privacy-policy" aria-label={`${COMPANY.productName} legal pages`}>
            <BrandLogo />
          </Link>
          <nav aria-label="Legal" className="flex gap-4 text-sm">
            <Link href="/privacy-policy" className="text-sidebar-foreground/80 hover:text-white">Privacy</Link>
            <Link href="/terms-of-service" className="text-sidebar-foreground/80 hover:text-white">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {COMPANY.brandName}</p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-foreground">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
