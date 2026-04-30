"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { getProspectusSubjectsForProgram, hasProspectusForProgram } from "@/lib/chairman/prospectus-registry";
import { groupProspectusByYearLevelOnly } from "@/lib/gec/prospectus-summary";
import { isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";

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
  plottedSubjectCodes,
  onSelectSubjectCode,
  className = "",
}: Props) {
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const groups = useMemo(() => {
    const rows = getProspectusSubjectsForProgram(programCode).filter((r) => isGecCurriculumSubjectCode(r.code));
    /** Use `!= null` so year level 0 would still filter — curriculum uses 1–4 only. */
    const filtered = rows.filter((r) => {
      if (yearLevel != null && r.yearLevel !== yearLevel) return false;
      if (semester != null && r.semester !== semester) return false;
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
        <div className="text-[12px] font-semibold text-[#780301]">Summary of Subjects (GEC)</div>
        <div className="text-[11px] text-black/55">
          Program: <span className="font-medium text-black/70">{label}</span> · Scope: {scopeLabel}
        </div>
      </div>
      {!programCode.trim() ? (
        <p className="text-sm text-black/55 px-2 py-4">Select a section to load that program&apos;s prospectus.</p>
      ) : !hasProspectusForProgram(programCode) ? (
        <div className="px-2 py-4 text-sm text-amber-950 bg-amber-50">
          <p className="font-semibold">No static prospectus for program code &quot;{programCode}&quot;</p>
          <p className="mt-2 text-black/75">
            Add an array of <code className="text-xs bg-black/[0.06] px-1">ProspectusSubjectRow</code> to{" "}
            <code className="text-xs bg-black/[0.06] px-1">PROGRAM_PROSPECTUS_SUBJECTS</code> in{" "}
            <code className="text-xs bg-black/[0.06] px-1">prospectus-registry.ts</code> using the same code as in
            Supabase <code className="text-xs bg-black/[0.06] px-1">Program.code</code> (case-insensitive).
          </p>
        </div>
      ) : (
        <div className="px-2 pb-2">
          {groups.length === 0 ? (
            <div className="text-[12px] text-black/55 py-4">No GEC subjects found for the selected scope.</div>
          ) : null}
          {groups.map((g) => (
            <div key={String(g.yearLevel)} className="mb-2">
              <div className="text-[11px] font-semibold text-black/70">Year {g.yearLevel}</div>
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  {g.subjects.slice(0, 14).map((s) => {
                    const plotted = Boolean(plottedSubjectCodes?.has(normalizeProspectusCode(s.code)));
                    return (
                      <tr key={`${s.code}-${s.semester}`} className="border-b border-black/5 last:border-b-0">
                        <td className="py-1 pr-2 font-mono font-semibold text-[#780301] whitespace-nowrap">{s.code}</td>
                        <td className="py-1 pr-2 text-black/60 whitespace-nowrap">{s.semester === 1 ? "1st" : "2nd"} sem</td>
                        <td className="py-1 text-black/75">{s.title}</td>
                        <td className="py-1 pl-2 text-right whitespace-nowrap">
                          {plotted ? (
                            <span className="inline-flex items-center gap-1 text-emerald-900 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              Plotted
                            </span>
                          ) : (
                            <span className="text-black/35">—</span>
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
