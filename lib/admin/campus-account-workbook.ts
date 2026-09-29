/**
 * Reading and writing the College Admin / Chairman spreadsheet.
 *
 * ExcelJS is imported dynamically: it is a large dependency and only these two actions need it.
 * The pure row logic lives in `campus-account-sheet.ts` so it can be tested without a workbook.
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

/**
 * Builds the workbook. Posts with no holder are included with empty name and email — that is what
 * makes an export usable as the fill-in template for the next import.
 */
export async function buildCampusAccountWorkbook(
  role: CampusAccountRole,
  rows: readonly CampusAccountExportRow[],
): Promise<Blob> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "OptiCore";
  wb.created = new Date();

  const ws = wb.addWorksheet(ROLE_TITLE[role]);
  ws.columns = [
    { header: CAMPUS_ACCOUNT_SHEET_COLUMNS[0], key: "assignmentCode", width: 18 },
    { header: role === "college_admin" ? "College" : "Department", key: "assignmentName", width: 42 },
    { header: CAMPUS_ACCOUNT_SHEET_COLUMNS[1], key: "fullName", width: 30 },
    { header: CAMPUS_ACCOUNT_SHEET_COLUMNS[2], key: "email", width: 34 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };

  for (const row of rows) ws.addRow(row);

  // Passwords are set once at import; saying so on the sheet stops anyone adding a column for them.
  const note = ws.addRow([]);
  ws.addRow([
    "Fill in Full name and Email for each row, then import. Passwords are set during import, never in this file.",
  ]);
  ws.mergeCells(`A${note.number + 1}:D${note.number + 1}`);
  ws.getCell(`A${note.number + 1}`).font = { italic: true, size: 9, color: { argb: "FF6B7280" } };

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

/** Reads the first worksheet of an uploaded file into rows. */
export async function readCampusAccountWorkbook(file: File): Promise<CampusAccountSheetRow[]> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const ws = wb.worksheets[0];
  if (!ws) throw new Error("That file has no worksheet.");

  const grid: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[];
    // ExcelJS pads index 0; drop it so columns line up with the header.
    grid.push(values.slice(1));
  });

  const [header, ...body] = grid;
  if (!header) throw new Error("That file has no header row.");
  return parseSheetRows(header, body);
}
