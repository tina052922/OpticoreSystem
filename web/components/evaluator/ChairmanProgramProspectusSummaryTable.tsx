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
    <div className={`border border-black/10 bg-white ${className}`}>
      <div className="px-4 py-3 border-b border-black/10">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="text-sm font-bold text-[#780301]">Summary of Subjects</h3>
          <span className="text-xs text-black/55">· Program: {label}</span>
          {scopeDescription ? <span className="text-xs text-black/55">· {scopeDescription}</span> : null}
        </div>
        {!scopeDescription ? (
          <p className="text-[11px] text-black/50 mt-1">Pick a section to scope this list to that year level (and term semester when detected).</p>
        ) : null}
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
        <div className="px-4 py-3 text-[12px] leading-relaxed">
          {groups.map((g) => {
            const lines = g.subjects.map((s) => {
              const n = normalizeProspectusCode(s.code);
              const plotted = Boolean(selectedSectionId) && plottedSubjectCodes.has(n);
              const pulse =
                plotted && lastPlottedSubjectCode && normalizeProspectusCode(lastPlottedSubjectCode) === n;
              const rowActive = activeCode === s.code;
              const isGec = isGecCurriculumSubjectCode(s.code);
              return {
                key: `${g.key}-${s.code}`,
                code: s.code,
                title: s.title,
                plotted,
                pulse,
                active: rowActive,
                track: isGec ? "GEC" : "Major",
              };
            });

            const MAX_LINES = 18;
            const clipped = lines.slice(0, MAX_LINES);
            const more = lines.length - clipped.length;

            return (
              <div key={g.key} className="mb-2">
                <div className="font-semibold text-black/70 text-[11px]">{g.label}</div>
                <div className="mt-1 space-y-1">
                  {clipped.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      className={`w-full text-left rounded px-1 py-0.5 transition-colors ${
                        l.plotted ? (l.pulse ? "bg-emerald-100" : "bg-emerald-50") : l.active ? "bg-amber-50" : ""
                      } hover:bg-amber-50/70`}
                      onClick={() => setActiveCode((c) => (c === l.code ? null : l.code))}
                      title={l.title}
                    >
                      <span className="font-mono font-semibold text-[#780301]">{l.code}</span>{" "}
                      <span className="text-black/55 text-[11px]">({l.track})</span>{" "}
                      {selectedSectionId && l.plotted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-900 font-semibold text-[11px] ml-2">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                          Plotted
                        </span>
                      ) : null}
                      <div className="text-[11px] text-black/65 line-clamp-1">{l.title}</div>
                    </button>
                  ))}
                  {more > 0 ? (
                    <div className="text-[11px] text-black/45">… and {more} more</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
