"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { getProspectusSubjectsForProgram, hasProspectusForProgram } from "@/lib/chairman/prospectus-registry";
import { groupProspectusByYearAndSemester } from "@/lib/gec/prospectus-summary";
import { isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";

type Props = {
  /** Must match `Program.code` for the chairman’s locked program (e.g. BSIT). */
  programCode: string;
  programName?: string | null;
  /** When set, plotted status is computed for this section only. */
  selectedSectionId: string;
  /**
   * Curriculum year to show: `undefined` = no section picked yet; `null` = section picked but year could not be parsed
   * from the section name; `1–4` = filter prospectus to that year (and optional semester below).
   */
  yearLevelFilter: number | null | undefined;
  /**
   * When non-null (from {@link prospectusSemesterFromAcademicPeriod}), limit rows to that prospectus semester.
   * When null, both semesters for the filtered year are listed.
   */
  filterSemester?: 1 | 2 | null;
  /**
   * Normalized subject codes that already have at least one fully plotted row
   * (section + subject + instructor + room + time) for the selected section.
   */
  plottedSubjectCodes: ReadonlySet<string>;
  /** Latest code the chairman just plotted — extra emphasis (pulse) in the summary. */
  lastPlottedSubjectCode?: string | null;
  className?: string;
};

/**
 * Program Chairman: prospectus rows (major + GEC) for the **selected section’s year** (and term semester when known),
 * grouped by year level × semester. “Plotted” reflects assignments for the selected section only.
 */
export function ChairmanProgramProspectusSummaryTable({
  programCode,
  programName,
  selectedSectionId,
  yearLevelFilter,
  filterSemester = null,
  plottedSubjectCodes,
  lastPlottedSubjectCode = null,
  className = "",
}: Props) {
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const groups = useMemo(() => {
    const rows = getProspectusSubjectsForProgram(programCode);
    if (yearLevelFilter == null) return [];
    let list = rows.filter((r) => r.yearLevel === yearLevelFilter);
    if (filterSemester != null) {
      list = list.filter((r) => r.semester === filterSemester);
    }
    return groupProspectusByYearAndSemester(list);
  }, [programCode, yearLevelFilter, filterSemester]);

  useEffect(() => {
    setActiveCode(null);
  }, [programCode, selectedSectionId, yearLevelFilter, filterSemester]);

  const label = programName?.trim()
    ? `${programName.trim()} (${programCode || "—"})`
    : programCode || "—";

  const scopeDescription = useMemo(() => {
    if (yearLevelFilter == null) return null;
    const y = `Year ${yearLevelFilter}`;
    if (filterSemester == null) return `${y} · both semesters`;
    return `${y} · ${filterSemester === 1 ? "1st" : "2nd"} semester`;
  }, [yearLevelFilter, filterSemester]);

  return (
    <div
      className={`rounded-xl border border-black/10 bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.08)] overflow-hidden ${className}`}
    >
      <div className="bg-[#780301] text-white px-4 py-3">
        <h3 className="text-sm font-bold tracking-tight">Predefined summary of subjects (Program Chairman)</h3>
        <p className="text-[11px] text-white/85 mt-1">
          Program: <strong>{label}</strong>
          {scopeDescription ? (
            <>
              {" "}
              · Showing <strong>{scopeDescription}</strong> (from the selected section and current term). Major and GEC
              courses for that scope only. Curricula:{" "}
              <code className="rounded bg-white/15 px-1">lib/chairman/prospectus-registry.ts</code>.
            </>
          ) : (
            <>
              {" "}
              · Pick a section (e.g. BSIT 3A) to filter this list to that year level. Semester narrows further when the
              term maps to 1st/2nd in{" "}
              <code className="rounded bg-white/15 px-1">prospectusSemesterFromAcademicPeriod</code>.
            </>
          )}
        </p>
      </div>
      {!programCode.trim() ? (
        <p className="text-sm text-black/55 px-4 py-8">No program code in scope.</p>
      ) : !hasProspectusForProgram(programCode) ? (
        <div className="px-4 py-8 text-sm text-amber-950 bg-amber-50 border-t border-amber-200">
          <p className="font-semibold">No static prospectus for program code &quot;{programCode}&quot;</p>
        </div>
      ) : yearLevelFilter === undefined ? (
        <p className="text-sm text-black/60 px-4 py-8">
          <strong>Select a section</strong> above (e.g. BSIT 3A). The summary will list only subjects for that section’s
          year level — not other years.
        </p>
      ) : yearLevelFilter === null ? (
        <div className="px-4 py-8 text-sm text-amber-950 bg-amber-50 border-t border-amber-200">
          <p className="font-semibold">Could not detect year level from this section name.</p>
          <p className="mt-2 text-black/75">
            Use a standard label like <code className="text-xs bg-black/[0.06] px-1">BSIT-3A</code> so the code can map it
            to 3rd year.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-black/55 px-4 py-8">
          No prospectus rows for {scopeDescription ?? `year ${yearLevelFilter}`}. Try another term or check the registry.
        </p>
      ) : (
        <div className="max-h-[360px] overflow-y-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-[1]">
              <tr className="bg-[#ff990a] text-white">
                <th className="border border-black/10 px-2 py-2 text-left font-bold min-w-[120px]">Year · Sem</th>
                <th className="border border-black/10 px-2 py-2 text-left font-bold w-[72px]">Track</th>
                <th className="border border-black/10 px-2 py-2 text-left font-bold">Code</th>
                <th className="border border-black/10 px-2 py-2 text-left font-bold">Title</th>
                <th className="border border-black/10 px-2 py-2 text-right font-bold w-[52px]">Lec U</th>
                <th className="border border-black/10 px-2 py-2 text-right font-bold w-[52px]">Lab U</th>
                <th className="border border-black/10 px-2 py-2 text-left font-bold w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) =>
                g.subjects.map((s, i) => {
                  const n = normalizeProspectusCode(s.code);
                  const plotted =
                    Boolean(selectedSectionId) && plottedSubjectCodes.has(n);
                  const pulse =
                    plotted &&
                    lastPlottedSubjectCode &&
                    normalizeProspectusCode(lastPlottedSubjectCode) === n;
                  const isGec = isGecCurriculumSubjectCode(s.code);
                  const rowActive = activeCode === s.code;
                  return (
                    <tr
                      key={`${g.key}-${s.code}`}
                      className={`transition-colors ${
                        plotted
                          ? pulse
                            ? "bg-emerald-100 ring-2 ring-[#ff990a]/90"
                            : "bg-emerald-50/95 ring-1 ring-emerald-300/80"
                          : rowActive
                            ? "bg-amber-50/90 ring-1 ring-[#ff990a]"
                            : i % 2 === 0
                              ? "bg-white"
                              : "bg-black/[0.02]"
                      }`}
                      onClick={() => setActiveCode((c) => (c === s.code ? null : s.code))}
                    >
                      {i === 0 ? (
                        <td
                          rowSpan={g.subjects.length}
                          className="border border-black/10 px-2 py-1.5 align-top font-semibold text-black/80 whitespace-nowrap bg-black/[0.03]"
                        >
                          {g.label}
                        </td>
                      ) : null}
                      <td className="border border-black/10 px-2 py-1.5 text-[10px] font-semibold whitespace-nowrap">
                        {isGec ? (
                          <span className="text-[#780301]">GEC</span>
                        ) : (
                          <span className="text-black/70">Major</span>
                        )}
                      </td>
                      <td className="border border-black/10 px-2 py-1.5 font-mono font-semibold text-[#780301]">{s.code}</td>
                      <td className="border border-black/10 px-2 py-1.5 text-black/85">{s.title}</td>
                      <td className="border border-black/10 px-2 py-1.5 text-right tabular-nums">{s.lecUnits}</td>
                      <td className="border border-black/10 px-2 py-1.5 text-right tabular-nums">{s.labUnits}</td>
                      <td className="border border-black/10 px-2 py-1.5">
                        {!selectedSectionId ? (
                          <span className="text-black/40 text-[10px]">Pick a section</span>
                        ) : plotted ? (
                          <span className="inline-flex items-center gap-1 text-emerald-900 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            Plotted
                          </span>
                        ) : (
                          <span className="text-black/45 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
