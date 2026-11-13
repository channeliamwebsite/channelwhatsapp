import type { Contact } from "@/types/contact";

import { isCampaignEligible } from "./eligibility";

export const EXPORT_COLUMNS: { header: string; value: (c: Contact) => string }[] = [
  { header: "Full name", value: (c) => c.fullName },
  { header: "WhatsApp number", value: (c) => c.phone },
  { header: "Email", value: (c) => c.email },
  { header: "Country", value: (c) => c.country },
  { header: "City", value: (c) => c.city },
  { header: "Organisation", value: (c) => c.organisation },
  { header: "Designation", value: (c) => c.designation },
  { header: "Audience groups", value: (c) => c.audienceGroups.join("; ") },
  { header: "Tags", value: (c) => c.tags.join("; ") },
  { header: "WhatsApp opt-in", value: (c) => c.optInStatus },
  { header: "Consent source", value: (c) => c.consentSource },
  { header: "Consent date", value: (c) => c.consentDate },
  { header: "Created date", value: (c) => c.createdAt.slice(0, 10) },
  { header: "Campaign eligible", value: (c) => (isCampaignEligible(c) ? "yes" : "no") },
];

function csvCell(value: string) {
  // Quote when needed; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: string[], rows: string[][]) {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportContacts(contacts: Contact[], format: "csv" | "xlsx", baseName = "channeliam-contacts") {
  const headers = EXPORT_COLUMNS.map((c) => c.header);
  const rows = contacts.map((c) => EXPORT_COLUMNS.map((col) => col.value(c)));
  if (format === "csv") {
    downloadBlob("﻿" + toCsv(headers, rows), `${baseName}.csv`, "text/csv;charset=utf-8");
    return;
  }
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Contacts");
  XLSX.writeFile(book, `${baseName}.xlsx`);
}
