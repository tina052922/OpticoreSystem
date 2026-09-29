/**
 * Excel import / export for College Admin and Chairman accounts.
 *
 * DOI fills the assignment and the person's details in a spreadsheet, then supplies ONE temporary
 * password at import time. No password is ever written to, or read from, the file: a sheet gets
 * emailed, downloaded and forgotten in a Downloads folder, and a column of live credentials there
 * would outlive whatever it was for.
 *
 * Export doubles as the template — downloading the current list gives exactly the columns an import
 * expects, so "export, edit, import" is a round trip.
 */

export type CampusAccountRole = "college_admin" | "chairman_admin";

export const CAMPUS_ACCOUNT_SHEET_COLUMNS = ["Assignment code", "Full name", "Email"] as const;

/** One row as typed in the sheet, before it is matched to a college or department. */
export type CampusAccountSheetRow = {
  /** College code for an admin ("COTE"), program code for a chairman ("BSIT"). */
  assignmentCode: string;
  fullName: string;
  email: string;
  /** 1-based row number in the sheet, so a problem can be pointed at. */
  rowNumber: number;
};

export type CampusAccountImportTarget = {
  row: CampusAccountSheetRow;
  /** Resolved from the assignment code; null when nothing matched. */
  collegeId: string | null;
  programId: string | null;
  /** Why this row cannot be imported, or null when it is ready. */
  error: string | null;
};

const isEmailShaped = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function norm(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
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
    const key = HEADER_ALIASES[norm(cell).toLowerCase()];
    if (key && found[key] === -1) found[key] = index;
  });
  return found;
}

/** Rows from a parsed sheet, skipping blank lines. */
export function parseSheetRows(
  header: readonly unknown[],
  rows: readonly (readonly unknown[])[],
  firstDataRowNumber = 2,
): CampusAccountSheetRow[] {
  const columns = mapSheetHeaders(header);
  const out: CampusAccountSheetRow[] = [];

  rows.forEach((cells, i) => {
    const pick = (index: number) => (index >= 0 ? norm(cells[index]) : "");
    const row: CampusAccountSheetRow = {
      assignmentCode: pick(columns.assignmentCode),
      fullName: pick(columns.fullName),
      email: pick(columns.email).toLowerCase(),
      rowNumber: firstDataRowNumber + i,
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
 * Matches each row to the post it names and says what is wrong with the ones that cannot import.
 * Every row is reported — a silent skip would leave DOI believing an account was created.
 */
export function resolveImportRows(
  rows: readonly CampusAccountSheetRow[],
  role: CampusAccountRole,
  scope: ScopeLookup,
  takenAssignmentIds: ReadonlySet<string> = new Set(),
): CampusAccountImportTarget[] {
  const seenCodes = new Set<string>();
  const seenEmails = new Set<string>();

  return rows.map((row) => {
    const code = row.assignmentCode.toLowerCase();
    let collegeId: string | null = null;
    let programId: string | null = null;
    let error: string | null = null;

    if (!row.assignmentCode) {
      error = role === "college_admin" ? "No college code." : "No department code.";
    } else if (role === "college_admin") {
      const hit = scope.colleges.find((c) => c.code.toLowerCase() === code);
      if (!hit) error = `No college with code "${row.assignmentCode}".`;
      else collegeId = hit.id;
    } else {
      const hit = scope.programs.find((p) => p.code.toLowerCase() === code);
      if (!hit) error = `No department with code "${row.assignmentCode}".`;
      else {
        programId = hit.id;
        collegeId = hit.collegeId ?? null;
      }
    }

    if (!error && !row.fullName) error = "No full name.";
    if (!error && !isEmailShaped(row.email)) error = "Email is missing or malformed.";

    const assignmentId = programId ?? collegeId;
    if (!error && assignmentId && takenAssignmentIds.has(assignmentId)) {
      error = "That post already has a holder.";
    }
    if (!error && seenCodes.has(code)) error = "The sheet lists this post twice.";
    if (!error && seenEmails.has(row.email)) error = "The sheet lists this email twice.";

    if (!error) {
      seenCodes.add(code);
      seenEmails.add(row.email);
    }

    return { row, collegeId, programId, error };
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
