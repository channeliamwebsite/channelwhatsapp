"use client";

import * as React from "react";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { downloadBlob, toCsv } from "@/lib/contacts/export";
import {
  IMPORT_FIELDS,
  TEMPLATE_HEADERS,
  TEMPLATE_SAMPLE,
  guessMapping,
  parseContactFile,
  reviewRows,
  type ColumnMapping,
  type ImportOptions,
  type ParsedFile,
  type ReviewRow,
  type ReviewStatus,
} from "@/lib/contacts/import";
import { cn, formatNumber } from "@/lib/utils";
import { CONSENT_SOURCES, type Contact, type ContactInput } from "@/types/contact";

export type ImportResult = { create: ContactInput[]; update: { id: string; input: ContactInput }[]; skipped: number };

type Props = {
  open: boolean;
  contacts: Contact[];
  groups: string[];
  today: string;
  onClose: () => void;
  onImport: (result: ImportResult) => void;
};

const STEPS = ["Upload", "Map columns", "Review", "Done"] as const;

const statusMeta: Record<ReviewStatus, { label: string; variant: "success" | "info" | "danger" | "warning" | "neutral" }> = {
  ready: { label: "New", variant: "success" },
  update: { label: "Update", variant: "info" },
  invalid: { label: "Invalid", variant: "danger" },
  duplicate_in_file: { label: "Duplicate in file", variant: "warning" },
  exists: { label: "Already exists", variant: "neutral" },
};

export function ImportContactsDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()} className="max-w-3xl">
      {props.open && <Wizard {...props} />}
    </Dialog>
  );
}

function Wizard({ contacts, groups, today, onClose, onImport }: Props) {
  const [step, setStep] = React.useState(0);
  const [file, setFile] = React.useState<ParsedFile | null>(null);
  const [mapping, setMapping] = React.useState<ColumnMapping>({});
  const [options, setOptions] = React.useState<ImportOptions>({
    defaultOptIn: "pending",
    defaultConsentSource: "Verified import",
    addToGroup: "",
    duplicateStrategy: "skip",
    today,
  });
  const [consentConfirmed, setConsentConfirmed] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [issuesOnly, setIssuesOnly] = React.useState(false);
  const [summary, setSummary] = React.useState<{ created: number; updated: number; skipped: ReviewRow[] } | null>(null);

  const review = React.useMemo(
    () => (file && step >= 2 ? reviewRows(file, mapping, options, contacts) : []),
    [file, mapping, options, contacts, step],
  );
  const counts = review.reduce<Record<ReviewStatus, number>>(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { ready: 0, update: 0, invalid: 0, duplicate_in_file: 0, exists: 0 },
  );
  const importable = counts.ready + counts.update;
  const missingRequired = IMPORT_FIELDS.filter((f) => f.required && !mapping[f.field]);
  const needsConsentConfirm = options.defaultOptIn === "opted_in" && !consentConfirmed;

  async function handleFile(f: File | undefined) {
    if (!f) return;
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) {
      setError("Upload a .csv, .xlsx or .xls file.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const parsed = await parseContactFile(f);
      setFile(parsed);
      setMapping(guessMapping(parsed.headers));
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    } finally {
      setLoading(false);
    }
  }

  function runImport() {
    const create = review.filter((r) => r.status === "ready").map((r) => r.input);
    const update = review.filter((r) => r.status === "update").map((r) => ({ id: r.existingId!, input: r.input }));
    const skipped = review.filter((r) => r.status !== "ready" && r.status !== "update");
    onImport({ create, update, skipped: skipped.length });
    setSummary({ created: create.length, updated: update.length, skipped });
    setStep(3);
  }

  function downloadSkipped() {
    if (!summary) return;
    const rows = summary.skipped.map((r) => [String(r.rowNumber), r.input.fullName, r.input.phone, statusMeta[r.status].label, r.issues.join("; ")]);
    downloadBlob(toCsv(["Row", "Name", "Phone", "Status", "Reason"], rows), "import-skipped-rows.csv", "text/csv;charset=utf-8");
  }

  const visibleRows = (issuesOnly ? review.filter((r) => r.status !== "ready" && r.status !== "update") : review).slice(0, 200);

  return (
    <>
      <DialogHeader title="Import contacts" description="Upload an Excel or CSV file. Nothing is saved until you confirm." onClose={onClose}>
        <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" aria-label="Import steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
              <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] font-semibold", i < step ? "bg-success text-white" : i === step ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                {i + 1}
              </span>
              <span className={i === step ? "font-semibold text-foreground" : "text-muted-foreground"}>{s}</span>
              {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </DialogHeader>

      {step === 0 && (
        <DialogBody className="flex flex-col gap-4">
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            className={cn("flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors", dragging ? "border-primary bg-accent/50" : "border-border hover:border-primary/40 hover:bg-muted/40")}
          >
            {loading ? <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" /> : <UploadCloud className="size-8 text-primary" aria-hidden="true" />}
            <span className="mt-3 text-sm font-semibold">{loading ? "Reading file…" : "Drop your file here or click to browse"}</span>
            <span className="mt-1 text-xs text-muted-foreground">.xlsx, .xls or .csv · up to 5 MB · first row must be headers</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} disabled={loading} />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              Need a starting point?
            </span>
            <Button variant="outline" size="sm" onClick={() => downloadBlob(toCsv(TEMPLATE_HEADERS, [TEMPLATE_SAMPLE]), "contacts-template.csv", "text/csv;charset=utf-8")}>
              <Download aria-hidden="true" />
              Download template
            </Button>
          </div>
        </DialogBody>
      )}

      {step === 1 && file && (
        <DialogBody className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{file.fileName}</span> · {formatNumber(file.rows.length)} rows. Match your columns to contact fields.
          </p>
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {IMPORT_FIELDS.map((f) => (
              <div key={f.field} className="flex flex-col gap-1.5">
                <Label htmlFor={`map-${f.field}`}>
                  {f.label}
                  {f.required && <span className="text-primary"> *</span>}
                </Label>
                <NativeSelect id={`map-${f.field}`} value={mapping[f.field] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f.field]: e.target.value || undefined }))}>
                  <option value="">— Don’t import —</option>
                  {file.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </NativeSelect>
              </div>
            ))}
          </div>

          <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
            <legend className="px-1 text-[13px] font-semibold">Import settings</legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="defaultOptIn">Opt-in when the file has none</Label>
              <NativeSelect id="defaultOptIn" value={options.defaultOptIn} onChange={(e) => { setOptions((o) => ({ ...o, defaultOptIn: e.target.value as ImportOptions["defaultOptIn"] })); setConsentConfirmed(false); }}>
                <option value="pending">Pending (recommended)</option>
                <option value="opted_in">Opted in</option>
                <option value="opted_out">Opted out</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consentSourceDefault">Consent source when missing</Label>
              <NativeSelect id="consentSourceDefault" value={options.defaultConsentSource} onChange={(e) => setOptions((o) => ({ ...o, defaultConsentSource: e.target.value as ImportOptions["defaultConsentSource"] }))}>
                {CONSENT_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addToGroup">Also add everyone to</Label>
              <NativeSelect id="addToGroup" value={options.addToGroup} onChange={(e) => setOptions((o) => ({ ...o, addToGroup: e.target.value }))}>
                <option value="">No extra group</option>
                {groups.map((g) => <option key={g} value={g}>{g}</option>)}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dupStrategy">When a number already exists</Label>
              <NativeSelect id="dupStrategy" value={options.duplicateStrategy} onChange={(e) => setOptions((o) => ({ ...o, duplicateStrategy: e.target.value as ImportOptions["duplicateStrategy"] }))}>
                <option value="skip">Skip the row</option>
                <option value="update">Update the existing contact</option>
              </NativeSelect>
            </div>
            {options.defaultOptIn === "opted_in" && (
              <label className="flex items-start gap-2.5 rounded-lg bg-warning-soft p-3 text-sm text-[#7a3306] sm:col-span-2">
                <Checkbox checked={consentConfirmed} onChange={(e) => setConsentConfirmed(e.target.checked)} className="mt-0.5" />
                I confirm these contacts gave explicit consent to receive WhatsApp messages from Channeliam.
              </label>
            )}
          </fieldset>
          {missingRequired.length > 0 && (
            <p className="text-sm text-destructive">Map the required fields: {missingRequired.map((f) => f.label).join(", ")}.</p>
          )}
        </DialogBody>
      )}

      {step === 2 && (
        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(statusMeta) as ReviewStatus[]).filter((s) => counts[s] > 0).map((s) => (
              <Badge key={s} variant={statusMeta[s].variant}>{statusMeta[s].label}: {formatNumber(counts[s])}</Badge>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={issuesOnly} onChange={(e) => setIssuesOnly(e.target.checked)} />
            Show only rows that will be skipped
          </label>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2 font-semibold">Row</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Name</th>
                  <th scope="col" className="px-3 py-2 font-semibold">WhatsApp number</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.rowNumber} className="border-t border-border">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.rowNumber}</td>
                    <td className="px-3 py-2">{r.input.fullName || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{r.input.phone || "—"}</td>
                    <td className="px-3 py-2"><Badge variant={statusMeta[r.status].variant}>{statusMeta[r.status].label}</Badge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.issues.join("; ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleRows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No rows to show.</p>}
          </div>
          {review.length > 200 && <p className="text-xs text-muted-foreground">Showing the first 200 rows.</p>}
        </DialogBody>
      )}

      {step === 3 && summary && (
        <DialogBody className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
          <p className="text-base font-semibold">Import complete</p>
          <p className="text-sm text-muted-foreground">
            {formatNumber(summary.created)} added · {formatNumber(summary.updated)} updated · {formatNumber(summary.skipped.length)} skipped
          </p>
          {summary.skipped.length > 0 && (
            <Button variant="outline" size="lg" onClick={downloadSkipped}>
              <Download aria-hidden="true" />
              Download skipped rows
            </Button>
          )}
        </DialogBody>
      )}

      <DialogFooter>
        {step === 1 && <Button variant="outline" size="lg" onClick={() => setStep(0)}>Back</Button>}
        {step === 2 && <Button variant="outline" size="lg" onClick={() => setStep(1)}>Back</Button>}
        {step < 3 && step !== 0 && <span className="hidden flex-1 sm:block" />}
        {step === 0 && <Button variant="outline" size="lg" onClick={onClose}>Cancel</Button>}
        {step === 1 && (
          <Button size="lg" disabled={missingRequired.length > 0 || needsConsentConfirm} onClick={() => setStep(2)}>
            Review {file ? formatNumber(file.rows.length) : ""} rows
          </Button>
        )}
        {step === 2 && (
          <Button size="lg" disabled={importable === 0} onClick={runImport}>
            Import {formatNumber(importable)} contacts
          </Button>
        )}
        {step === 3 && <Button size="lg" onClick={onClose}>Done</Button>}
      </DialogFooter>
    </>
  );
}
