"use client";

import type { FacultyLoadRow } from "@/lib/scheduling/facultyPolicies";

export type ChairmanPolicySnapshot = {
  rows: FacultyLoadRow[];
  hasAnyViolation: boolean;
  rateByInstructorId: Record<string, number | null>;
};

function remarkClass(r: "Underloaded" | "Maximum" | "Overloaded") {
  if (r === "Underloaded") return "bg-green-100 text-green-900";
  if (r === "Maximum") return "bg-yellow-100 text-yellow-900";
  return "bg-red-100 text-red-900";
}

function remarkForRow(row: FacultyLoadRow): "Underloaded" | "Maximum" | "Overloaded" {
  if (row.violations.length > 0) return "Overloaded";
  const cap = row.effectiveTeachingCap ?? 0;
  const t = row.weeklyTotalContactHours;
  if (t <= cap - 0.75) return "Underloaded";
  if (t <= cap + 0.75) return "Maximum";
  return "Overloaded";
}

function prepCountFromRow(row: FacultyLoadRow): number {
  // Distinct preps not tracked in FacultyLoadRow; show placeholder — policy engine focuses on units/hours.
  return Math.max(1, Math.round(row.weeklyTotalContactHours / 3) || 0);
}

function unitsFromRow(row: FacultyLoadRow): number {
  return Math.round(row.weeklyTotalContactHours * 1.5);
}

export function ChairmanEvaluatorLoadPanel({ snapshot }: { snapshot: ChairmanPolicySnapshot | null }) {
  const rows = snapshot?.rows ?? [];
  const emptyHint =
    snapshot && rows.length === 0
      ? "Plot timetable rows on the Timetabling tab (with a term selected) to compute weekly contact hours."
      : null;

  if (!snapshot) {
    return (
      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden p-6">
        <p className="text-[13px] text-black/60">
          Open the Timetabling tab once to load faculty load data. Load totals use your Faculty Profile status and
          designation (designation caps and part-time rules from the Faculty Manual policy engine).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="p-4 border-b border-black/10">
        <div className="text-[16px] font-semibold">Faculty Load & Preps</div>
        <div className="text-[12px] text-black/60 mt-1">
          Hours and units from plotted rows; designation and status come from Faculty Profile (same rules as the
          timetabling policy panel).
          {snapshot.hasAnyViolation ? (
            <span className="text-amber-800 font-semibold"> · Some rows exceed policy — review the timetabling tab.</span>
          ) : null}
        </div>
      </div>
      {emptyHint ? (
        <p className="text-[13px] text-amber-900 bg-amber-50 border-b border-amber-200 px-4 py-3">{emptyHint}</p>
      ) : null}
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#ff990a] text-white text-[11px]">
              <th className="border border-black/10 px-2 py-2 text-left">Faculty Name</th>
              <th className="border border-black/10 px-2 py-2 text-left">Hours/Week</th>
              <th className="border border-black/10 px-2 py-2 text-left">Preps</th>
              <th className="border border-black/10 px-2 py-2 text-left">Units</th>
              <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
              <th className="border border-black/10 px-2 py-2 text-left">Status</th>
              <th className="border border-black/10 px-2 py-2 text-left">Rate per Hour</th>
              <th className="border border-black/10 px-2 py-2 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-black/10 px-2 py-6 text-center text-[12px] text-black/45">
                  No plotted instructor hours for this term yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const rate = snapshot.rateByInstructorId[r.instructorId] ?? null;
                const remark = remarkForRow(r);
                return (
                  <tr key={r.instructorId} className="text-[11px]">
                    <td className="border border-black/10 px-2 py-2 font-semibold">{r.instructorName}</td>
                    <td className="border border-black/10 px-2 py-2 tabular-nums">{r.weeklyTotalContactHours.toFixed(1)}</td>
                    <td className="border border-black/10 px-2 py-2 tabular-nums">{prepCountFromRow(r)}</td>
                    <td className="border border-black/10 px-2 py-2 tabular-nums">{unitsFromRow(r)}</td>
                    <td className="border border-black/10 px-2 py-2">{r.designation ?? "—"}</td>
                    <td className="border border-black/10 px-2 py-2">{r.status ?? "—"}</td>
                    <td className="border border-black/10 px-2 py-2 tabular-nums">{rate != null ? `₱${rate}` : "—"}</td>
                    <td className="border border-black/10 px-2 py-2">
                      <span className={`px-2 py-1 rounded-md font-semibold ${remarkClass(remark)}`}>{remark}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
