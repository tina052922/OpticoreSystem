"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BSIT_PROGRAM_CODE } from "@/lib/chairman/bsit-prospectus";
import { isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";
import { getProspectusSubjectsForProgram, hasProspectusForProgram } from "@/lib/chairman/prospectus-registry";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Q } from "@/lib/supabase/catalog-columns";
import { normalizeSubjectCodeForCompare } from "@/lib/subjects/normalize-subject-code";
import type { Subject } from "@/types/db";

function formatProspectusSemester(sem: number): string {
  return sem === 1 ? "1st" : "2nd";
}

export type SubjectCodesWorkspaceProps = {
  /** Chairman session: program is fixed. */
  lockedProgramId?: string | null;
  /** When set, keys the static prospectus registry (must match `Program.code`). Skips a Program lookup. */
  lockedProgramCode?: string | null;
  /** Campus scope: program from `SubjectCodesWithScope` / filters. */
  scopeProgramId?: string | null;
  scopeProgramCode?: string | null;
  /**
   * GEC Chairman: BSIT program only — prospectus and database rows limited to GEC-% / GEE-% codes.
   */
  gecCurriculumOnly?: boolean;
};

export function SubjectCodesWorkspace({
  lockedProgramId = null,
  lockedProgramCode = null,
  scopeProgramId = null,
  scopeProgramCode = null,
  gecCurriculumOnly = false,
}: SubjectCodesWorkspaceProps) {
  const programId = lockedProgramId ?? scopeProgramId ?? null;

  const [resolvedProgramCode, setResolvedProgramCode] = useState<string | null>(null);

  useEffect(() => {
    const explicit = (lockedProgramCode ?? scopeProgramCode)?.trim();
    if (explicit) {
      setResolvedProgramCode(null);
      return;
    }
    if (!programId) {
      setResolvedProgramCode(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      const { data } = await supabase.from("Program").select("code").eq("id", programId).maybeSingle();
      if (!cancelled) setResolvedProgramCode(data?.code ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [programId, lockedProgramCode, scopeProgramCode]);

  const effectiveProgramCode = useMemo(() => {
    const l = lockedProgramCode?.trim();
    const s = scopeProgramCode?.trim();
    if (l) return l;
    if (s) return s;
    return resolvedProgramCode?.trim() ?? null;
  }, [lockedProgramCode, scopeProgramCode, resolvedProgramCode]);

  const prospectusRows = useMemo(() => {
    if (!effectiveProgramCode) return [];
    const raw = getProspectusSubjectsForProgram(effectiveProgramCode);
    const filtered = gecCurriculumOnly ? raw.filter((row) => isGecCurriculumSubjectCode(row.code)) : raw;
    return filtered.map((row) => ({
      ...row,
      subcode: "" as const,
    }));
  }, [effectiveProgramCode, gecCurriculumOnly]);

  const [code, setCode] = useState("");
  const [subcode, setSubcode] = useState("");
  const [title, setTitle] = useState("");
  const [lecUnits, setLecUnits] = useState("");
  const [lecHours, setLecHours] = useState("");
  const [labUnits, setLabUnits] = useState("");
  const [labHours, setLabHours] = useState("");
  const [yearLevel, setYearLevel] = useState("1");

  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    if (!programId) {
      setDbSubjects([]);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setLoadingList(true);
    setError(null);
    const { data, error: e } = await supabase
      .from("Subject")
      .select(Q.subject)
      .eq("programId", programId)
      .order("code");
    setLoadingList(false);
    if (e) {
      setError(e.message);
      return;
    }
    setDbSubjects((data ?? []) as Subject[]);
  }, [programId]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  const filteredDbSubjects = useMemo(() => {
    let base = gecCurriculumOnly ? dbSubjects.filter((s) => isGecCurriculumSubjectCode(s.code)) : dbSubjects;
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.subcode && s.subcode.toLowerCase().includes(q)),
    );
  }, [dbSubjects, subjectSearch, gecCurriculumOnly]);

  const filteredProspectus = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return prospectusRows;
    return prospectusRows.filter((row) => {
      const semText = formatProspectusSemester(row.semester).toLowerCase();
      return (
        String(row.code).toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q) ||
        (row.subcode && String(row.subcode).toLowerCase().includes(q)) ||
        semText.includes(q) ||
        String(row.semester).includes(q)
      );
    });
  }, [prospectusRows, subjectSearch]);

  const duplicateLocal = useMemo(() => {
    const n = normalizeSubjectCodeForCompare(code.trim());
    if (!n) return false;
    return dbSubjects.some((s) => normalizeSubjectCodeForCompare(s.code) === n);
  }, [code, dbSubjects]);

  async function onAddSubject() {
    setError(null);
    setSuccess(null);
    if (!programId) {
      setError("Select a program (use the scope bar) before adding a subject.");
      return;
    }
    const trimmedCode = code.trim();
    const trimmedTitle = title.trim();
    if (!trimmedCode || !trimmedTitle) {
      setError("Subject Code and Descriptive Title are required.");
      return;
    }
    if (gecCurriculumOnly && !isGecCurriculumSubjectCode(trimmedCode)) {
      setError("GEC Chairman may only add subjects whose codes start with GEC- or GEE- (general education).");
      return;
    }
    if (duplicateLocal) {
      setError("Subject Code already exists.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setSaving(true);
    const { data: existing, error: fetchErr } = await supabase.from("Subject").select("id, code");
    if (fetchErr) {
      setSaving(false);
      setError(fetchErr.message);
      return;
    }
    const norm = normalizeSubjectCodeForCompare(trimmedCode);
    const cross = (existing ?? []).some((row: { code: string }) => normalizeSubjectCodeForCompare(row.code) === norm);
    if (cross) {
      setSaving(false);
      setError("Subject Code already exists.");
      return;
    }

    const lecU = parseFloat(lecUnits) || 0;
    const lecH = parseFloat(lecHours) || 0;
    const labU = parseFloat(labUnits) || 0;
    const labH = parseFloat(labHours) || 0;
    const yl = Math.min(4, Math.max(1, parseInt(yearLevel, 10) || 1));

    const { error: insErr } = await supabase.from("Subject").insert({
      code: trimmedCode,
      subcode: subcode.trim() || null,
      title: trimmedTitle,
      lecUnits: lecU,
      lecHours: lecH,
      labUnits: labU,
      labHours: labH,
      programId,
      yearLevel: yl,
    });

    setSaving(false);
    if (insErr) {
      if (insErr.code === "23505") {
        setError("Subject Code already exists.");
      } else {
        setError(insErr.message);
      }
      return;
    }

    setSuccess("Subject saved.");
    setCode("");
    setSubcode("");
    setTitle("");
    setLecUnits("");
    setLecHours("");
    setLabUnits("");
    setLabHours("");
    setYearLevel("1");
    void loadSubjects();
  }

  const prospectusSubtitle =
    gecCurriculumOnly && effectiveProgramCode?.toUpperCase() === BSIT_PROGRAM_CODE
      ? "GEC / GEE rows only — CMO No. 25 s. 2015 (BSIT)"
      : effectiveProgramCode?.toUpperCase() === BSIT_PROGRAM_CODE
        ? "CMO No. 25 s. 2015 — effective A.Y. 2023–2024"
        : "Static prospectus slice in `prospectus-registry` for this program code.";

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 space-y-6 max-h-[min(78vh,960px)] overflow-y-auto">
      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <div className="text-[16px] font-semibold">Add Subject</div>
            <p className="text-[12px] text-black/55 mt-1">
              {gecCurriculumOnly
                ? "Only GEC- / GEE- codes (general education). Saved under the BSIT program for this college."
                : "New offerings are saved to Supabase for the selected program. Codes are unique across the database."}
            </p>
          </div>
          <Button
            type="button"
            className="bg-[#ff990a] text-white hover:bg-[#e68a09]"
            disabled={saving || !programId}
            onClick={() => void onAddSubject()}
          >
            + Add Subject
          </Button>
        </div>

        {!programId ? (
          <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Select a program using the scope bar above to add subjects or view saved rows.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</p>
        ) : null}
        {success ? (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">{success}</p>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">Subject Code</div>
            <Input placeholder="e.g. CC-111" value={code} onChange={(e) => setCode(e.target.value)} disabled={!programId} />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Subcode</div>
            <Input placeholder="Optional" value={subcode} onChange={(e) => setSubcode(e.target.value)} disabled={!programId} />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Descriptive Title</div>
            <Input placeholder="Course title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!programId} />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Lec Units</div>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="0"
              value={lecUnits}
              onChange={(e) => setLecUnits(e.target.value)}
              disabled={!programId}
            />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Lec Hours</div>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="0"
              value={lecHours}
              onChange={(e) => setLecHours(e.target.value)}
              disabled={!programId}
            />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Lab Units</div>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="0"
              value={labUnits}
              onChange={(e) => setLabUnits(e.target.value)}
              disabled={!programId}
            />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Lab Hours</div>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="0"
              value={labHours}
              onChange={(e) => setLabHours(e.target.value)}
              disabled={!programId}
            />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Year level</div>
            <select
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value)}
              disabled={!programId}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="p-4 border-b border-black/10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[16px] font-semibold">Saved subject codes (database)</div>
            <p className="text-[12px] text-black/55 mt-1">
              {programId ? "Rows in Supabase for the selected program." : "Select a program to load saved subjects."}
              {loadingList ? " Loading…" : ""}
            </p>
          </div>
          <div className="w-full sm:max-w-xs space-y-1">
            <div className="text-[11px] font-medium text-black/60">Search by code or title</div>
            <Input
              placeholder="e.g. CC-111 or Programming"
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              disabled={!programId}
              className="h-9 text-sm border-black/20 focus-visible:ring-[#ff990a]/40"
            />
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#ff990a] text-white text-[11px]">
                <th className="border border-black/10 px-2 py-2 text-left">Yr</th>
                <th className="border border-black/10 px-2 py-2 text-left">Subject Code</th>
                <th className="border border-black/10 px-2 py-2 text-left">Subcode</th>
                <th className="border border-black/10 px-2 py-2 text-left">Descriptive Title</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lec Units</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lec Hours</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lab Units</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lab Hours</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {!programId ? (
                <tr>
                  <td colSpan={8} className="border border-black/10 px-2 py-6 text-center text-black/45">
                    No program selected.
                  </td>
                </tr>
              ) : filteredDbSubjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-black/10 px-2 py-6 text-center text-black/45">
                    {dbSubjects.length === 0
                      ? "No subjects in the database for this program yet."
                      : "No saved subjects match your search."}
                  </td>
                </tr>
              ) : (
                filteredDbSubjects.map((s) => (
                  <tr key={s.id}>
                    <td className="border border-black/10 px-2 py-2 tabular-nums">{s.yearLevel}</td>
                    <td className="border border-black/10 px-2 py-2 font-semibold">{s.code}</td>
                    <td className="border border-black/10 px-2 py-2">{s.subcode ?? "—"}</td>
                    <td className="border border-black/10 px-2 py-2">{s.title}</td>
                    <td className="border border-black/10 px-2 py-2">{s.lecUnits}</td>
                    <td className="border border-black/10 px-2 py-2">{s.lecHours}</td>
                    <td className="border border-black/10 px-2 py-2">{s.labUnits}</td>
                    <td className="border border-black/10 px-2 py-2">{s.labHours}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="p-4 border-b border-black/10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[16px] font-semibold">Official prospectus (reference)</div>
            <p className="text-[12px] text-black/55 mt-1">
              {programId && effectiveProgramCode
                ? `${effectiveProgramCode} — ${prospectusSubtitle}`
                : "Select a program to load the static curriculum reference for that program code."}
            </p>
          </div>
          <p className="text-[11px] text-black/45 sm:text-right">Uses the same search box as saved subjects above.</p>
        </div>
        {!programId ? (
          <p className="text-[13px] text-black/45 px-4 py-6 text-center">No program selected.</p>
        ) : !effectiveProgramCode ? (
          <p className="text-[13px] text-amber-800 bg-amber-50 border-t border-amber-200 px-4 py-3">
            Resolving program code… If this persists, ensure the Program row exists in Supabase.
          </p>
        ) : !hasProspectusForProgram(effectiveProgramCode) ? (
          <p className="text-[13px] text-amber-800 bg-amber-50 border-t border-amber-200 px-4 py-3">
            No static prospectus is registered for <strong>{effectiveProgramCode}</strong>. Add entries in{" "}
            <code className="text-xs">prospectus-registry.ts</code> or use saved subjects only.
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#ff990a] text-white text-[11px]">
                  <th className="border border-black/10 px-2 py-2 text-left">Yr</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Sem</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Subject Code</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Subcode</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Descriptive Title</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Lec Units</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Lec Hours</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Lab Units</th>
                  <th className="border border-black/10 px-2 py-2 text-left">Lab Hours</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {filteredProspectus.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="border border-black/10 px-2 py-6 text-center text-black/45">
                      No prospectus rows match &quot;{subjectSearch.trim()}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredProspectus.map((s) => (
                    <tr key={`${s.yearLevel}-${s.semester}-${s.code}`}>
                      <td className="border border-black/10 px-2 py-2 tabular-nums">{s.yearLevel}</td>
                      <td className="border border-black/10 px-2 py-2">{formatProspectusSemester(s.semester)}</td>
                      <td className="border border-black/10 px-2 py-2 font-semibold">{s.code}</td>
                      <td className="border border-black/10 px-2 py-2">{s.subcode || "—"}</td>
                      <td className="border border-black/10 px-2 py-2">{s.title}</td>
                      <td className="border border-black/10 px-2 py-2">{s.lecUnits}</td>
                      <td className="border border-black/10 px-2 py-2">{s.lecHours}</td>
                      <td className="border border-black/10 px-2 py-2">{s.labUnits}</td>
                      <td className="border border-black/10 px-2 py-2">{s.labHours}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
