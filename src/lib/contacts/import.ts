import type { Contact, ContactInput, OptInStatus } from "@/types/contact";
import { CONSENT_SOURCES } from "@/types/contact";

import { phoneKey, validatePhone } from "./phone";

export type ImportField =
  | "fullName" | "phone" | "email" | "country" | "city" | "organisation"
  | "designation" | "audienceGroups" | "tags" | "optInStatus" | "consentSource" | "consentDate";

export const IMPORT_FIELDS: { field: ImportField; label: string; required?: boolean; aliases: string[] }[] = [
  { field: "fullName", label: "Full name", required: true, aliases: ["name", "full name", "contact name", "fullname"] },
  { field: "phone", label: "WhatsApp number", required: true, aliases: ["phone", "mobile", "whatsapp", "whatsapp number", "phone number", "mobile number"] },
  { field: "email", label: "Email", aliases: ["email", "e-mail", "email address"] },
  { field: "country", label: "Country", aliases: ["country"] },
  { field: "city", label: "City", aliases: ["city", "town", "location"] },
  { field: "organisation", label: "Organisation", aliases: ["organisation", "organization", "company"] },
  { field: "designation", label: "Designation", aliases: ["designation", "title", "job title", "role"] },
  { field: "audienceGroups", label: "Audience groups", aliases: ["audience groups", "groups", "group", "audience"] },
  { field: "tags", label: "Tags", aliases: ["tags", "tag", "labels"] },
  { field: "optInStatus", label: "WhatsApp opt-in", aliases: ["opt-in", "opt in", "whatsapp opt-in", "optin", "consent", "opt-in status"] },
  { field: "consentSource", label: "Consent source", aliases: ["consent source", "source"] },
  { field: "consentDate", label: "Consent date", aliases: ["consent date", "opt-in date"] },
];

export type ColumnMapping = Partial<Record<ImportField, string>>;

export type ParsedFile = { fileName: string; headers: string[]; rows: Record<string, string>[] };

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;

export async function parseContactFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error("File is larger than 5 MB.");
  const XLSX = await import("xlsx");
  const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) throw new Error("The file has no sheets.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (rows.length === 0) throw new Error("No rows found. Make sure the first row contains column headers.");
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Too many rows — the limit is ${MAX_IMPORT_ROWS} per import.`);
  const headers = Object.keys(rows[0]);
  return {
    fileName: file.name,
    headers,
    rows: rows.map((r) => Object.fromEntries(headers.map((h) => [h, String(r[h] ?? "").trim()]))),
  };
}

const norm = (s: string) => s.toLowerCase().replace(/[_\s]+/g, " ").trim();

export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const { field, aliases } of IMPORT_FIELDS) {
    const hit = headers.find((h) => aliases.includes(norm(h)));
    if (hit) mapping[field] = hit;
  }
  return mapping;
}

function parseOptIn(value: string): OptInStatus | null {
  const v = norm(value);
  if (!v) return null;
  if (["yes", "y", "true", "1", "opted in", "opted_in", "opt in", "subscribed"].includes(v)) return "opted_in";
  if (["no", "n", "false", "0", "opted out", "opted_out", "opt out", "unsubscribed", "stop"].includes(v)) return "opted_out";
  return "pending";
}

const splitList = (v: string) => v.split(/[;,|]/).map((s) => s.trim()).filter(Boolean);

export type ReviewStatus = "ready" | "update" | "invalid" | "duplicate_in_file" | "exists";

export type ReviewRow = {
  rowNumber: number;
  input: ContactInput;
  status: ReviewStatus;
  issues: string[];
  existingId?: string;
};

export type ImportOptions = {
  defaultOptIn: OptInStatus;
  defaultConsentSource: (typeof CONSENT_SOURCES)[number];
  addToGroup: string;
  duplicateStrategy: "skip" | "update";
  today: string;
};

export function reviewRows(
  file: ParsedFile,
  mapping: ColumnMapping,
  options: ImportOptions,
  existing: Contact[],
): ReviewRow[] {
  const existingByPhone = new Map(existing.map((c) => [phoneKey(c.phone), c]));
  const seenInFile = new Set<string>();
  const get = (row: Record<string, string>, f: ImportField) => (mapping[f] ? row[mapping[f]!] ?? "" : "");

  return file.rows.map((row, i) => {
    const issues: string[] = [];
    const fullName = get(row, "fullName");
    if (!fullName) issues.push("Missing name");

    const phoneResult = validatePhone(get(row, "phone"));
    if (!phoneResult.valid) issues.push(phoneResult.error);
    const phone = phoneResult.valid ? phoneResult.e164 : get(row, "phone");

    const email = get(row, "email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push("Invalid email");

    const optInStatus = parseOptIn(get(row, "optInStatus")) ?? options.defaultOptIn;
    const rawSource = get(row, "consentSource");
    const consentSource =
      optInStatus === "pending"
        ? ""
        : (CONSENT_SOURCES.find((s) => norm(s) === norm(rawSource)) ?? options.defaultConsentSource);
    const consentDate = optInStatus === "pending" ? "" : get(row, "consentDate").slice(0, 10) || options.today;

    const groups = splitList(get(row, "audienceGroups"));
    if (options.addToGroup) groups.push(options.addToGroup);

    const input: ContactInput = {
      fullName,
      phone,
      email,
      country: get(row, "country") || (phoneResult.valid ? phoneResult.country ?? "" : ""),
      city: get(row, "city"),
      organisation: get(row, "organisation"),
      designation: get(row, "designation"),
      audienceGroups: [...new Set(groups)],
      tags: [...new Set(splitList(get(row, "tags")))],
      optInStatus,
      consentSource,
      consentDate,
    };

    const base = { rowNumber: i + 2, input, issues };
    if (issues.length) return { ...base, status: "invalid" as const };

    const key = phoneKey(phone);
    if (seenInFile.has(key)) return { ...base, status: "duplicate_in_file" as const, issues: ["Same number appears earlier in the file"] };
    seenInFile.add(key);

    const match = existingByPhone.get(key);
    if (match) {
      return {
        ...base,
        status: options.duplicateStrategy === "update" ? ("update" as const) : ("exists" as const),
        issues: [`Matches existing contact ${match.fullName}`],
        existingId: match.id,
      };
    }
    return { ...base, status: "ready" as const };
  });
}

export const TEMPLATE_HEADERS = IMPORT_FIELDS.map((f) => f.label);
export const TEMPLATE_SAMPLE = [
  "Anita Joseph", "+91 98470 12345", "anita@example.com", "India", "Kochi", "Example Pvt Ltd",
  "Founder", "Newsletter subscribers; Event attendees", "Startup; Kerala", "yes", "Website form", "2026-11-01",
];
