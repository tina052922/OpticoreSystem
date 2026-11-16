/**
 * Excel import / export for College Admin and Chairman accounts.
 *
 * The format is three columns on the first sheet — Assignment code · Full name · Email — and the
 * Export file IS the template: it lists every college (or department) with its current holder, so
 * DOI fills the empty rows and imports the same file back.
 *
 * DOI supplies ONE temporary password at import time. No password is ever written to, or read from,
 * the file: a sheet gets emailed and forgotten in a Downloads folder, and a column of live
 * credentials there would outlive whatever it was for.
 *
 * Every row of an imported sheet is sorted into one of four buckets and shown before anything is
 * created (see `resolveImportRows`):
 *   ready      — will be registered;
 *   unchanged  — that post already has this same holder (exported rows left as they were);
 *   empty      — name and email left blank (posts nobody filled in) — ignored, not an error;
 *   error      — something to fix, with the reason.
 */

export type CampusAccountRole = "college_admin" | "chairman_admin";

export const CAMPUS_ACCOUNT_SHEET_COLUMNS = ["Assignment code", "Full name", "Email"] as const;

/** One row as typed in the sheet, before it is matched to a college or department. */
export type CampusAccountSheetRow = {
  /** College code for an admin ("COTE"), program code for a chairman ("BSIT"). */
  assignmentCode: string;
  fullName: string;
  email: string;
  /** Row number as Excel shows it, so a problem can be pointed at. */
  rowNumber: number;
};

export type CampusAccountImportStatus = "ready" | "unchanged" | "empty" | "error";

export type CampusAccountImportTarget = {
  row: CampusAccountSheetRow;
  status: CampusAccountImportStatus;
  /** Resolved from the assignment code; null when nothing matched. */
  collegeId: string | null;
  programId: string | null;
  /** Why this row cannot be imported (status "error"), otherwise null. */
  error: string | null;
};

const isEmailShaped = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function norm(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

/**
 * The text of one spreadsheet cell, whatever Excel stored in it.
 *
 * Excel turns a typed email into a HYPERLINK, and ExcelJS hands that back as `{ text, hyperlink }`,
 * not a string — read as `String(cell)` it became "[object Object]" and every typed email failed as
 * "malformed". Rich text (`{ richText: [...] }`), formulas (`{ formula, result }`) and dates are
 * flattened the same way.
 */
export function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return norm(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.richText)) {
      return norm((v.richText as { text?: unknown }[]).map((part) => String(part?.text ?? "")).join(""));
    }
    if ("text" in v) return cellText(v.text);
    if ("result" in v) return cellText(v.result);
    if (typeof v.hyperlink === "string") return norm(v.hyperlink.replace(/^mailto:/i, ""));
  }
  return "";
}

/** Header aliases people actually type, so a slightly different sheet still imports. */
const HEADER_ALIASES: Record<string, keyof Omit<CampusAccountSheetRow, "rowNumber">> = {
  "assignment code": "assignmentCode",
  "college code": "assignmentCode",
  "department code": "assignmentCode",
  "program code": "assignmentCode",
  college: "assignmentCode",
  department: "assignmentCode",
  program: "assignmentCode",
  code: "assignmentCode",
  "full name": "fullName",
  name: "fullName",
  fullname: "fullName",
  email: "email",
  "email address": "email",
  username: "email",
};

/** Maps a header row to column indexes; unknown headers are ignored. */
export function mapSheetHeaders(header: readonly unknown[]): {
  assignmentCode: number;
  fullName: number;
  email: number;
} {
  const found = { assignmentCode: -1, fullName: -1, email: -1 };
  header.forEach((cell, index) => {
    const key = HEADER_ALIASES[cellText(cell).toLowerCase()];
    if (key && found[key] === -1) found[key] = index;
  });
  return found;
}

/**
 * Rows from a parsed sheet, skipping lines with nothing on them.
 *
 * `rowNumbers` gives each row's real Excel row number (blank lines in between are not counted by the
 * reader); without it rows are numbered from `firstDataRowNumber`.
 */
export function parseSheetRows(
  header: readonly unknown[],
  rows: readonly (readonly unknown[])[],
  firstDataRowNumber = 2,
  rowNumbers?: readonly number[],
): CampusAccountSheetRow[] {
  const columns = mapSheetHeaders(header);
  if (columns.assignmentCode < 0 || columns.email < 0 || columns.fullName < 0) {
    const missing = [
      columns.assignmentCode < 0 ? "Assignment code" : null,
      columns.fullName < 0 ? "Full name" : null,
      columns.email < 0 ? "Email" : null,
    ].filter(Boolean);
    throw new Error(
      `The first row must be the headers "Assignment code", "Full name" and "Email" — missing: ${missing.join(", ")}. ` +
        "Use Export to get a ready-made template.",
    );
  }

  const out: CampusAccountSheetRow[] = [];
  rows.forEach((cells, i) => {
    const pick = (index: number) => (index >= 0 ? cellText(cells[index]) : "");
    const row: CampusAccountSheetRow = {
      assignmentCode: pick(columns.assignmentCode),
      fullName: pick(columns.fullName),
      email: pick(columns.email).toLowerCase(),
      rowNumber: rowNumbers?.[i] ?? firstDataRowNumber + i,
    };
    // A line with nothing on it is spreadsheet padding, not a mistake worth reporting.
    if (!row.assignmentCode && !row.fullName && !row.email) return;
    out.push(row);
  });

  return out;
}

export type ScopeLookup = {
  colleges: readonly { id: string; code: string }[];
  programs: readonly { id: string; code: string; collegeId: string | null }[];
};

/**
 * Sorts each row into ready / unchanged / empty / error (see the file comment).
 *
 * `currentHolders` maps a post (college or program id) to its current holder's email, so an exported
 * row that was left as it was reads as "unchanged" rather than as a clash.
 */
export function resolveImportRows(
  rows: readonly CampusAccountSheetRow[],
  role: CampusAccountRole,
  scope: ScopeLookup,
  currentHolders: ReadonlyMap<string, string> = new Map(),
): CampusAccountImportTarget[] {
  const seenCodes = new Set<string>();
  const seenEmails = new Set<string>();
  const label = role === "college_admin" ? "college" : "department";

  return rows.map((row) => {
    const code = row.assignmentCode.toLowerCase();
    let collegeId: string | null = null;
    let programId: string | null = null;
    const done = (status: CampusAccountImportStatus, error: string | null = null): CampusAccountImportTarget => ({
      row,
      status,
      collegeId,
      programId,
      error,
    });

    // Name and email both blank: a post nobody filled in. Not a mistake.
    if (!row.fullName && !row.email) return done("empty");

    if (!row.assignmentCode) return done("error", `No ${label} code.`);
    if (role === "college_admin") {
      const hit = scope.colleges.find((c) => c.code.toLowerCase() === code);
      if (!hit) return done("error", `No college with code "${row.assignmentCode}". See the Codes sheet.`);
      collegeId = hit.id;
    } else {
      const hit = scope.programs.find((p) => p.code.toLowerCase() === code);
      if (!hit) return done("error", `No department with code "${row.assignmentCode}". See the Codes sheet.`);
      programId = hit.id;
      collegeId = hit.collegeId ?? null;
    }

    const assignmentId = (programId ?? collegeId) as string;
    const holderEmail = currentHolders.get(assignmentId);
    if (holderEmail !== undefined) {
      if (holderEmail.toLowerCase() === row.email) return done("unchanged");
      return done(
        "error",
        `${row.assignmentCode} already has a holder (${holderEmail || "registered"}). Remove them on this page first, or leave the row as exported.`,
      );
    }

    if (!row.fullName) return done("error", "Full name is empty.");
    if (!isEmailShaped(row.email)) return done("error", "Email is empty or not a valid address.");
    if (seenCodes.has(code)) return done("error", `The sheet lists ${row.assignmentCode} twice.`);
    if (seenEmails.has(row.email)) return done("error", "The sheet lists this email twice.");

    seenCodes.add(code);
    seenEmails.add(row.email);
    return done("ready");
  });
}

/** `college-admins_2026-09-30.xlsx` */
export function campusAccountFileName(role: CampusAccountRole, asOf: Date = new Date()): string {
  const base = role === "college_admin" ? "college-admins" : "chairmen";
  const date = [
    asOf.getFullYear(),
    String(asOf.getMonth() + 1).padStart(2, "0"),
    String(asOf.getDate()).padStart(2, "0"),
  ].join("-");
  return `${base}_${date}.xlsx`;
}
