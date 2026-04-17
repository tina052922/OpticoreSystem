"use client";

import { useMemo } from "react";
import {
  BSIT_EVALUATOR_TIME_SLOTS,
  BSIT_EVALUATOR_WEEKDAYS,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import { scheduleSlotDurationForSubject } from "@/lib/chairman/prospectus-registry";
import { isGecVacantScheduleEntry } from "@/lib/gec/gec-vacant";
import { formatUserInstructorLabel } from "@/lib/evaluator/instructor-employee-id";
import type { FacultyProfile, Room, ScheduleEntry, Subject, User } from "@/types/db";

function hhmm(t: string): string {
  return t.trim().length > 5 ? t.trim().slice(0, 5) : t.trim();
}

function formatTimeRangeFromSlots(effectiveStart: number, dur: number): string {
  const slots = BSIT_EVALUATOR_TIME_SLOTS;
  const first = slots[effectiveStart];
  const last = slots[effectiveStart + dur - 1];
  if (!first || !last) return "—";
  const start = first.label.split(" - ")[0] ?? "";
  const end = last.label.split(" - ").pop() ?? "";
  return `${start} – ${end}`;
}

function startSlotIndexFromEntry(e: ScheduleEntry): number {
  const h = hhmm(e.startTime);
  return BSIT_EVALUATOR_TIME_SLOTS.findIndex((t) => t.startTime === h);
}

function durationForEntry(
  e: ScheduleEntry,
  programCode: string,
  subjectById: Map<string, Subject>,
): number {
  return scheduleSlotDurationForSubject(programCode, subjectById.get(e.subjectId));
}

type Props = {
  /** Same as section’s `Program.code` — selects which static prospectus defines lab/lec slot spans. */
  programCode: string;
  entries: ScheduleEntry[];
  academicPeriodId: string;
  sectionId: string;
  sectionName: string;
  subjectById: Map<string, Subject>;
  roomById: Map<string, Room>;
  userById: Map<string, User>;
  facultyProfileByUserId: Map<string, Pick<FacultyProfile, "fullName">>;
};

/**
 * INS-style weekly grid (Mon–Fri, 1-hour slots) for one section — mirrors Chairman `BsitWeekPreview`
 * but reads live `ScheduleEntry` rows (including locked majors + filled GEC).
 */
export function GecSectionSchedulePreview({
  programCode,
  entries,
  academicPeriodId,
  sectionId,
  sectionName,
  subjectById,
  roomById,
  userById,
  facultyProfileByUserId,
}: Props) {
  const slots = BSIT_EVALUATOR_TIME_SLOTS;
  const list = useMemo(
    () => entries.filter((e) => e.academicPeriodId === academicPeriodId && e.sectionId === sectionId),
    [entries, academicPeriodId, sectionId],
  );

  const skipSlot = useMemo(() => {
    const m = new Set<string>();
    for (const e of list) {
      const d = durationForEntry(e, programCode, subjectById);
      const start = startSlotIndexFromEntry(e);
      if (start < 0) continue;
      const maxS = slots.length - d;
      const eff = Math.min(start, Math.max(0, maxS));
      const day = e.day as BsitEvaluatorWeekday;
      if (!BSIT_EVALUATOR_WEEKDAYS.includes(day)) continue;
      for (let k = 1; k < d; k++) {
        m.add(`${day}-${eff + k}`);
      }
    }
    return m;
  }, [list, programCode, subjectById]);

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden border border-black/10 p-4">
      <div className="text-[15px] font-semibold text-black mb-1">Schedule preview (INS weekly grid)</div>
      <p className="text-[12px] text-black/55 mb-2">
        Section <strong>{sectionName}</strong> · Monday–Friday · 7:00 AM–5:00 PM · updates from the plotting grid above
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr>
              <th className="border border-black bg-white px-1 py-1 w-[72px] font-bold text-black">TIME</th>
              {BSIT_EVALUATOR_WEEKDAYS.map((day) => (
                <th key={day} className="border border-black bg-white px-1 py-1 min-w-[100px] font-bold text-black">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, slotIdx) => (
              <tr key={slot.label}>
                <td className="border border-black px-1 py-1.5 text-center whitespace-nowrap text-black">{slot.label}</td>
                {BSIT_EVALUATOR_WEEKDAYS.map((day) => {
                  if (skipSlot.has(`${day}-${slotIdx}`)) return null;
                  const atHere = list.filter((e) => {
                    if (e.day !== day) return false;
                    const d = durationForEntry(e, programCode, subjectById);
                    const start = startSlotIndexFromEntry(e);
                    if (start < 0) return false;
                    const maxS = slots.length - d;
                    const eff = Math.min(start, Math.max(0, maxS));
                    return eff === slotIdx;
                  });
                  if (atHere.length === 0) {
                    return (
                      <td key={day} className="border border-black px-1 py-1 align-top text-black">
                        <span className="text-black/25">—</span>
                      </td>
                    );
                  }
                  const rowspan = Math.max(
                    ...atHere.map((e) => {
                      const d = durationForEntry(e, programCode, subjectById);
                      const start = startSlotIndexFromEntry(e);
                      const maxS = slots.length - d;
                      const eff = Math.min(start, Math.max(0, maxS));
                      return eff === slotIdx ? d : 1;
                    }),
                  );
                  return (
                    <td key={day} rowSpan={rowspan} className="border border-black px-1 py-1 align-top text-black">
                      <ul className="space-y-1">
                        {atHere.map((e) => {
                          const sub = subjectById.get(e.subjectId);
                          const room = roomById.get(e.roomId);
                          const inst = userById.get(e.instructorId);
                          const d = durationForEntry(e, programCode, subjectById);
                          const start = startSlotIndexFromEntry(e);
                          const maxS = slots.length - d;
                          const eff = Math.min(start, Math.max(0, maxS));
                          const vacant = isGecVacantScheduleEntry(e, subjectById);
                          return (
                            <li
                              key={e.id}
                              className={`leading-tight rounded-sm px-0.5 -mx-0.5 ${
                                vacant ? "bg-emerald-100/95 ring-1 ring-emerald-400/80" : ""
                              }`}
                            >
                              <span className="font-semibold">{sub?.code ?? "—"}</span>
                              <span className="block text-[9px] text-black/60 font-medium">
                                {formatTimeRangeFromSlots(eff, d)}
                              </span>
                              <span className="block text-[9px] text-black/60">{room?.code ?? "TBA"}</span>
                              <span className="block text-[9px] text-black/60">
                                {formatUserInstructorLabel(inst, facultyProfileByUserId.get(e.instructorId))}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
