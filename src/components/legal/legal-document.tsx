import { COMPANY, hasUnconfirmedDetails } from "@/lib/legal/company";

/** Visible marker for information that management has not confirmed yet. */
export function Placeholder({ label }: { label: string }) {
  return (
    <mark className="rounded bg-warning-soft px-1.5 py-0.5 font-medium text-[#7a3306] [box-decoration-break:clone]">
      [To be confirmed: {label}]
    </mark>
  );
}

/** Renders a confirmed company value, or a placeholder. */
export function Detail({ value, label }: { value: string | null; label: string }) {
  return value ? <>{value}</> : <Placeholder label={label} />;
}

export type LegalSection = { id: string; title: string; body: React.ReactNode };

export function LegalDocument({ title, summary, sections }: { title: string; summary: React.ReactNode; sections: LegalSection[] }) {
  return (
    <article className="mx-auto w-full max-w-3xl">
      {hasUnconfirmedDetails() && (
        <p role="note" className="mb-6 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-[#7a3306]">
          <strong className="font-semibold">Draft.</strong> Highlighted items are awaiting confirmation and must be completed before this document is relied on.
        </p>
      )}
      <header className="border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {COMPANY.productName} · Effective date: <Detail value={COMPANY.effectiveDate} label="effective date" />
        </p>
        <div className="mt-4 text-[15px] leading-relaxed text-foreground">{summary}</div>
      </header>

      <nav aria-label="Contents" className="my-8 rounded-xl border border-border bg-card p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contents</p>
        <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-foreground underline-offset-4 hover:text-primary hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-10">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24">
            <h2 id={`${s.id}-title`} className="mb-3 text-lg font-semibold tracking-tight text-foreground">
              {i + 1}. {s.title}
            </h2>
            <div className="legal-body flex flex-col gap-3 text-[15px] leading-relaxed text-foreground/90 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
