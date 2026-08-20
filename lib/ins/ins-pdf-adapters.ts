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

export function signatureSlotsToPdf(
  slots: InsSignatureSlot[] | null | undefined,
): PDFSignatureSlot[] | undefined {
  if (!slots || slots.length === 0) return undefined;
  const prepared = slots.find((s) => s.key === "prepared");
  const review = slots.find((s) => s.key === "review" || s.key === "reviewed" || s.key === "dean");
  const approved = slots.find((s) => s.key === "approved" || s.key === "campus");
  const result: PDFSignatureSlot[] = [
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
  return result;
}
