import type { InsFacultyCell } from "@/lib/ins/build-ins-faculty-view";
import type { InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";
import type { InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import type {
  PDFScheduleGrid,
  PDFScheduleCell,
  PDFSignatureSlot,
  InsDay as PDFInsDay,
} from "@/components/pdf/types/insTypes";
import { INS_TIME_SLOTS } from "@/components/pdf/types/insTypes";
import { NIGHT_FULL_DAY_SLOTS, NIGHT_WEEKDAY_SLOTS, type ProgramMode } from "@/lib/scheduling/program-mode";

type InsSectionCell = {
  time: string;
  startTime?: string;
  endTime?: string;
  course: string;
  instructor: string;
  room: string;
};

type InsRoomCell = {
  time: string;
  startTime?: string;
  endTime?: string;
  course: string;
  instructor: string;
  yearSec: string;
  room: string;
};

function parseTimeMinutes(raw: string): number {
  const [h, m] = raw.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function slotStartMinutes(slotLabel: string): number {
  const start = slotLabel.split("-")[0]!.trim();
  const [h, m] = start.split(":").map(Number);
  let hour = h ?? 0;
  if (hour < 7) hour += 12;
  return hour * 60 + (m ?? 0);
}

function entryStartMinutes(entry: { startTime?: string; time?: string }): number {
  if (entry.startTime) return parseTimeMinutes(entry.startTime);
  const start = (entry.time ?? "").split("-")[0]!.trim();
  if (!start) return 0;
  const [h, m] = start.split(":").map(Number);
  let hour = h ?? 0;
  if (hour < 7) hour += 12;
  return hour * 60 + (m ?? 0);
}

/** Minutes-from-midnight of an entry's end, from `endTime` or the `"7:00-10:00"` display label. */
function entryEndMinutes(entry: { endTime?: string; time?: string }): number | null {
  if (entry.endTime) return parseTimeMinutes(entry.endTime);
  const end = (entry.time ?? "").split("-")[1]?.trim();
  if (!end) return null;
  const [h, m] = end.split(":").map(Number);
  let hour = h ?? 0;
  if (hour < 7) hour += 12;
  return hour * 60 + (m ?? 0);
}

function findCellsForSlotAtHour<T extends { startTime?: string; endTime?: string; time?: string }>(
  entries: T[],
  startHour: number,
): T[] {
  const slotStart = startHour * 60;
  const slotEnd = slotStart + 60;
  return entries.filter((e) => {
    const eStart = entryStartMinutes(e);
    let eEnd: number;
    if (e.endTime) {
      eEnd = parseTimeMinutes(e.endTime);
    } else {
      const parts = (e.time ?? "").split("-");
      const endPart = parts[1]?.trim() ?? "";
      if (!endPart) return false;
      const [h2, m2] = endPart.split(":").map(Number);
      let hour2 = h2 ?? 0;
      if (hour2 < 7) hour2 += 12;
      eEnd = hour2 * 60 + (m2 ?? 0);
    }
    return eStart < slotEnd && eEnd > slotStart;
  });
}

function findCellsForSlot<T extends { startTime?: string; endTime?: string; time?: string }>(
  entries: T[],
  slotIdx: number,
): T[] {
  const slotStart = slotStartMinutes(INS_TIME_SLOTS[slotIdx]);
  return findCellsForSlotAtHour(entries, Math.floor(slotStart / 60));
}

function isStartOfHour<T extends { startTime?: string; time?: string }>(entry: T, startHour: number): boolean {
  const startMin = entryStartMinutes(entry);
  const slotStart = startHour * 60;
  return startMin >= slotStart && startMin < slotStart + 60;
}

const PDF_DAYS: PDFInsDay[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

function emptyNightPdfGrid(): PDFScheduleGrid {
  const grid = {} as PDFScheduleGrid;
  for (const day of PDF_DAYS) {
    const n = day === "Saturday" || day === "Sunday" ? NIGHT_FULL_DAY_SLOTS.length : NIGHT_WEEKDAY_SLOTS.length;
    grid[day] = Array.from({ length: n }, () => null);
  }
  return grid;
}

function facultyCellToPdf(first: InsFacultyCell): PDFScheduleCell {
  return { line1: first.course, line2: first.yearSec, line3: first.room };
}

function sectionCellToPdf(first: InsSectionCell): PDFScheduleCell {
  return { line1: first.course, line2: first.instructor, line3: first.room };
}

function roomCellToPdf(first: InsRoomCell): PDFScheduleCell {
  return { line1: first.course, line2: first.instructor, line3: first.yearSec, line4: first.room };
}

function nightPdfGridFromDays<T extends { startTime?: string; time?: string }>(
  schedule: Record<InsDay, T[]>,
  toCell: (first: T) => PDFScheduleCell,
): PDFScheduleGrid {
  const grid = emptyNightPdfGrid();
  for (const day of PDF_DAYS) {
    const entries = schedule[day] ?? [];
    const hours =
      day === "Saturday" || day === "Sunday"
        ? NIGHT_FULL_DAY_SLOTS.map((s) => s.startHour)
        : NIGHT_WEEKDAY_SLOTS.map((s) => s.startHour);
    grid[day] = placeDayEntries(entries, hours.map((h) => h * 60), toCell);
  }
  return grid;
}

/** Build a Day Program PDF grid, one cell per hour row. */
/**
 * The hour row a class writes its text into: the one it occupies most of.
 *
 * Not the hour it starts in. A 8:30–10:00 class starts in the 8:00 row but owns only the bottom
 * half of it — half a row cannot hold four lines of text, so the text spilled up across the 8:30
 * rule and over the class above. The 9:00 row is entirely its own, so that is where it belongs.
 */
function textRowForEntry(
  startMin: number,
  endMin: number,
  slotStarts: number[],
): number {
  let best = -1;
  let bestOverlap = 0;
  for (let i = 0; i < slotStarts.length; i++) {
    const slotStart = slotStarts[i]!;
    const overlap = Math.min(endMin, slotStart + 60) - Math.max(startMin, slotStart);
    // Strictly greater keeps the earliest row on a tie, so a class never drifts later than it must.
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = i;
    }
  }
  return best;
}

type PlacedEntry<T> = { entry: T; startMin: number; endMin: number; textRow: number };

/**
 * Lay a day's classes onto the printed hour rows.
 *
 * Each class contributes its text to one row and, to the rows its edges fall inside, the marks that
 * say where it really begins and ends. A row an entire class runs through gets neither, and its
 * bottom rule is dropped so the box reads as one class rather than as stacked cells.
 */
function placeDayEntries<T extends { startTime?: string; endTime?: string; time?: string }>(
  entries: T[],
  slotStarts: number[],
  toCell: (first: T) => PDFScheduleCell,
): (PDFScheduleCell | null)[] {
  const placed: PlacedEntry<T>[] = [];
  for (const entry of entries) {
    const startMin = entryStartMinutes(entry);
    const endMin = entryEndMinutes(entry);
    if (endMin == null || endMin <= startMin) continue;
    placed.push({ entry, startMin, endMin, textRow: textRowForEntry(startMin, endMin, slotStarts) });
  }
  placed.sort((a, b) => a.startMin - b.startMin);

  return slotStarts.map((slotStart, i) => {
    const slotEnd = slotStart + 60;
    const touching = placed.filter((p) => p.startMin < slotEnd && p.endMin > slotStart);
    if (touching.length === 0) return null;

    // Earliest wins when two classes want the same row; the grid has only one cell to give.
    const owner = touching.find((p) => p.textRow === i);
    const cell: PDFScheduleCell = owner ? toCell(owner.entry) : { line1: "" };

    // Where a class begins or ends inside this hour, as a fraction of it.
    const beginsHere = touching.find((p) => p.startMin > slotStart && p.startMin < slotEnd);
    const endsHere = touching.find((p) => p.endMin > slotStart && p.endMin < slotEnd);
    if (beginsHere) cell.startFill = (beginsHere.startMin - slotStart) / 60;
    if (endsHere) cell.partialFill = (endsHere.endMin - slotStart) / 60;

    // A class crossing this row's bottom edge is not ruled off on it.
    if (touching.some((p) => p.endMin > slotEnd)) cell.openBottom = true;

    return cell;
  });
}

function dayPdfGridFromDays<T extends { startTime?: string; endTime?: string; time?: string }>(
  schedule: Record<InsDay, T[]>,
  toCell: (first: T) => PDFScheduleCell,
): PDFScheduleGrid {
  const grid = {} as PDFScheduleGrid;
  for (const day of PDF_DAYS) {
    grid[day] = placeDayEntries(
      schedule[day] ?? [],
      INS_TIME_SLOTS.map((label) => slotStartMinutes(label)),
      toCell,
    );
  }
  return grid;
}

export function facultyScheduleToPdfGrid(
  schedule: Record<InsDay, InsFacultyCell[]>,
  programMode: ProgramMode = "day",
): PDFScheduleGrid {
  if (programMode === "night") return nightPdfGridFromDays(schedule, facultyCellToPdf);
  return dayPdfGridFromDays(schedule, facultyCellToPdf);
}

export function sectionScheduleToPdfGrid(
  schedule: Record<InsDay, InsSectionCell[]>,
  programMode: ProgramMode = "day",
): PDFScheduleGrid {
  if (programMode === "night") return nightPdfGridFromDays(schedule, sectionCellToPdf);
  return dayPdfGridFromDays(schedule, sectionCellToPdf);
}

export function roomScheduleToPdfGrid(
  schedule: Record<InsDay, InsRoomCell[]>,
  programMode: ProgramMode = "day",
): PDFScheduleGrid {
  if (programMode === "night") return nightPdfGridFromDays(schedule, roomCellToPdf);
  return dayPdfGridFromDays(schedule, roomCellToPdf);
}

/**
 * Resolves the three printed INS lines from the six-slot source strip.
 *
 * Official paper roles (fixed titles on the form):
 *   Prepared by:                          Program Coordinator/Chair
 *     → Program Chairman ACCOUNT name (`review.accountName`, from
 *       `User.name` for the resolved chairman) + their profile signature
 *       image uploaded on /chairman/profile. System Configuration display
 *       overrides for the 'review' slot are deliberately NOT used here —
 *       the printed form must reflect the chairman themselves, not a
 *       different name typed into the College Admin's editor.
 *       Falls back to the `prepared` slot (College Admin name + e-sig from
 *       /admin/college/system-configuration) when no chairman is resolved.
 *   Reviewed, Certified True and Correct: Director/Dean
 *     → DOI / VPAA System Configuration name + e-sig (`approved`); dean only if DOI blank
 *   Approved:                             Campus Director
 *     → campus (`campus`) from DOI System Configuration (wins over college placeholders)
 *
 * Shared by the PDF adapter and the on-screen signature strip so they never disagree.
 */
export function resolveInsPrintedSigners(slots: InsSignatureSlot[]) {
  const byKey = (...keys: string[]) => {
    for (const k of keys) {
      const hit = slots.find((s) => s.key === k);
      if (hit) return hit;
    }
    return undefined;
  };

  // buildInsSignatureSlots uses "—" for an unresolved signer.
  const hasName = (s: InsSignatureSlot | undefined) => {
    const n = s?.signerName?.trim();
    return Boolean(n) && n !== "—";
  };
  const firstUrl = (...urls: Array<string | null | undefined>) => {
    for (const u of urls) {
      const t = u?.trim();
      if (t) return t;
    }
    return null;
  };

  const dean = byKey("dean");
  const doi = byKey("approved");
  const campus = byKey("campus");
  const review = byKey("review");
  const prepared = byKey("prepared");

  // Reviewed / Director/Dean: DOI System Configuration name + e-sig win over
  // college "dean" placeholders (e.g. "MS. DEAN").
  let reviewed: InsSignatureSlot | undefined;
  if (hasName(doi) || hasName(dean) || Boolean(doi?.imageUrl?.trim())) {
    reviewed = {
      key: "reviewed",
      lineTitle: "Reviewed, Certified True and Correct:",
      lineSubtitle: "Director/Dean",
      signerName: hasName(doi)
        ? doi!.signerName
        : hasName(dean)
          ? dean!.signerName
          : "",
      imageUrl: firstUrl(doi?.imageUrl, dean?.imageUrl),
    };
  } else {
    reviewed = dean ?? doi;
  }

  // Approved / Campus Director — never substitute DOI name or image here.
  let approved: InsSignatureSlot | undefined;
  if (hasName(campus) || Boolean(campus?.imageUrl?.trim())) {
    approved = {
      ...campus!,
      imageUrl: firstUrl(campus?.imageUrl),
    };
  } else {
    approved = campus;
  }

  /**
   * Prepared: Program Chairman's account name (source of truth), fallback to
   * the College Admin System Configuration slot.
   *
   * The printed name comes from the chairman's own `User.name` — carried on
   * the `review` slot as `accountName` — NOT from anything typed into the
   * "Program Chairman" row of the College Admin's INS form signatories editor.
   * That protects the printed form from a College Admin overriding a
   * chairman's name with arbitrary display text.
   *
   * The chairman's signature image (`review.imageUrl`) still travels with the
   * slot; we never borrow the College Admin's landscape image for this line.
   * If the chairman is unresolved for this college/program (no `accountName`
   * on the review slot) we fall back to the `prepared` slot: name + e-sig
   * configured by the College Admin in System Configuration.
   */
  const chairmanAccountName = review?.accountName?.trim();
  const preparedOut: InsSignatureSlot | undefined = chairmanAccountName
    ? {
        ...review!,
        signerName: chairmanAccountName,
        imageUrl: firstUrl(review?.imageUrl),
      }
    : prepared;

  return {
    prepared: preparedOut,
    review: reviewed,
    approved,
  };
}

/**
 * Fallback printed names when System Configuration / resolved users leave a line blank.
 * Matches the paper role under each signature line.
 */
export const INS_PRINTED_SIGNER_NAME_DEFAULTS = {
  prepared: "Program Coordinator/Chair",
  reviewed: "Director/Dean",
  approved: "Campus Director",
} as const;

function printedSignerName(
  slot: InsSignatureSlot | undefined,
  fallback: string,
): string {
  const n = slot?.signerName?.trim();
  if (n && n !== "—") return n;
  return fallback;
}

/**
 * The three signature lines the official INS form actually prints, in paper
 * order. Names come from System Configuration (INS form signatories) via
 * `mergeInsSignerDisplay` on the source strip, then role defaults when blank.
 *
 * Single source of truth for the on-screen signature strip AND the PDF rail.
 */
export function insPrintedSignatureLines(
  slots: InsSignatureSlot[] | null | undefined,
): InsSignatureSlot[] {
  const { prepared, review, approved } = resolveInsPrintedSigners(slots ?? []);
  return [
    {
      key: "prepared",
      lineTitle: "Prepared by:",
      lineSubtitle: "Program Coordinator/Chair",
      signerName: printedSignerName(
        prepared,
        INS_PRINTED_SIGNER_NAME_DEFAULTS.prepared,
      ),
      imageUrl: prepared?.imageUrl ?? null,
    },
    {
      key: "reviewed",
      lineTitle: "Reviewed, Certified True and Correct:",
      lineSubtitle: "Director/Dean",
      signerName: printedSignerName(
        review,
        INS_PRINTED_SIGNER_NAME_DEFAULTS.reviewed,
      ),
      imageUrl: review?.imageUrl ?? null,
    },
    {
      key: "approved",
      lineTitle: "Approved:",
      lineSubtitle: "Campus Director",
      signerName: printedSignerName(
        approved,
        INS_PRINTED_SIGNER_NAME_DEFAULTS.approved,
      ),
      imageUrl: approved?.imageUrl ?? null,
    },
  ];
}

export function signatureSlotsToPdf(
  slots: InsSignatureSlot[] | null | undefined,
): PDFSignatureSlot[] {
  // Always emit the three paper lines (with System Config names or defaults)
  // so Forms 5A/5B/5C never render empty signer labels.
  return insPrintedSignatureLines(slots ?? []);
}
