import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";

// Expected spreadsheet columns (header row required, case-insensitive):
//   date         YYYY-MM-DD
//   start_time   HH:MM (24h)
//   end_time     HH:MM (24h)
//   class_type   must match an existing class type name (created if new)
//   capacity     optional, falls back to the class type's default
//   coach_email  optional, must match an existing profile's email
//   location     optional

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const rowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  start_time: z.string().regex(timeRegex, "start_time must be HH:MM"),
  end_time: z.string().regex(timeRegex, "end_time must be HH:MM"),
  class_type: z.string().min(1, "class_type is required"),
  capacity: z.coerce.number().int().positive().optional(),
  coach_email: z.string().email().optional().or(z.literal("")),
  location: z.string().optional(),
});

export type ScheduleRow = z.infer<typeof rowSchema>;

export interface ParseResult {
  rows: ScheduleRow[];
  errors: { row: number; message: string }[];
}

function normalizeKeys(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    out[key.trim().toLowerCase().replace(/\s+/g, "_")] = typeof value === "string" ? value.trim() : value;
  }
  return out;
}

function validateRecords(records: Record<string, unknown>[]): ParseResult {
  const rows: ScheduleRow[] = [];
  const errors: ParseResult["errors"] = [];

  records.forEach((raw, i) => {
    const normalized = normalizeKeys(raw);
    // Drop fully blank rows (trailing spreadsheet rows).
    if (Object.values(normalized).every((v) => v === "" || v == null)) return;

    const result = rowSchema.safeParse(normalized);
    if (result.success) {
      rows.push(result.data);
    } else {
      errors.push({
        row: i + 2, // +1 for header row, +1 for 1-indexing
        message: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      });
    }
  });

  return { rows, errors };
}

export function parseCsvText(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return validateRecords(parsed.data);
}

export function parseXlsxBuffer(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false });
  return validateRecords(records);
}

// Accepts a Google Sheets "Publish to web" CSV link, or a normal
// /edit?... link (rewritten to the CSV export endpoint for the first sheet).
export function normalizeGoogleSheetsUrl(url: string): string {
  const publishedMatch = url.match(/\/spreadsheets\/d\/e\/([^/]+)\/pub/);
  if (publishedMatch) {
    return url.includes("output=csv") ? url : `${url}${url.includes("?") ? "&" : "?"}output=csv`;
  }

  const idMatch = url.match(/\/spreadsheets\/d\/([^/]+)/);
  if (idMatch) {
    return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
  }

  return url;
}
