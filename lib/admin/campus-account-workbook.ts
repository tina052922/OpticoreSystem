/**
 * Reading and writing the College Admin / Chairman spreadsheet.
 *
 * ExcelJS is imported dynamically: it is a large dependency and only these two actions need it.
 * The pure row logic lives in `campus-account-sheet.ts` so it can be tested without a workbook.
 *
 * The exported file is the template:
 *   Sheet 1 (the data)  — Assignment code · College/Department · Full name · Email, one row per post.
 *   "How to fill"       — the instructions, so nobody has to guess the format.
 *   "Codes"             — every valid code with its name; the code column offers them as a dropdown.
 */

import {
  CAMPUS_ACCOUNT_SHEET_COLUMNS,
  campusAccountFileName,
  parseSheetRows,
  type CampusAccountRole,
  type CampusAccountSheetRow,
} from "./campus-account-sheet";

export type CampusAccountExportRow = {
  assignmentCode: string;
  assignmentName: string;
  fullName: string;
  email: string;
};

const ROLE_TITLE: Record<CampusAccountRole, string> = {
  college_admin: "College Admins",
  chairman_admin: "Department Chairmen",
};

/** Extra empty rows the code dropdown covers, for posts added after export. */
const DROPDOWN_SPARE_ROWS = 200;

export async function buildCampusAccountWorkbook(
  role: CampusAccountRole,
  rows: readonly CampusAccountExportRow[],
): Promise<Blob> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "OptiCore";
  wb.created = new Date();

  const isAdmin = role === "college_admin";
  const what = isAdmin ? "college" : "department";

  // ── Sheet 1: the data (import reads this one) ──────────────────────────
  const ws = wb.addWorksheet(ROLE_TITLE[role]);
  ws.columns = [
    { header: CAMPUS_ACCOUNT_SHEET_COLUMNS[0], key: "assignmentCode", width: 18 },
    { header: isAdmin ? "College" : "Department", key: "assignmentName", width: 44 },
    { header: CAMPUS_ACCOUNT_SHEET_COLUMNS[1], key: "fullName", width: 30 },
    { header: CAMPUS_ACCOUNT_SHEET_COLUMNS[2], key: "email", width: 34 },
  ];
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF780301" } };
  header.alignment = { vertical: "middle" };

  for (const row of rows) {
    const r = ws.addRow(row);
    // Name and email are the cells to fill: shade the empty ones so they stand out.
    if (!row.fullName && !row.email) {
      for (const col of [3, 4]) {
        r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7E6" } };
      }
    }
  }

  // ── "Codes": every valid code, also used by the dropdown ──────────────
  const codes = wb.addWorksheet("Codes");
  codes.columns = [
    { header: isAdmin ? "College code" : "Department code", key: "code", width: 20 },
    { header: isAdmin ? "College" : "Department", key: "name", width: 50 },
  ];
  codes.getRow(1).font = { bold: true };
  for (const row of rows) codes.addRow({ code: row.assignmentCode, name: row.assignmentName });

  const lastCodeRow = Math.max(2, rows.length + 1);
  for (let i = 2; i <= rows.length + 1 + DROPDOWN_SPARE_ROWS; i++) {
    ws.getCell(`A${i}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Codes!$A$2:$A$${lastCodeRow}`],
      showErrorMessage: true,
      errorTitle: "Unknown code",
      error: `Pick a ${what} code from the list (see the Codes sheet).`,
    };
  }

  // ── "How to fill" ─────────────────────────────────────────────────────
  const help = wb.addWorksheet("How to fill");
  help.getColumn(1).width = 110;
  const lines: [string, boolean?][] = [
    [`How to import ${ROLE_TITLE[role]} into OptiCore`, true],
    [""],
    [`1. Use the first sheet ("${ROLE_TITLE[role]}"). Keep its header row exactly as it is.`],
    [`2. For each ${what} that needs an account, type the person's Full name and Email (the shaded cells).`],
    [`   • Assignment code — the ${what} code, e.g. ${rows[0]?.assignmentCode ?? (isAdmin ? "COTE" : "BSIT")}. Pick it from the dropdown; all codes are on the Codes sheet.`],
    [`   • Full name — as it should appear in OptiCore and on the INS forms.`],
    [`   • Email — the address they will sign in with. One account per email.`],
    [`3. Leave a row's Full name and Email blank to skip that ${what}. Rows that already have a holder can stay as they are.`],
    [`4. Save the file (.xlsx) and choose Import from Excel in OptiCore. You will see a preview of every row before anything is created.`],
    [`5. Enter one temporary password for the new accounts. Each person is asked to change it the first time they sign in.`],
    [""],
    ["Do not add a password column — passwords are never stored in this file."],
    [`Only one holder per ${what}: to replace someone, remove them in OptiCore first.`],
  ];
  for (const [text, bold] of lines) {
    const r = help.addRow([text]);
    if (bold) r.font = { bold: true, size: 13 };
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 4 } };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Builds the workbook and hands it to the browser as a download. */
export async function downloadCampusAccountWorkbook(
  role: CampusAccountRole,
  rows: readonly CampusAccountExportRow[],
): Promise<void> {
  const blob = await buildCampusAccountWorkbook(role, rows);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = campusAccountFileName(role);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Reads the data sheet of an uploaded file into rows: the first sheet, or — when someone moved the
 * sheets around — the first one whose header row has the import columns.
 */
export async function readCampusAccountWorkbook(file: File): Promise<CampusAccountSheetRow[]> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error("That file could not be opened. Save it as an Excel workbook (.xlsx) and try again.");
  }

  const readSheet = (ws: (typeof wb.worksheets)[number]) => {
    const grid: unknown[][] = [];
    const rowNumbers: number[] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      // ExcelJS pads index 0; drop it so columns line up with the header.
      grid.push((row.values as unknown[]).slice(1));
      rowNumbers.push(row.number);
    });
    return { grid, rowNumbers };
  };

  const sheets = wb.worksheets.filter((s) => s.name !== "Codes" && s.name !== "How to fill");
  if (sheets.length === 0) throw new Error("That file has no worksheet with accounts.");

  let lastError: unknown = null;
  for (const ws of sheets) {
    const { grid, rowNumbers } = readSheet(ws);
    const [header, ...body] = grid;
    if (!header) continue;
    try {
      return parseSheetRows(header, body, 2, rowNumbers.slice(1));
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("That file has no header row.");
}
