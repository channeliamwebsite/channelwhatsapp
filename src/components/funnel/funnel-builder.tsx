"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Clock, Eye, EyeOff, Lock, LogOut, MessageSquareReply, MousePointerClick, Send, ShieldCheck, type LucideIcon } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { BRANCHES, BRANCH_LABEL, LOCKED_EXIT_BRANCHES } from "@/lib/funnel/engine";
import { WAIT_LIMITS } from "@/lib/funnel/validate";
import { cn, formatNumber } from "@/lib/utils";
import type { Branch, BranchAction, FunnelDefinition } from "@/types/campaign";
import type { WhatsAppTemplate } from "@/types/template";

export type FunnelCounts = { m1: number; m2: Record<Branch, number>; m3: Record<Branch, number> };

const BRANCH_ICON: Record<Branch, LucideIcon> = {
  clicked: MousePointerClick,
  read_not_clicked: Eye,
  not_read: EyeOff,
  replied: MessageSquareReply,
  failed: AlertTriangle,
};

type Props = {
  value: FunnelDefinition;
  templates: WhatsAppTemplate[];
  /** Omit to render read-only. */
  onChange?: (value: FunnelDefinition) => void;
  counts?: FunnelCounts;
};

export function FunnelBuilder({ value, templates, onChange, counts }: Props) {
  const readOnly = !onChange;
  const approved = templates.filter((t) => t.status === "approved");
  const set = (patch: Partial<FunnelDefinition>) => onChange?.({ ...value, ...patch });

  return (
    <div className="flex flex-col items-stretch">
      <MessageNode
        step={1}
        title="Message 1 · Initial template"
        subtitle="Sent to every campaign-eligible contact in the audience"
        templateId={value.message1.templateId}
        templates={templates}
        approved={approved}
        readOnly={readOnly}
        count={counts?.m1}
        onTemplate={(templateId) => set({ message1: { templateId } })}
      />
      <Connector />
      <WaitNode hours={value.wait1Hours} readOnly={readOnly} onChange={(wait1Hours) => set({ wait1Hours })} label="Wait, then evaluate Message 1 behaviour" />
      <Connector />
      <BranchGrid
        step={2}
        title="Message 2 · Based on Message 1 behaviour"
        actions={value.message2}
        templates={templates}
        approved={approved}
        readOnly={readOnly}
        counts={counts?.m2}
        onChange={(message2) => set({ message2 })}
      />
      <Connector />
      <WaitNode hours={value.wait2Hours} readOnly={readOnly} onChange={(wait2Hours) => set({ wait2Hours })} label="Wait, then evaluate Message 2 behaviour" />
      <Connector />
      <BranchGrid
        step={3}
        title="Message 3 · Final follow-up based on Message 2 behaviour"
        actions={value.message3}
        templates={templates}
        approved={approved}
        readOnly={readOnly}
        counts={counts?.m3}
        onChange={(message3) => set({ message3 })}
      />
      <Connector />
      <section aria-label="Exit conditions" className="rounded-xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><LogOut className="size-4 text-primary" aria-hidden="true" /> Exit conditions — checked before every message</h3>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <ExitRow label="Customer replies" hint="Hand over to Conversations" locked />
          <ExitRow label="Customer opts out" hint="Contact marked opted out everywhere" locked />
          <li className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
            <Checkbox id="exitOnConversion" checked={value.exitOnConversion} disabled={readOnly} onChange={(e) => set({ exitOnConversion: e.target.checked })} />
            <label htmlFor="exitOnConversion" className="flex-1">
              Conversion completed
              <span className="block text-[11px] text-muted-foreground">Stop follow-ups once the goal is met</span>
            </label>
          </li>
          <ExitRow label="Campaign is stopped" hint="All recipients leave the funnel" locked />
        </ul>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
          Only opted-in contacts with recorded consent are messaged. Every message uses an approved template (allowed outside the 24-hour window) and is sent at most once per recipient.
        </p>
      </section>
    </div>
  );
}

function Connector() {
  return <div aria-hidden="true" className="mx-auto h-6 w-px bg-border" />;
}

function ExitRow({ label, hint, locked }: { label: string; hint: string; locked?: boolean }) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2">
      {locked && <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Always on" />}
      <span className="flex-1">
        {label}
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
    </li>
  );
}

function WaitNode({ hours, onChange, readOnly, label }: { hours: number; onChange: (h: number) => void; readOnly: boolean; label: string }) {
  const id = React.useId();
  return (
    <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-full border border-dashed border-border bg-muted/50 px-4 py-2 text-sm">
      <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <label htmlFor={id} className="flex-1 text-muted-foreground">{label}</label>
      <Input
        id={id}
        type="number"
        min={WAIT_LIMITS.min}
        max={WAIT_LIMITS.max}
        value={hours}
        disabled={readOnly}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-20 text-right tabular-nums"
      />
      <span className="text-muted-foreground">hrs</span>
    </div>
  );
}

function TemplatePreview({ template }: { template?: WhatsAppTemplate }) {
  if (!template) return null;
  return (
    <div className="mt-3 rounded-lg bg-[#e7f6ef] p-3 text-[13px] leading-snug text-[#1f1a1b]">
      <p>{template.body.replace("{{1}}", "Anita")}</p>
      {template.buttons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {template.buttons.map((b) => (
            <span key={b.text} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-info shadow-xs">{b.type === "url" ? "🔗 " : ""}{b.text}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateSelect({ id, value, approved, templates, onChange, disabled, allowExit }: { id: string; value: string; approved: WhatsAppTemplate[]; templates: WhatsAppTemplate[]; onChange: (v: string) => void; disabled?: boolean; allowExit?: boolean }) {
  const unapprovedCurrent = templates.find((t) => t.id === value && t.status !== "approved");
  return (
    <NativeSelect id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {allowExit && <option value="exit">Exit funnel — send nothing</option>}
      {!allowExit && !value && <option value="">Choose template…</option>}
      {unapprovedCurrent && <option value={unapprovedCurrent.id} disabled>{unapprovedCurrent.name} ({unapprovedCurrent.status})</option>}
      {approved.map((t) => <option key={t.id} value={t.id}>Send {t.name}</option>)}
    </NativeSelect>
  );
}

function MessageNode({ step, title, subtitle, templateId, templates, approved, readOnly, count, onTemplate }: {
  step: 1; title: string; subtitle: string; templateId: string; templates: WhatsAppTemplate[]; approved: WhatsAppTemplate[]; readOnly: boolean; count?: number; onTemplate: (id: string) => void;
}) {
  const id = React.useId();
  return (
    <section aria-label={title} className="rounded-xl border-2 border-primary/25 bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">{step}</span>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {count !== undefined && <CountPill count={count} />}
      </div>
      <label htmlFor={id} className="sr-only">Message 1 template</label>
      <div className="mt-3">
        <TemplateSelect id={id} value={templateId} approved={approved} templates={templates} onChange={onTemplate} disabled={readOnly} />
      </div>
      <TemplatePreview template={templates.find((t) => t.id === templateId)} />
    </section>
  );
}

function CountPill({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
      <Send className="size-3" aria-hidden="true" />
      {formatNumber(count)} sent
    </span>
  );
}

function BranchGrid({ step, title, actions, templates, approved, readOnly, counts, onChange }: {
  step: 2 | 3; title: string; actions: Record<Branch, BranchAction>; templates: WhatsAppTemplate[]; approved: WhatsAppTemplate[]; readOnly: boolean; counts?: Record<Branch, number>; onChange: (a: Record<Branch, BranchAction>) => void;
}) {
  return (
    <section aria-label={title} className="rounded-xl border-2 border-primary/15 bg-card p-4 shadow-xs">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">{step}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {BRANCHES.map((b) => {
          const Icon = BRANCH_ICON[b];
          const action = actions[b];
          const locked = LOCKED_EXIT_BRANCHES.includes(b);
          const id = `step${step}-${b}`;
          const selected = action.type === "send" ? templates.find((t) => t.id === action.templateId) : undefined;
          return (
            <div key={b} className={cn("flex flex-col rounded-lg border p-3", action.type === "send" ? "border-primary/30 bg-accent/30" : "border-border bg-muted/30")}>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={id} className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <Icon className="size-3.5 text-primary" aria-hidden="true" />
                  {BRANCH_LABEL[b]}
                </label>
                {counts && action.type === "send" && <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{formatNumber(counts[b])}</span>}
              </div>
              {locked ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3" aria-hidden="true" /> Exits — handled in Conversations</p>
              ) : (
                <div className="mt-2">
                  <TemplateSelect
                    id={id}
                    allowExit
                    value={action.type === "send" ? action.templateId : "exit"}
                    approved={approved}
                    templates={templates}
                    disabled={readOnly}
                    onChange={(v) => onChange({ ...actions, [b]: v === "exit" ? { type: "exit" } : { type: "send", templateId: v } })}
                  />
                </div>
              )}
              {selected && <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{selected.body.replace("{{1}}", "Anita")}</p>}
              {action.type === "exit" && !locked && <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><CheckCircle2 className="size-3" aria-hidden="true" /> Leaves the funnel</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
