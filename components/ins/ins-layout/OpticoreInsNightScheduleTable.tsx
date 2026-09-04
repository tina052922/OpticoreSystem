"use client";

import type { ReactNode } from "react";
import {
  NIGHT_FULL_DAY_SLOTS,
  NIGHT_INS_WEEKDAY_SLOT_LABELS,
  NIGHT_INS_WEEKEND_SLOT_LABELS,
  NIGHT_WEEKDAY_SLOTS,
} from "@/lib/scheduling/program-mode";
import type { InsTimedCell } from "@/lib/ins/ins-weekly-grid-span";
import { insParseCellTimeMinutes } from "@/lib/ins/ins-weekly-grid-span";

const border = "border border-neutral-900";
const WEEKEND_DAYS = ["Saturday", "Sunday"] as const;
const WEEKDAY_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

type NightDay = (typeof WEEKEND_DAYS)[number] | (typeof WEEKDAY_DAYS)[number];

function slotOverlaps(
  cell: InsTimedCell,
  slotStartHour: number,
): boolean {
  const mins = insParseCellTimeMinutes(cell);
  if (!mins) return false;
  const ss = slotStartHour * 60;
  const se = ss + 60;
  return mins.startMin < se && mins.endMin > ss;
}

function isStartSlot(cell: InsTimedCell, slotStartHour: number): boolean {
  const mins = insParseCellTimeMinutes(cell);
  if (!mins) return false;
  return mins.startMin >= slotStartHour * 60 && mins.startMin < slotStartHour * 60 + 60;
}

function rowSpanFor(cell: InsTimedCell, slotStartHour: number, maxHour: number): number {
  const mins = insParseCellTimeMinutes(cell);
  if (!mins) return 1;
  const endHour = Math.min(maxHour, Math.ceil(mins.endMin / 60));
  return Math.max(1, endHour - slotStartHour);
}

type Props = {
  cellsByDay: Record<string, InsTimedCell[]>;
  renderCell: (items: InsTimedCell[], day: NightDay) => ReactNode;
  /** Occupies the L-shape under the weekday grid (to the right of weekend afternoon). */
  summary?: ReactNode;
  /** Form 5B paper: three signers sit to the right of Friday. */
  rightRail?: ReactNode;
};

/**
 * Official Night Program INS grid: Sat/Sun 7:00 AM–10:00 PM beside Mon–Fri 4:00 PM–10:00 PM.
 * Weekday 4:00–5:00 aligns with weekend 7:00–8:00 (paper form, not chronological).
 */
export function OpticoreInsNightScheduleTable({ cellsByDay, renderCell, summary, rightRail }: Props) {
  const weekendSkip = new Set<string>();
  const weekdaySkip = new Set<string>();

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <div className={`flex min-w-0 items-stretch ${rightRail ? "gap-0" : ""}`}>
      <table className={`w-full min-w-0 table-fixed border-collapse ${border} text-[10px] print:text-[6.5pt]`}>
        <thead>
          <tr className="bg-neutral-50">
            <th className={`${border} px-1 py-1 font-bold uppercase`}>TIME</th>
            {WEEKEND_DAYS.map((d) => (
              <th key={d} className={`${border} px-1 py-1 font-bold`}>
                {d}
              </th>
            ))}
            <th className={`${border} px-1 py-1 font-bold uppercase`}>TIME</th>
            {WEEKDAY_DAYS.map((d) => (
              <th key={d} className={`${border} px-1 py-1 font-bold`}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NIGHT_FULL_DAY_SLOTS.map((wSlot, wIdx) => {
            const weekdaySlot = wIdx < NIGHT_WEEKDAY_SLOTS.length ? NIGHT_WEEKDAY_SLOTS[wIdx] : null;
            const showSummaryStart = wIdx === NIGHT_WEEKDAY_SLOTS.length;
            const showWeekdayCells = weekdaySlot != null;

            return (
              <tr key={wSlot.label} style={{ height: "var(--ins-row-h)" }}>
                <td className={`${border} px-1 py-0.5 whitespace-nowrap font-semibold align-middle`}>
                  {NIGHT_INS_WEEKEND_SLOT_LABELS[wIdx] ?? wSlot.label.replace(" - ", "-")}
                </td>
                {WEEKEND_DAYS.map((day) => {
                  const key = `${day}-${wIdx}`;
                  if (weekendSkip.has(key)) return null;
                  const items = (cellsByDay[day] ?? []).filter((c) => slotOverlaps(c, wSlot.startHour));
                  const starters = items.filter((c) => isStartSlot(c, wSlot.startHour));
                  if (starters.length === 0) {
                    return (
                      <td key={day} className={`${border} p-0 align-middle`}>
                        <div className="min-h-[var(--ins-row-h)]" />
                      </td>
                    );
                  }
                  const span = Math.max(...starters.map((c) => rowSpanFor(c, wSlot.startHour, 22)));
                  for (let k = 1; k < span; k++) weekendSkip.add(`${day}-${wIdx + k}`);
                  return (
                    <td key={day} rowSpan={span} className={`${border} p-0.5 align-middle text-center leading-tight overflow-hidden`}>
                      <div className="flex h-full max-h-full min-h-[var(--ins-row-h)] flex-col items-center justify-center overflow-hidden px-0.5">
                        {renderCell(starters, day)}
                      </div>
                    </td>
                  );
                })}

                {showWeekdayCells && weekdaySlot ? (
                  <>
                    <td className={`${border} px-1 py-0.5 whitespace-nowrap font-semibold align-middle`}>
                      {NIGHT_INS_WEEKDAY_SLOT_LABELS[wIdx] ?? weekdaySlot.label.replace(" - ", "-")}
                    </td>
                    {WEEKDAY_DAYS.map((day) => {
                      const key = `${day}-${wIdx}`;
                      if (weekdaySkip.has(key)) return null;
                      const items = (cellsByDay[day] ?? []).filter((c) => slotOverlaps(c, weekdaySlot.startHour));
                      const starters = items.filter((c) => isStartSlot(c, weekdaySlot.startHour));
                      if (starters.length === 0) {
                        return (
                          <td key={day} className={`${border} p-0 align-middle`}>
                            <div className="min-h-[var(--ins-row-h)]" />
                          </td>
                        );
                      }
                      const span = Math.max(
                        ...starters.map((c) => rowSpanFor(c, weekdaySlot.startHour, 22)),
                      );
                      for (let k = 1; k < span; k++) weekdaySkip.add(`${day}-${wIdx + k}`);
                      return (
                        <td key={day} rowSpan={span} className={`${border} p-0.5 align-middle text-center leading-tight overflow-hidden`}>
                          <div className="flex h-full max-h-full min-h-[var(--ins-row-h)] flex-col items-center justify-center overflow-hidden px-0.5">
                            {renderCell(starters, day)}
                          </div>
                        </td>
                      );
                    })}
                  </>
                ) : showSummaryStart ? (
                  <td
                    className={`${border} p-1 align-top`}
                    colSpan={6}
                    rowSpan={NIGHT_FULL_DAY_SLOTS.length - NIGHT_WEEKDAY_SLOTS.length}
                  >
                    {summary ?? <div className="min-h-[4rem]" />}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rightRail}
      </div>
    </div>
  );
}
