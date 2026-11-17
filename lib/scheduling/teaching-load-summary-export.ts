/**
 * Excel export of the Summary of Teaching Load — the same rows, totals and signatories as the page
 * and the PDF (unique Subjects Handled, Total Preps/Week, Total Hours/Week), laid out like the
 * college's sheet.
 *
 * ExcelJS is imported dynamically — it is large and only this action needs it.
 */
import type { TeachingLoadCategoryGroup, TeachingLoadSummaryRow } from "@/lib/scheduling/teaching-load-summary";
import type { TeachingLoadSignatories } from "@/lib/scheduling/teaching-load-signatories";
import { TEACHING_LOAD_SUBHEADS } from "@/lib/scheduling/teaching-load-header-colors";
import { DEFAULT_REPORT_FOOTER_BANNER } from "@/lib/system-configuration/campus-branding";

const COLUMN_WIDTHS = [5, 26, 20, 26, 7, 9, 9, 7, 9, 9, 9, 9, 30, 28];
const LAST_COL = "N";

function round(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

/** The cells of one faculty line, in column order A–N. */
export function teachingLoadExcelRow(row: TeachingLoadSummaryRow, index: number): (string | number)[] {
  return [
    index + 1,
    row.facultyName,
    row.administrativeDesignation ?? "",
    row.otherResponsibilities ?? "",
    row.day.preps,
    round(row.day.unitsPerWeek),
    round(row.day.hoursPerWeek),
    row.evening.preps,
    round(row.evening.unitsPerWeek),
    round(row.evening.hoursPerWeek),
    row.totalPreps,
    round(row.totalHoursPerWeek),
    row.subjectsHandled === "—" ? "" : row.subjectsHandled,
    row.justification ?? "",
  ];
}

export async function buildTeachingLoadSummaryWorkbook(args: {
  collegeName: string;
  semesterLabel: string;
  groups: (TeachingLoadCategoryGroup & { heading?: string })[];
  signatories?: TeachingLoadSignatories | null;
  /** Campus letterhead image URL (same-origin), placed above the title. */
  headerBannerUrl?: string | null;
  /** Rankings strip at the foot; defaults to the campus one, `null` leaves it out. */
  footerBannerUrl?: string | null;
}): Promise<Blob> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "OptiCore";
  const ws = wb.addWorksheet("Summary of Teaching Load", {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  COLUMN_WIDTHS.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const thin = { style: "thin" as const };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  let r = 1;
  // Letterhead over the first rows, centred across the sheet (as on the college's form).
  const banner = await loadImageBase64(args.headerBannerUrl);
  if (banner) {
    const id = wb.addImage({ base64: banner.base64, extension: banner.extension });
    const height = 120;
    const width = Math.round(height * banner.ratio);
    ws.addImage(id, { tl: { col: 3.2, row: 0.2 }, ext: { width, height } });
    for (let k = 1; k <= 6; k += 1) ws.getRow(k).height = 20;
    r = 7;
  }
  const titleLine = (text: string, bold: boolean, size: number, height?: number) => {
    ws.mergeCells(`A${r}:${LAST_COL}${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = text;
    c.font = { bold, size, name: "Arial" };
    c.alignment = { horizontal: "center", vertical: "middle" };
    if (height) ws.getRow(r).height = height;
    r += 1;
  };
  titleLine(args.collegeName.toUpperCase(), true, 13, 20);
  r += 1;
  titleLine("Summary of Teaching Load", true, 18, 28);
  titleLine(args.semesterLabel, true, 11, 18);
  r += 1;

  for (const g of args.groups) {
    ws.mergeCells(`A${r}:${LAST_COL}${r}`);
    const h = ws.getCell(`A${r}`);
    h.value = g.heading || g.categoryLabel;
    h.font = { bold: true, size: 11, color: { argb: "FF780301" } };
    r += 1;

    // Two header rows: DAY / EVENING over Preps · Units/Week · Hours/Week.
    const top = r;
    const bottom = r + 1;
    const spanned: [string, string][] = [
      ["A", "No."],
      ["B", "Name of Faculty"],
      ["C", "Administrative Designation"],
      ["D", "Other Responsibilities (GAA-Funded Research & Extension Projects, and Thesis Advisorship)"],
      ["K", "TOTAL PREPS/ WEEK"],
      ["L", "TOTAL HOURS/ WEEK"],
      ["M", "SUBJECTS HANDLED"],
      ["N", "JUSTIFICATION (Applicable if it violates the rule.)"],
    ];
    for (const [col, label] of spanned) {
      ws.mergeCells(`${col}${top}:${col}${bottom}`);
      ws.getCell(`${col}${top}`).value = label;
    }
    ws.mergeCells(`E${top}:G${top}`);
    ws.getCell(`E${top}`).value = "DAY";
    ws.mergeCells(`H${top}:J${top}`);
    ws.getCell(`H${top}`).value = "EVENING";
    for (const rowNo of [top, bottom]) {
      const row = ws.getRow(rowNo);
      row.height = rowNo === top ? 30 : 30;
      for (let col = 1; col <= COLUMN_WIDTHS.length; col += 1) {
        const c = row.getCell(col);
        c.font = { bold: true, size: 9 };
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        c.border = box;
      }
    }
    ws.getCell(`D${top}`).font = { size: 8 };
    // PREPS red, UNITS/WEEK blue, HOURS/WEEK orange — as on the college's sheet.
    for (const cols of [["E", "F", "G"], ["H", "I", "J"]]) {
      TEACHING_LOAD_SUBHEADS.forEach((h, i) => {
        const c = ws.getCell(`${cols[i]}${bottom}`);
        c.value = h.label;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${h.color.slice(1)}` } };
      });
    }
    r = bottom + 1;

    if (g.rows.length === 0) {
      ws.mergeCells(`A${r}:${LAST_COL}${r}`);
      ws.getCell(`A${r}`).value = "No plotted teaching load for this department in the selected term.";
      ws.getCell(`A${r}`).alignment = { horizontal: "center" };
      r += 1;
    }
    g.rows.forEach((row, i) => {
      const xr = ws.getRow(r);
      teachingLoadExcelRow(row, i).forEach((v, k) => {
        const c = xr.getCell(k + 1);
        c.value = v;
        c.border = box;
        c.font = { size: 10, bold: k === 10 || k === 11 };
        const centered = k === 0 || (k >= 4 && k <= 11);
        c.alignment = { horizontal: centered ? "center" : "left", vertical: "top", wrapText: true };
      });
      r += 1;
    });
    r += 1;
  }

  const s = args.signatories;
  if (s) {
    const label = (text: string) => {
      ws.getCell(`A${r}`).value = text;
      ws.getCell(`A${r}`).font = { size: 10 };
      r += 2;
    };
    const signer = async (col: string, name: string, title: string, imageUrl?: string | null) => {
      const img = await loadImageBase64(imageUrl ?? null);
      if (img) {
        const id = wb.addImage({ base64: img.base64, extension: img.extension });
        const height = 38;
        const colIndex = col.charCodeAt(0) - 65;
        ws.addImage(id, {
          tl: { col: colIndex + 0.2, row: r - 2.4 },
          ext: { width: Math.round(height * img.ratio), height },
        });
      }
      ws.getCell(`${col}${r}`).value = name.toUpperCase();
      ws.getCell(`${col}${r}`).font = { bold: true, size: 10, underline: true };
      ws.getCell(`${col}${r + 1}`).value = title;
      ws.getCell(`${col}${r + 1}`).font = { size: 9 };
    };
    label("Prepared by:");
    r += 1;
    const prepCols = ["B", "E", "I", "M"];
    for (let i = 0; i < s.preparedBy.length; i += 1) {
      const p = s.preparedBy[i]!;
      if (i > 0 && i % prepCols.length === 0) r += 4;
      await signer(prepCols[i % prepCols.length], p.name, p.title, p.imageUrl);
    }
    r += 3;
    for (const [text, who] of [
      ["Noted by:", s.notedBy],
      ["Recommending Approval:", s.recommendingApproval],
      ["Approved by:", s.approvedBy],
    ] as const) {
      ws.getCell(`D${r}`).value = text;
      ws.getCell(`D${r}`).font = { size: 10 };
      ws.getCell(`D${r}`).alignment = { horizontal: "right" };
      r += 3;
      await signer("E", who.name, who.title, who.imageUrl);
      r += 3;
    }
  }

  // Rankings / certifications strip at the foot, as on the college's sheet.
  const footer = await loadImageBase64(args.footerBannerUrl === undefined ? DEFAULT_REPORT_FOOTER_BANNER : args.footerBannerUrl);
  if (footer) {
    r += 1;
    const id = wb.addImage({ base64: footer.base64, extension: footer.extension });
    const height = 40;
    ws.addImage(id, { tl: { col: 2.5, row: r - 1 }, ext: { width: Math.round(height * footer.ratio), height } });
    r += 3;
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/** Fetches a same-origin image for embedding; null when it cannot be read. */
async function loadImageBase64(
  url: string | null | undefined,
): Promise<{ base64: string; extension: "png" | "jpeg"; ratio: number } | null> {
  const src = (url ?? "").trim();
  if (!src || typeof fetch === "undefined") return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
    const ratio = await new Promise<number>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalHeight ? img.naturalWidth / img.naturalHeight : 5);
      img.onerror = () => resolve(5);
      img.src = dataUrl;
    });
    const extension = /jpe?g/i.test(blob.type) ? "jpeg" : "png";
    return { base64: dataUrl, extension, ratio };
  } catch {
    return null;
  }
}

export async function downloadTeachingLoadSummaryWorkbook(
  args: Parameters<typeof buildTeachingLoadSummaryWorkbook>[0] & { fileName: string },
): Promise<void> {
  const blob = await buildTeachingLoadSummaryWorkbook(args);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = args.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
