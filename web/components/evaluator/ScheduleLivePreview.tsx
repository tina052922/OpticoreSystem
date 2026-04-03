"use client";

import { TIME_SLOT_OPTIONS, WEEKDAYS } from "@/lib/scheduling/constants";
import type { ScheduleBlock } from "@/lib/scheduling/types";

type Props = {
  title: string;
  entries: ScheduleBlock[];
  subjectCodeById: Map<string, string>;
  roomCodeById: Map<string, string>;
  instructorNameById: Map<string, string>;
  sectionNameById: Map<string, string>;
};

export function ScheduleLivePreview({
  title,
  entries,
  subjectCodeById,
  roomCodeById,
  instructorNameById,
  sectionNameById,
}: Props) {
  const cell = (day: string, start: string, end: string) => {
    const hit = entries.find((e) => e.day === day && e.startTime === start && e.endTime === end);
    if (!hit) return null;
    return (
      <div className="text-[9px] leading-tight text-left p-1 bg-[rgba(255,153,10,0.15)] rounded border border-black/10">
        <div className="font-bold">{subjectCodeById.get(hit.subjectId) ?? "—"}</div>
        <div className="text-black/70">{sectionNameById.get(hit.sectionId) ?? ""}</div>
        <div className="text-black/60">{roomCodeById.get(hit.roomId) ?? ""}</div>
        <div className="text-black/60 truncate">{instructorNameById.get(hit.instructorId) ?? ""}</div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-black/15 rounded-lg overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b border-black/10 text-[12px] font-semibold bg-[#ff990a] text-white">{title}</div>
      <div className="overflow-auto max-h-[520px]">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr>
              <th className="border border-black/15 px-1 py-1 text-left text-[10px] bg-black/5">
                Time slot
              </th>
              {WEEKDAYS.map((d) => (
                <th key={d} className="border border-black/15 px-1 py-1 text-center text-[10px] bg-black/5">
                  {d.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOT_OPTIONS.map((slot) => (
              <tr key={slot.label}>
                <td className="border border-black/15 px-1 py-1 text-[9px] whitespace-nowrap align-top">
                  {slot.label}
                </td>
                {WEEKDAYS.map((d) => (
                  <td key={d} className="border border-black/15 px-0 py-0 align-top min-w-[88px]">
                    {cell(d, slot.startTime, slot.endTime)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
