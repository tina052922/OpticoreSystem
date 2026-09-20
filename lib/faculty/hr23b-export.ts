/**
 * Excel export of the Faculty List in the layout of CTU HR Form 23B
 * ("Faculty Profile as to their Educational Qualification", June 2012, Rev. 0).
 *
 * The sheet is built to be printed: landscape, fitted to one page wide, with the two header rows
 * repeated on every page. Only the rows the page is currently showing are exported, so the on-screen
 * filters decide what lands on the form.
 *
 * ExcelJS is imported dynamically — it is a large dependency and only this action needs it.
 */

import type { FacultyProfile, User } from "@/types/db";
import { normalizeFacultyProfileStatus } from "@/lib/faculty/employment-status";
import { computeAge, facultyNamePartsFrom, normalizeFacultySex, toDateInputValue } from "@/lib/faculty/hr-form-23b";

export type Hr23bExportRow = {
  user: Pick<User, "id" | "name" | "employeeId">;
  profile: FacultyProfile | null;
};

/** One printed line of the form. `dateOfBirth` is a real date so Excel can sort and filter on it. */
export type Hr23bSheetRow = {
  lastName: string;
  firstName: string;
  middleName: string;
  academicRank: string;
  status: string;
  sex: string;
  dateOfBirth: Date | string;
  age: number | "";
  educationalQualification: string;
  experience: string;
  eligibility: string;
};

/** Blank rows kept below the data so a short list still prints as the 25-line form. */
export const HR23B_MIN_PRINTED_ROWS = 25;

const COLUMN_WIDTHS = [5, 18, 16, 16, 18, 14, 6, 15, 6, 30, 22, 20];

function text(v: string | null | undefined): string {
  return (v ?? "").trim();
}

/** The cells of one faculty row, in the form's column order. */
export function hr23bSheetRow(row: Hr23bExportRow, asOf: Date = new Date()): Hr23bSheetRow {
  const { profile, user } = row;
  const parts = facultyNamePartsFrom(profile ?? {}, user.name);
  const iso = toDateInputValue(profile?.dateOfBirth);
  const age = computeAge(profile?.dateOfBirth, asOf);
  const [y, m, d] = iso ? iso.split("-").map(Number) : [0, 0, 0];

  return {
    lastName: parts.lastName,
    firstName: parts.firstName,
    middleName: parts.middleName,
    academicRank: text(profile?.academicRank),
    // A row without a profile has no employment status yet, so the cell stays blank on the form.
    status: profile ? normalizeFacultyProfileStatus(profile.status) : "",
    sex: normalizeFacultySex(profile?.sex),
    dateOfBirth: iso ? new Date(y, m - 1, d) : "",
    age: age ?? "",
    educationalQualification: text(profile?.educationalQualification),
    experience: text(profile?.experience),
    eligibility: text(profile?.eligibility),
  };
}

export function hr23bSheetRows(rows: Hr23bExportRow[], asOf: Date = new Date()): Hr23bSheetRow[] {
  return rows.map((r) => hr23bSheetRow(r, asOf));
}

/** `HR-Form-23B_BSIT_2026-09-21.xlsx` — scope and date, safe for any filesystem. */
export function hr23bFileName(scopeLabel: string | null | undefined, asOf: Date = new Date()): string {
  const scope = text(scopeLabel).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const date = [
    asOf.getFullYear(),
    String(asOf.getMonth() + 1).padStart(2, "0"),
    String(asOf.getDate()).padStart(2, "0"),
  ].join("-");
  return ["HR-Form-23B", scope, date].filter(Boolean).join("_") + ".xlsx";
}

export type Hr23bWorkbookMeta = {
  /** Printed under the title, e.g. "2026–2027, 1st Semester". Blank leaves the form's own blank line. */
  academicYear?: string | null;
  /** Shown only in the file name and sheet tab, never on the printed form. */
  scopeLabel?: string | null;
  asOf?: Date;
};

/** Builds the workbook and returns it as a Blob ready to download. */
export async function buildHr23bWorkbook(
  rows: Hr23bExportRow[],
  meta: Hr23bWorkbookMeta = {},
): Promise<Blob> {
  const ExcelJS = await import("exceljs");
  const asOf = meta.asOf ?? new Date();
  const data = hr23bSheetRows(rows, asOf);

  const wb = new ExcelJS.Workbook();
  wb.creator = "OptiCore";
  wb.created = asOf;

  const ws = wb.addWorksheet(text(meta.scopeLabel) || "Faculty Profile", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: "5:6",
    },
    views: [{ state: "frozen", ySplit: 6 }],
  });

  COLUMN_WIDTHS.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // ── Form heading ──────────────────────────────────────────────────────────
  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = "CEBU TECHNOLOGICAL UNIVERSITY";
  ws.getCell("A1").font = { bold: true, size: 12 };

  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = "Faculty Profile as to their Educational Qualification";
  ws.getCell("A2").font = { bold: true, size: 12 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:J3");
  ws.getCell("A3").value = `Academic Year ${text(meta.academicYear) || "____________"}`;
  ws.getCell("A3").alignment = { horizontal: "center" };

  // Form control block, top right, as printed.
  const controlLines: [string, string][] = [
    ["K1", "HR Form 23B"],
    ["K2", "June 2012"],
    ["K3", "Revision: 0"],
  ];
  for (const [ref, value] of controlLines) {
    ws.mergeCells(`${ref}:L${ref.slice(1)}`);
    ws.getCell(ref).value = value;
    ws.getCell(ref).font = { size: 9 };
    ws.getCell(ref).alignment = { horizontal: "right" };
  }

  ws.getRow(4).height = 6;

  // ── Table header (two rows, as on the form) ───────────────────────────────
  const HEADER_TOP = 5;
  const HEADER_BOTTOM = 6;

  ws.mergeCells(`A${HEADER_TOP}:A${HEADER_BOTTOM}`);
  ws.getCell(`A${HEADER_TOP}`).value = "No.";

  ws.mergeCells(`B${HEADER_TOP}:D${HEADER_TOP}`);
  ws.getCell(`B${HEADER_TOP}`).value = "NAME OF PERSONNEL";
  ws.getCell(`B${HEADER_BOTTOM}`).value = "LAST NAME";
  ws.getCell(`C${HEADER_BOTTOM}`).value = "FIRST NAME";
  ws.getCell(`D${HEADER_BOTTOM}`).value = "MIDDLE NAME";

  const spannedHeaders: [string, string][] = [
    ["E", "ACADEMIC RANK"],
    ["F", "STATUS"],
    ["G", "SEX"],
    ["H", "DATE OF BIRTH"],
    ["I", "AGE"],
    ["J", "EDUCATIONAL QUALIFICATION"],
    ["K", "EXPERIENCE"],
    ["L", "ELIGIBILITY"],
  ];
  for (const [col, label] of spannedHeaders) {
    ws.mergeCells(`${col}${HEADER_TOP}:${col}${HEADER_BOTTOM}`);
    ws.getCell(`${col}${HEADER_TOP}`).value = label;
  }

  ws.getRow(HEADER_TOP).height = 20;
  ws.getRow(HEADER_BOTTOM).height = 20;
  for (const rowNumber of [HEADER_TOP, HEADER_BOTTOM]) {
    const row = ws.getRow(rowNumber);
    for (let col = 1; col <= COLUMN_WIDTHS.length; col += 1) {
      const cell = row.getCell(col);
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  }

  // ── Data rows ─────────────────────────────────────────────────────────────
  const FIRST_DATA_ROW = HEADER_BOTTOM + 1;
  const printedRows = Math.max(data.length, HR23B_MIN_PRINTED_ROWS);

  for (let i = 0; i < printedRows; i += 1) {
    const r = data[i];
    const row = ws.getRow(FIRST_DATA_ROW + i);
    row.height = 18;
    row.getCell(1).value = i + 1;
    if (r) {
      row.getCell(2).value = r.lastName;
      row.getCell(3).value = r.firstName;
      row.getCell(4).value = r.middleName;
      row.getCell(5).value = r.academicRank;
      row.getCell(6).value = r.status;
      row.getCell(7).value = r.sex;
      row.getCell(8).value = r.dateOfBirth;
      row.getCell(9).value = r.age;
      row.getCell(10).value = r.educationalQualification;
      row.getCell(11).value = r.experience;
      row.getCell(12).value = r.eligibility;
    }

    for (let col = 1; col <= COLUMN_WIDTHS.length; col += 1) {
      const cell = row.getCell(col);
      cell.font = { size: 10 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      const centered = col === 1 || (col >= 6 && col <= 9);
      cell.alignment = { horizontal: centered ? "center" : "left", vertical: "middle", wrapText: col >= 10 };
    }
    row.getCell(8).numFmt = "mmmm d, yyyy";
  }

  const lastDataRow = FIRST_DATA_ROW + printedRows - 1;

  // Column filters for whoever opens the file; column A (No.) stays out of the range.
  ws.autoFilter = {
    from: { row: HEADER_BOTTOM, column: 2 },
    to: { row: lastDataRow, column: COLUMN_WIDTHS.length },
  };

  // ── Signatories, as printed under the table ───────────────────────────────
  const noteRow = lastDataRow + 1;
  ws.getCell(`A${noteRow}`).value = "(Alphabetical Order)";
  ws.getCell(`A${noteRow}`).font = { italic: true, size: 9 };

  ws.getCell(`C${noteRow}`).value = "Prepared by:";
  ws.getCell(`C${noteRow}`).font = { size: 10 };
  ws.getCell(`J${noteRow}`).value = "Certified Correct:";
  ws.getCell(`J${noteRow}`).font = { size: 10 };

  const signatureRow = noteRow + 2;
  ws.getRow(signatureRow).height = 18;
  for (const range of ["C", "D"]) {
    ws.getCell(`${range}${signatureRow}`).border = { bottom: { style: "thin" } };
  }
  for (const range of ["J", "K"]) {
    ws.getCell(`${range}${signatureRow}`).border = { bottom: { style: "thin" } };
  }

  const captionRow = signatureRow + 1;
  ws.mergeCells(`C${captionRow}:D${captionRow}`);
  ws.getCell(`C${captionRow}`).value = "HRMO Designate";
  ws.getCell(`C${captionRow}`).alignment = { horizontal: "center" };
  ws.getCell(`C${captionRow}`).font = { size: 9 };

  ws.mergeCells(`J${captionRow}:K${captionRow}`);
  ws.getCell(`J${captionRow}`).value = "Administrative Officer/HRMO";
  ws.getCell(`J${captionRow}`).alignment = { horizontal: "center" };
  ws.getCell(`J${captionRow}`).font = { size: 9 };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Builds the workbook and hands it to the browser as a download. */
export async function downloadHr23bWorkbook(
  rows: Hr23bExportRow[],
  meta: Hr23bWorkbookMeta = {},
): Promise<void> {
  const asOf = meta.asOf ?? new Date();
  const blob = await buildHr23bWorkbook(rows, { ...meta, asOf });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = hr23bFileName(meta.scopeLabel, asOf);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick so the click has already started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
