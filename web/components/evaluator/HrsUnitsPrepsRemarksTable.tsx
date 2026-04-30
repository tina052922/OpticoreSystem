/**
 * Sample institutional load summary — same copy and layout as College Admin Central Hub “Hrs” tab.
 */

import type { FacultyLoadRow } from "@/lib/scheduling/facultyPolicies";

type LoadRowVM = {
  facultyName: string;
  hoursPerWeek: number;
  preps: number;
  units: number;
  designation: string | null;
  status: string | null;
  ratePerHour: number | null;
  remark: "Underloaded" | "Maximum" | "Overloaded";
};

const sampleLoadRows: LoadRowVM[] = [
  {
    facultyName: "Juan Dela Cruz",
    hoursPerWeek: 10,
    preps: 3,
    units: 15,
    designation: "Instructor I",
    status: "Organic",
    ratePerHour: 250,
    remark: "Underloaded",
  },
  {
    facultyName: "Ana Reyes",
    hoursPerWeek: 18,
    preps: 6,
    units: 24,
    designation: "Instructor (PT)",
    status: "Part-Time",
    ratePerHour: 200,
    remark: "Maximum",
  },
  {
    facultyName: "Dr. Maria Santos",
    hoursPerWeek: 22,
    preps: 7,
    units: 30,
    designation: "Chair / Instructor",
    status: "Permanent",
    ratePerHour: 300,
    remark: "Overloaded",
  },
];

function remarkClass(r: LoadRowVM["remark"]) {
  if (r === "Underloaded") return "bg-green-100 text-green-900";
  if (r === "Maximum") return "bg-yellow-100 text-yellow-900";
  return "bg-red-100 text-red-900";
}

function remarkForPolicyRow(row: FacultyLoadRow): LoadRowVM["remark"] {
  if (row.violations.length > 0) return "Overloaded";
  const cap = row.effectiveTeachingCap ?? 0;
  const t = row.weeklyTotalContactHours;
  if (t <= cap - 0.75) return "Underloaded";
  if (t <= cap + 0.75) return "Maximum";
  return "Overloaded";
}

function prepCountFromRow(row: FacultyLoadRow): number {
  // Distinct preparations are not explicitly stored per ScheduleEntry in this release.
  // Use a stable heuristic so load tables remain informative without manual data entry.
  return Math.max(1, Math.round(row.weeklyTotalContactHours / 3) || 0);
}

function unitsFromRow(row: FacultyLoadRow): number {
  // Semester “units” are approximated from weekly contact hours for governance visibility.
  return Math.round(row.weeklyTotalContactHours * 1.5);
}

export function HrsUnitsPrepsRemarksTable(props?: {
  /** Optional: real computed rows. If omitted, shows sample placeholders (used on some hub landing screens). */
  policyRows?: FacultyLoadRow[];
  /** Hourly rate from Faculty Profile (computed from highest degree). */
  rateByInstructorId?: Record<string, number | null>;
}) {
  const policyRows = props?.policyRows ?? null;
  const rateByInstructorId = props?.rateByInstructorId ?? {};

  const rows: LoadRowVM[] = policyRows
    ? policyRows.map((r) => ({
        facultyName: r.instructorName,
        hoursPerWeek: r.weeklyTotalContactHours,
        preps: prepCountFromRow(r),
        units: unitsFromRow(r),
        designation: r.designation ?? null,
        status: r.status ?? null,
        ratePerHour: rateByInstructorId[r.instructorId] ?? null,
        remark: remarkForPolicyRow(r),
      }))
    : sampleLoadRows;

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="p-4 border-b border-black/10">
        <div className="text-[16px] font-semibold">Hrs · Units · Preps · Remarks</div>
        <div className="text-[12px] text-black/60 mt-1">
          {policyRows ? "Institutional load policy summary (computed from timetable + Faculty Profile)." : "Institutional load policy summary (sample rows)."}
        </div>
      </div>
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
            {rows.map((r) => (
              <tr key={r.facultyName} className="text-[11px]">
                <td className="border border-black/10 px-2 py-2 font-semibold">{r.facultyName}</td>
                <td className="border border-black/10 px-2 py-2 tabular-nums">
                  {policyRows ? r.hoursPerWeek.toFixed(1) : r.hoursPerWeek}
                </td>
                <td className="border border-black/10 px-2 py-2">{r.preps}</td>
                <td className="border border-black/10 px-2 py-2">{r.units}</td>
                <td className="border border-black/10 px-2 py-2">{r.designation ?? "—"}</td>
                <td className="border border-black/10 px-2 py-2">{r.status ?? "—"}</td>
                <td className="border border-black/10 px-2 py-2 tabular-nums">
                  {r.ratePerHour != null ? `₱${r.ratePerHour}` : "—"}
                </td>
                <td className="border border-black/10 px-2 py-2">
                  <span className={`px-2 py-1 rounded-md font-semibold ${remarkClass(r.remark)}`}>{r.remark}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
