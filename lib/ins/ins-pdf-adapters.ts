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

function findCellsForSlot<T extends { startTime?: string; endTime?: string; time?: string }>(
  entries: T[],
  slotIdx: number,
): T[] {
  const slotStart = slotStartMinutes(INS_TIME_SLOTS[slotIdx]);
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

export function facultyScheduleToPdfGrid(
  schedule: Record<InsDay, InsFacultyCell[]>,
): PDFScheduleGrid {
  const days: PDFInsDay[] = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  ];
  const grid = {} as PDFScheduleGrid;
  for (const day of days) {
    const entries = schedule[day] ?? [];
    const cells: (PDFScheduleCell | null)[] = [];
    for (let i = 0; i < INS_TIME_SLOTS.length; i++) {
      const matched = findCellsForSlot(entries, i);
      if (matched.length === 0) {
        cells.push(null);
      } else {
        const first = matched[0]!;
        cells.push({
          line1: first.course,
          line2: first.yearSec,
          line3: first.room,
        });
      }
    }
    grid[day] = cells;
  }
  return grid;
}

export function sectionScheduleToPdfGrid(
  schedule: Record<InsDay, InsSectionCell[]>,
): PDFScheduleGrid {
  const days: PDFInsDay[] = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  ];
  const grid = {} as PDFScheduleGrid;
  for (const day of days) {
    const entries = schedule[day] ?? [];
    const cells: (PDFScheduleCell | null)[] = [];
    for (let i = 0; i < INS_TIME_SLOTS.length; i++) {
      const matched = findCellsForSlot(entries, i);
      if (matched.length === 0) {
        cells.push(null);
      } else {
        const first = matched[0]!;
        cells.push({
          line1: first.course,
          line2: first.instructor,
          line3: first.room,
        });
      }
    }
    grid[day] = cells;
  }
  return grid;
}

export function roomScheduleToPdfGrid(
  schedule: Record<InsDay, InsRoomCell[]>,
): PDFScheduleGrid {
  const days: PDFInsDay[] = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  ];
  const grid = {} as PDFScheduleGrid;
  for (const day of days) {
    const entries = schedule[day] ?? [];
    const cells: (PDFScheduleCell | null)[] = [];
    for (let i = 0; i < INS_TIME_SLOTS.length; i++) {
      const matched = findCellsForSlot(entries, i);
      if (matched.length === 0) {
        cells.push(null);
      } else {
        const first = matched[0]!;
        cells.push({
          line1: first.course,
          line2: first.instructor,
          line3: first.yearSec,
          line4: first.room,
        });
      }
    }
    grid[day] = cells;
  }
  return grid;
}

/**
 * Resolves the three printed INS lines (Prepared by / Director-Dean / Campus
 * Director) from the six-slot source strip built by `buildInsSignatureSlots`.
 *
 * Key order matters: several slots can plausibly satisfy one printed line, and
 * `.find()` scans in array order — which previously let "approved" (DOI/VPAA,
 * index 0) win the Campus Director lookup, and "review" (Program Chairman) win
 * the Director/Dean lookup.
 *
 * Shared by the PDF adapter and the on-screen Form 5C footer so the two can
 * never disagree about who signs which line.
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
  // Take the first candidate carrying a real name, so an unpopulated slot never
  // blanks out a line that a later candidate could fill. Falls back to the
  // first existing slot so the placeholder still renders.
  const preferNamed = (...keys: string[]) =>
    keys.map((k) => slots.find((s) => s.key === k)).find(hasName) ??
    byKey(...keys);

  return {
    prepared: byKey("prepared"),
    // "Director/Dean": the "dean" slot is built with a null user, so it is only
    // populated via System Configuration overrides. Fall back to the Program
    // Chairman ("review") when no dean name is configured.
    review: preferNamed("dean", "review", "reviewed"),
    // "Campus Director" must resolve to the campus slot, not the DOI/VPAA one.
    approved: preferNamed("campus", "approved"),
  };
}

/**
 * The three signature lines the official INS form actually prints, in paper
 * order. The six-slot strip from `buildInsSignatureSlots` is an internal
 * routing model (DOI, dean, contract, …); this collapses it to what appears on
 * the form.
 *
 * Single source of truth for the on-screen signature strip AND the PDF rail —
 * previously the screen rendered all six raw slots while the PDF rendered
 * three, so Load Generator and the exported file disagreed.
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
      signerName: prepared?.signerName ?? "",
      imageUrl: prepared?.imageUrl ?? null,
    },
    {
      key: "reviewed",
      lineTitle: "Reviewed, Certified True and Correct:",
      lineSubtitle: "Director/Dean",
      signerName: review?.signerName ?? "",
      imageUrl: review?.imageUrl ?? null,
    },
    {
      key: "approved",
      lineTitle: "Approved:",
      lineSubtitle: "Campus Director",
      signerName: approved?.signerName ?? "",
      imageUrl: approved?.imageUrl ?? null,
    },
  ];
}

export function signatureSlotsToPdf(
  slots: InsSignatureSlot[] | null | undefined,
): PDFSignatureSlot[] | undefined {
  if (!slots || slots.length === 0) return undefined;
  return insPrintedSignatureLines(slots) satisfies PDFSignatureSlot[];
}
