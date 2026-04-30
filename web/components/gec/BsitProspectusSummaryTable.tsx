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
    <div className={`border border-black/10 bg-white ${className}`}>
      <div className="px-4 py-3 border-b border-black/10">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="text-sm font-bold text-[#780301]">Summary of Subjects (GEC)</h3>
          <span className="text-xs text-black/55">· Program: {label}</span>
          <span className="text-xs text-black/55">· Scope: {scopeLabel}</span>
        </div>
        <p className="text-[11px] text-black/50 mt-1">
          Click a code to prefill vacant GEC slot plotting. Plotted status reflects the current section/term scope.
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
        <div className="px-4 py-3 text-[12px] leading-relaxed">
          {groups.length === 0 ? (
            <div className="text-[12px] text-black/55 py-6">No GEC subjects found for the selected scope.</div>
          ) : null}
          {groups.map((g) => {
            const MAX_LINES = 16;
            const lines = g.subjects.slice(0, MAX_LINES);
            const more = g.subjects.length - lines.length;
            return (
              <div key={String(g.yearLevel)} className="mb-2">
                <div className="font-semibold text-black/70 text-[11px]">Year {g.yearLevel}</div>
                <div className="mt-1 space-y-1">
                  {lines.map((s) => {
                    const plotted = Boolean(plottedSubjectCodes?.has(normalizeProspectusCode(s.code)));
                    const active = activeCode === s.code;
                    return (
                      <button
                        key={`${s.code}-${s.semester}`}
                        type="button"
                        className={`w-full text-left rounded px-1 py-0.5 transition-colors ${
                          active ? "bg-amber-50" : plotted ? "bg-emerald-50" : ""
                        } hover:bg-amber-50/70`}
                        onClick={() => pick(s.code)}
                        title={s.title}
                      >
                        <span className="font-mono font-semibold text-[#780301]">{s.code}</span>{" "}
                        <span className="text-black/50 text-[11px]">({s.semester === 1 ? "1st" : "2nd"} sem)</span>
                        {plotted ? (
                          <span className="inline-flex items-center gap-1 text-emerald-900 font-semibold text-[11px] ml-2">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            Plotted
                          </span>
                        ) : null}
                        <div className="text-[11px] text-black/65 line-clamp-1">{s.title}</div>
                      </button>
                    );
                  })}
                  {more > 0 ? <div className="text-[11px] text-black/45">… and {more} more</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
