"use client";

import { useEffect, useMemo, useState } from "react";
import { getProspectusSubjectsForProgram, hasProspectusForProgram } from "@/lib/chairman/prospectus-registry";
import { groupProspectusByYearLevelOnly } from "@/lib/gec/prospectus-summary";
import { isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import { subjectWeeklyContactHours } from "@/lib/subjects/contact-hours";
import { SubjectWeeklyHoursChip } from "@/components/evaluator/SubjectWeeklyHoursBanner";
import { isGecEditableSubject } from "@/lib/subjects/gec-subject-scope";
import type { ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";

/** A Subject Codes row of the section's program (the source of truth when it has general subjects). */
export type SummaryCatalogSubject = {
  code: string;
  title: string;
  lecUnits?: number | null;
  lecHours?: number | null;
  labUnits?: number | null;
  labHours?: number | null;
  yearLevel?: number | null;
  semester?: number | null;
  category?: string | null;
  subjectArea?: string | null;
};

/** The program's general subjects (GEC / GEE / PE / NSTP / area-tagged) from Subject Codes. */
function generalRowsFromCatalog(subjects: readonly SummaryCatalogSubject[]): ProspectusSubjectRow[] {
  const out: ProspectusSubjectRow[] = [];
  const seen = new Set<string>();
  for (const s of subjects) {
    if (!isGecEditableSubject({ code: s.code, category: s.category ?? null, subjectArea: s.subjectArea ?? null })) continue;
    const sem = Number(s.semester);
    const year = Number(s.yearLevel);
    if (!(year >= 1) || (sem !== 1 && sem !== 2)) continue;
    const key = `${normalizeProspectusCode(s.code)}|${year}|${sem}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      code: s.code,
      title: s.title,
      lecUnits: Number(s.lecUnits ?? 0),
      lecHours: Number(s.lecHours ?? 0),
      labUnits: Number(s.labUnits ?? 0),
      labHours: Number(s.labHours ?? 0),
      yearLevel: year,
      semester: sem as 1 | 2,
      category: s.category ?? null,
    });
  }
  return out;
}

type Props = {
  /** Must match `Program.code` for the selected section (drives which static curriculum is shown). */
  programCode: string;
  /** Optional display name (e.g. program full name). */
  programName?: string;
  /** Filter: show only subjects for this year level (from section name, e.g. BSIT 3A → 3). */
  yearLevel?: number | null;
  /** Filter: when set, only that prospectus semester; when null, both semesters for the year. */
  semester?: 1 | 2 | null;
  /** When provided, show a Status column — GEC codes already scheduled for the active section/term. */
  plottedSubjectCodes?: ReadonlySet<string>;
  /** Plotted weekly contact hours for the selected section, keyed by normalized subject code. */
  plottedHoursBySubjectCode?: ReadonlyMap<string, number>;
  /** When user picks a code, vacant-row subject dropdowns can prefill from this. */
  onSelectSubjectCode?: (code: string | null) => void;
  className?: string;
  /**
   * The section's program rows from Subject Codes. Their general subjects are used first; the
   * built-in prospectus is only the fallback for a program with none recorded.
   */
  catalogSubjects?: readonly SummaryCatalogSubject[];
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
  plottedSubjectCodes,
  plottedHoursBySubjectCode,
  onSelectSubjectCode,
  className = "",
  catalogSubjects,
}: Props) {
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const catalogRows = useMemo(() => generalRowsFromCatalog(catalogSubjects ?? []), [catalogSubjects]);
  const fromCatalog = catalogRows.length > 0;
  const hasSource = fromCatalog || hasProspectusForProgram(programCode);

  const groups = useMemo(() => {
    const rows = fromCatalog
      ? catalogRows
      : getProspectusSubjectsForProgram(programCode).filter((r) => isGecCurriculumSubjectCode(r.code));
    /** Use `!= null` so year level 0 would still filter — curriculum uses 1–4 only. */
    const filtered = rows.filter((r) => {
      if (yearLevel != null && r.yearLevel !== yearLevel) return false;
      if (semester != null && r.semester !== semester) return false;
      return true;
    });
    return groupProspectusByYearLevelOnly(filtered);
  }, [programCode, yearLevel, semester, fromCatalog, catalogRows]);

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
    yearLevel != null && semester != null
      ? `Year ${yearLevel} · ${semester === 1 ? "1st" : "2nd"} Semester`
      : yearLevel != null
        ? `Year ${yearLevel}`
        : semester != null
          ? `${semester === 1 ? "1st" : "2nd"} Semester`
          : "All year levels";

  return (
    <div className={`${className}`}>
      <div className="px-2 py-2">
        <div className="text-[12px] font-semibold text-[#780301]">Summary of Subjects</div>
        <div className="text-[11px] text-black/55">
          Program: <span className="font-medium text-black/70">{label}</span> · Scope: {scopeLabel}
        </div>
      </div>
      {!programCode.trim() ? (
        <p className="text-sm text-black/55 px-2 py-4">Select a section to load that program&apos;s prospectus.</p>
      ) : !hasSource ? (
        <div className="px-2 py-4 text-sm text-amber-950 bg-amber-50">
          <p className="font-semibold">No general subjects recorded for &quot;{programCode}&quot;</p>
          <p className="text-[12px] mt-1">
            Add its GEC / GEE / PE / NSTP subjects (with year level and semester) in Subject Codes.
          </p>
        </div>
      ) : (
        <div className="px-2 pb-2">
          {groups.length === 0 ? (
            <div className="text-[12px] text-black/55 py-4">No general subjects found for the selected scope.</div>
          ) : null}
          {groups.map((g) => (
            <div key={String(g.yearLevel)} className="mb-2">
              <div className="text-[11px] font-semibold text-black/70">Year {g.yearLevel}</div>
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  {g.subjects.slice(0, 14).map((s) => {
                    const n = normalizeProspectusCode(s.code);
                    const plotted = Boolean(plottedSubjectCodes?.has(n));
                    // Subject Codes is the source of truth: recorded hours, never re-derived from units.
                    const requiredHours = subjectWeeklyContactHours(s);
                    const plottedHours = plottedHoursBySubjectCode?.get(n) ?? 0;
                    const overLimit = plotted && requiredHours > 0 && plottedHours > requiredHours + 1e-6;
                    return (
                      <tr
                        key={`${s.code}-${s.semester}`}
                        className={`border-b border-black/5 last:border-b-0 ${overLimit ? "bg-red-50/80" : ""}`}
                      >
                        <td className="py-1 pr-2 font-mono font-semibold text-[#780301] whitespace-nowrap">{s.code}</td>
                        <td className="py-1 pr-2 text-black/60 whitespace-nowrap">{s.semester === 1 ? "1st" : "2nd"} sem</td>
                        <td className="py-1 text-black/75">{s.title}</td>
                        <td className="py-1 pl-2 text-right whitespace-nowrap">
                          {/* The chip decides tick and colour; see `subjectHoursProgress`. */}
                          <SubjectWeeklyHoursChip
                            plotted={plotted}
                            plottedHours={plottedHours}
                            requiredHours={requiredHours}
                          />
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
