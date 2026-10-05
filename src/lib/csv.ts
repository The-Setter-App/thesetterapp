// Builds CSV text that opens cleanly in Excel, Numbers and Google Sheets.

export type CsvCell = string | number | null | undefined;

// A cell that starts with one of these is run as a formula by spreadsheet
// apps. Lead names and notes come from other people, so such cells are
// prefixed with an apostrophe to keep them as plain text.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

const NEEDS_QUOTES = /[",\r\n]/;

// Excel only reads the file as UTF-8 when it starts with this mark.
const UTF8_BYTE_ORDER_MARK = "﻿";

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";

  const raw = String(value);
  // Numbers are written as they are so a negative amount stays a number.
  const text =
    typeof value === "string" && FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw;

  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return `${UTF8_BYTE_ORDER_MARK}${lines.join("\r\n")}\r\n`;
}
