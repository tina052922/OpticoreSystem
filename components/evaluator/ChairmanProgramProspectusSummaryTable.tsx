"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { getProspectusSubjectsForProgram, hasProspectusForProgram } from "@/lib/chairman/prospectus-registry";
import { groupProspectusByYearAndSemester } from "@/lib/gec/prospectus-summary";
import { isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import { weeklyContactHoursFromUnits } from "@/lib/subjects/contact-hours";
import { SubjectWeeklyHoursChip } from "@/components/evaluator/SubjectWeeklyHoursBanner";

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
  /** Plotted weekly contact hours for the selected section, keyed by normalized subject code. */
  plottedHoursBySubjectCode?: ReadonlyMap<string, number>;
  /** Latest code the chairman just plotted — extra emphasis (pulse) in the summary. */
  lastPlottedSubjectCode?: string | null;
  /** Catalog subjects when the program has no static prospectus (BIT / BSIE). */
  fallbackSubjects?: Array<{
    code: string;
    title: string;
    lecUnits?: number;
    labUnits?: number;
    lecHours?: number;
    labHours?: number;
    yearLevel?: number;
    semester?: 1 | 2;
  }>;
  className?: string;
};

/**
 * Program Chairman: prospectus rows (major + GEC) for the **selected section’s year** (and term semester when known),
 * grouped by year level × semester. “Plotted” reflects assignments for the selected section only.
 */
export function ChairmanProgramProspectusSummaryTable({
  programCode,
  programName: _programName,
  selectedSectionId,
  yearLevelFilter,
  filterSemester = null,
  plottedSubjectCodes,
  plottedHoursBySubjectCode,
  lastPlottedSubjectCode = null,
  fallbackSubjects = [],
  className = "",
}: Props) {
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const groups = useMemo(() => {
    const rows = hasProspectusForProgram(programCode)
      ? getProspectusSubjectsForProgram(programCode)
      : fallbackSubjects.map((s) => ({
          code: s.code,
          title: s.title,
          lecUnits: s.lecUnits ?? 0,
          lecHours: s.lecHours ?? 0,
          labUnits: s.labUnits ?? 0,
          labHours: s.labHours ?? 0,
          yearLevel: s.yearLevel && s.yearLevel >= 1 && s.yearLevel <= 4 ? s.yearLevel : 1,
          semester: (s.semester === 2 ? 2 : 1) as 1 | 2,
        }));
    if (yearLevelFilter == null) return [];
    let list = rows.filter((r) => r.yearLevel === yearLevelFilter);
    if (filterSemester != null) {
      list = list.filter((r) => r.semester === filterSemester);
    }
    return groupProspectusByYearAndSemester(list);
  }, [programCode, yearLevelFilter, filterSemester, fallbackSubjects]);

  useEffect(() => {
    setActiveCode(null);
  }, [programCode, selectedSectionId, yearLevelFilter, filterSemester]);

  const scopeDescription = useMemo(() => {
    if (yearLevelFilter == null) return null;
    const y = `Year ${yearLevelFilter}`;
    if (filterSemester == null) return `${y} · both semesters`;
    return `${y} · ${filterSemester === 1 ? "1st" : "2nd"} semester`;
  }, [yearLevelFilter, filterSemester]);

  return (
    <div className={`${className}`}>
      <div className="px-2 py-2">
        <div className="text-[12px] font-semibold text-[#780301]">Summary of Subjects</div>
        {scopeDescription ? (
          <div className="text-[11px] text-black/55">{scopeDescription}</div>
        ) : null}
        <div className="text-[10px] text-black/45 mt-0.5">
          Weekly hours: lecture 1 unit = 1 hour · lab 1 unit = 3 hours
        </div>
        {!hasProspectusForProgram(programCode) && programCode.trim() ? (
          <div className="text-[11px] text-black/50 mt-0.5">
            Curriculum for {programCode} uses catalog subjects (no static CMO prospectus file).
          </div>
        ) : null}
      </div>
      {!programCode.trim() ? (
        <p className="text-sm text-black/55 px-2 py-4">No program code in scope.</p>
      ) : yearLevelFilter === undefined ? (
        <p className="text-sm text-black/60 px-2 py-4">
          <strong>Select a section</strong> above (e.g. BSIT 3A). The summary will list only subjects for that section’s
          year level — not other years.
        </p>
      ) : yearLevelFilter === null ? (
        <div className="px-2 py-4 text-sm text-amber-950 bg-amber-50">
          <p className="font-semibold">Could not detect year level from this section name.</p>
          <p className="mt-2 text-black/75">
            Use a standard label like <code className="text-xs bg-black/[0.06] px-1">BSIT-3A</code> so the code can map it
            to 3rd year.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-black/55 px-2 py-4">
          No prospectus rows for {scopeDescription ?? `year ${yearLevelFilter}`}. Try another term or check the registry.
        </p>
      ) : (
        <div className="px-2 pb-2">
          {groups.map((g) => (
            <div key={g.key} className="mb-2">
              <div className="text-[11px] font-semibold text-black/70">{g.label}</div>
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  {g.subjects.slice(0, 14).map((s) => {
                    const n = normalizeProspectusCode(s.code);
                    const plotted = Boolean(selectedSectionId) && plottedSubjectCodes.has(n);
                    const isGec = isGecCurriculumSubjectCode(s.code);
                    const requiredHours =
                      weeklyContactHoursFromUnits(s.lecUnits, s.labUnits) ||
                      (s.lecHours ?? 0) + (s.labHours ?? 0);
                    const plottedHours = plottedHoursBySubjectCode?.get(n) ?? 0;
                    const overLimit = plotted && requiredHours > 0 && plottedHours > requiredHours + 1e-6;
                    return (
                      <tr
                        key={`${g.key}-${s.code}`}
                        className={`border-b border-black/5 last:border-b-0 ${overLimit ? "bg-red-50/80" : ""}`}
                      >
                        <td className="py-1 pr-2 font-mono font-semibold text-[#780301] whitespace-nowrap">{s.code}</td>
                        <td className="py-1 pr-2 text-black/70">{isGec ? "GEC" : "Major"}</td>
                        <td className="py-1 text-black/75">{s.title}</td>
                        <td className="py-1 pl-2 text-right whitespace-nowrap">
                          {selectedSectionId && plotted && !overLimit ? (
                            <span className="inline-flex items-center gap-1 text-emerald-900 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              <SubjectWeeklyHoursChip
                                plotted
                                plottedHours={plottedHours}
                                requiredHours={requiredHours}
                              />
                            </span>
                          ) : (
                            <SubjectWeeklyHoursChip
                              plotted={Boolean(selectedSectionId) && plotted}
                              plottedHours={plottedHours}
                              requiredHours={requiredHours}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {g.subjects.length > 14 ? (
                <div className="text-[11px] text-black/45 mt-1">… and {g.subjects.length - 14} more</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
