import { type CsvCell, toCsv } from "@/lib/csv";
import type { LeadRow } from "@/types/leads";

const HEADERS = [
  "Lead",
  "Username",
  "Status",
  "Cash collected",
  "Assigned to",
  "Account",
  "Email",
  "Phone",
  "Last interaction",
];

// Shown in the table when a value is missing; left blank in the file.
const EMPTY_LABEL = "N/A";

function blankIfEmpty(value: string | undefined): string {
  return !value || value === EMPTY_LABEL ? "" : value;
}

// The table shows cash as "$1,200.00". The file carries the bare number so
// the column can be summed.
function toCashAmount(label: string): number | "" {
  const amount = Number.parseFloat(label.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(amount) ? amount : "";
}

function toIsoDate(timestampMs: number | undefined): string {
  if (!timestampMs) return "";
  const date = new Date(timestampMs);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function toCells(row: LeadRow): CsvCell[] {
  return [
    row.name,
    blankIfEmpty(row.handle),
    row.status,
    toCashAmount(row.cash),
    blankIfEmpty(row.assignedTo),
    blankIfEmpty(row.account),
    blankIfEmpty(row.email),
    blankIfEmpty(row.phone),
    toIsoDate(row.updatedAtMs),
  ];
}

export function buildLeadsCsv(rows: LeadRow[]): string {
  return toCsv(HEADERS, rows.map(toCells));
}

// e.g. "setter-leads-2026-10-04.csv", dated in the visitor's own timezone.
export function buildLeadsCsvFileName(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `setter-leads-${year}-${month}-${day}.csv`;
}
