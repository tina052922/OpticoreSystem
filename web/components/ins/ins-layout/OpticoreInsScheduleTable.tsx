import type { ReactNode } from "react";
import { INS_DAYS, INS_TIME_SLOTS } from "./opticore-ins-constants";

const vLabel = {
  writingMode: "vertical-rl" as const,
  transform: "rotate(180deg)",
};

type Props = {
  /** Render cell content for each time row and day column */
  renderCell: (time: string, day: (typeof INS_DAYS)[number]) => ReactNode;
};

/**
 * Weekly grid + Opticore-style vertical signature columns (Prepared / Reviewed / Approved).
 */
export function OpticoreInsScheduleTableWithSignatures({ renderCell }: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-0">
        <table className="flex-1 min-w-0 border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-400 px-1 py-2 text-[10px] font-semibold text-gray-900">TIME</th>
              {INS_DAYS.map((day) => (
                <th key={day} className="border border-gray-400 px-1 py-2 text-[10px] font-semibold text-gray-900">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INS_TIME_SLOTS.map((time) => (
              <tr key={time}>
                <td className="border border-gray-400 px-1 py-2 text-[10px] font-medium text-gray-900 whitespace-nowrap">
                  {time}
                </td>
                {INS_DAYS.map((day) => (
                  <td key={`${time}-${day}`} className="border border-gray-400 px-1 py-2 text-[10px] text-gray-900 align-top min-h-[52px]">
                    {renderCell(time, day)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="hidden md:flex shrink-0 gap-1">
          <div className="flex flex-col justify-around py-6 w-8 border border-gray-400 border-l-0 bg-gray-50/50">
            <div className="text-[9px] font-medium text-gray-800 whitespace-nowrap" style={vLabel}>
              Prepared by
            </div>
            <div className="text-[9px] font-medium text-gray-800 whitespace-nowrap" style={vLabel}>
              Reviewed, Certified True and Correct
            </div>
            <div className="text-[9px] font-medium text-gray-800 whitespace-nowrap" style={vLabel}>
              Approved
            </div>
          </div>
          <div className="flex flex-col justify-around py-6 w-8 border border-gray-400 border-l-0 bg-white">
            <div className="text-[9px] text-gray-700 whitespace-nowrap" style={vLabel}>
              Program Coordinator/Chair
            </div>
            <div className="text-[9px] text-gray-700 whitespace-nowrap" style={vLabel}>
              Director/Dean
            </div>
            <div className="text-[9px] text-gray-700 whitespace-nowrap" style={vLabel}>
              Campus Director
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
