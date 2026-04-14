"use client";

import { useEffect, useMemo, useState } from "react";
import { getProspectusSubjectsForProgram, hasProspectusForProgram } from "@/lib/chairman/prospectus-registry";
import { groupProspectusByYearLevelOnly } from "@/lib/gec/prospectus-summary";
import { isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";

type Props = {
  /** Must match `Program.code` for the selected section (drives which static curriculum is shown). */
  programCode: string;
  /** Optional display name (e.g. program full name). */
  programName?: string;
  /** Optional filters: show only subjects for this year level. */
  yearLevel?: number | null;
  /** Optional filters: show only subjects for this semester. */
  semester?: 1 | 2 | null;
  /** When user picks a code, vacant-row subject dropdowns can prefill from this. */
  onSelectSubjectCode?: (code: string | null) => void;
  className?: string;
};

/**
 * Predefined prospectus summary for the **selected program**, grouped by **year level only**
 * (both semesters appear in the same year block; semester is shown per row).
 * Static rows come from `lib/chairman/prospectus-registry.ts` — add new programs there.
 */
export function BsitProspectusSummaryTable({
  programCode,
  programName,
  yearLevel = null,
  semester = null,
  onSelectSubjectCode,
  className = "",
}: Props) {
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const groups = useMemo(() => {
    const rows = getProspectusSubjectsForProgram(programCode).filter((r) => isGecCurriculumSubjectCode(r.code));
    const filtered = rows.filter((r) => {
      if (yearLevel && r.yearLevel !== yearLevel) return false;
      if (semester && r.semester !== semester) return false;
      return true;
    });
    return groupProspectusByYearLevelOnly(filtered);
  }, [programCode, yearLevel, semester]);

  useEffect(() => {
    setActiveCode(null);
    onSelectSubjectCode?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when scope (program/year/term) changes
  }, [programCode, yearLevel, semester]);

  function pick(code: string) {
    const next = activeCode === code ? null : code;
    setActiveCode(next);
    onSelectSubjectCode?.(next);
  }

  const label = programName?.trim()
    ? `${programName.trim()} (${programCode || "—"})`
    : programCode || "—";

  const scopeLabel =
    yearLevel && semester
      ? `Year ${yearLevel} · ${semester === 1 ? "1st" : "2nd"} Semester`
      : yearLevel
        ? `Year ${yearLevel}`
        : semester
          ? `${semester === 1 ? "1st" : "2nd"} Semester`
          : "All year levels";

  return (
    <div className={`rounded-xl border border-black/10 bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.08)] overflow-hidden ${className}`}>
      <div className="bg-[#780301] text-white px-4 py-3">
        <h3 className="text-sm font-bold tracking-tight">Predefined summary of subjects (GEC · by year level)</h3>
        <p className="text-[11px] text-white/85 mt-1">
          Program: <strong>{label}</strong> · Scope: <strong>{scopeLabel}</strong>. Only this year level for the selected
          semester. Click a row to select a code for vacant GEC slots below. To add another program, register its
          prospectus in{" "}
          <code className="rounded bg-white/15 px-1">lib/chairman/prospectus-registry.ts</code>.
        </p>
      </div>
      {!programCode.trim() ? (
        <p className="text-sm text-black/55 px-4 py-8">Select a section to load that program&apos;s prospectus.</p>
      ) : !hasProspectusForProgram(programCode) ? (
        <div className="px-4 py-8 text-sm text-amber-950 bg-amber-50 border-t border-amber-200">
          <p className="font-semibold">No static prospectus for program code &quot;{programCode}&quot;</p>
          <p className="mt-2 text-black/75">
            Add an array of <code className="text-xs bg-black/[0.06] px-1">ProspectusSubjectRow</code> to{" "}
            <code className="text-xs bg-black/[0.06] px-1">PROGRAM_PROSPECTUS_SUBJECTS</code> in{" "}
            <code className="text-xs bg-black/[0.06] px-1">prospectus-registry.ts</code> using the same code as in
            Supabase <code className="text-xs bg-black/[0.06] px-1">Program.code</code> (case-insensitive).
          </p>
        </div>
      ) : (
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-[1]">
              <tr className="bg-[#ff990a] text-white">
                <th className="border border-black/10 px-2 py-2 text-left font-bold w-[88px]">Year level</th>
                <th className="border border-black/10 px-2 py-2 text-left font-bold w-[72px]">Sem</th>
                <th className="border border-black/10 px-2 py-2 text-left font-bold">Code</th>
                <th className="border border-black/10 px-2 py-2 text-left font-bold">Title</th>
                <th className="border border-black/10 px-2 py-2 text-right font-bold w-[52px]">Lec U</th>
                <th className="border border-black/10 px-2 py-2 text-right font-bold w-[52px]">Lab U</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-black/10 px-3 py-8 text-center text-[12px] text-black/55">
                    No GEC subjects found for the selected year level / semester scope.
                  </td>
                </tr>
              ) : null}
              {groups.map((g) =>
                g.subjects.map((s, i) => (
                  <tr
                    key={`${g.yearLevel}-${s.code}-${s.semester}`}
                    className={`cursor-pointer transition-colors ${
                      activeCode === s.code
                        ? "bg-emerald-100 ring-1 ring-emerald-400"
                        : i % 2 === 0
                          ? "bg-white"
                          : "bg-black/[0.02]"
                    } hover:bg-amber-50/80`}
                    onClick={() => pick(s.code)}
                  >
                    {i === 0 ? (
                      <td
                        rowSpan={g.subjects.length}
                        className="border border-black/10 px-2 py-1.5 align-top font-semibold text-black/80 whitespace-nowrap bg-black/[0.03]"
                      >
                        Year {g.yearLevel}
                      </td>
                    ) : null}
                    <td className="border border-black/10 px-2 py-1.5 text-black/75 text-[10px] font-medium whitespace-nowrap">
                      {s.semester === 1 ? "1st" : "2nd"}
                    </td>
                    <td className="border border-black/10 px-2 py-1.5 font-mono font-semibold text-[#780301]">{s.code}</td>
                    <td className="border border-black/10 px-2 py-1.5 text-black/85">{s.title}</td>
                    <td className="border border-black/10 px-2 py-1.5 text-right tabular-nums">{s.lecUnits}</td>
                    <td className="border border-black/10 px-2 py-1.5 text-right tabular-nums">{s.labUnits}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
