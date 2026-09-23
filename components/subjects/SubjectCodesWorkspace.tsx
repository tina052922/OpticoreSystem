"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";
import { normalizeSubjectCodeForCompare } from "@/lib/subjects/normalize-subject-code";
import { labHoursFromUnits, lectureHoursFromUnits } from "@/lib/subjects/contact-hours";
import { subjectCodesApi } from "@/lib/api/client";
import type { Subject } from "@/types/db";

function yearLevelHeading(yearLevel: number): string {
  const ordinal =
    yearLevel === 1
      ? "1st"
      : yearLevel === 2
        ? "2nd"
        : yearLevel === 3
          ? "3rd"
          : yearLevel === 4
            ? "4th"
            : yearLevel === 5
              ? "5th"
              : yearLevel === 6
                ? "6th"
                : `${yearLevel}th`;
  return `${ordinal} Year`;
}

function groupSubjectsByYearLevel<T extends { yearLevel?: number | null }>(
  rows: T[],
): { yearLevel: number; label: string; subjects: T[] }[] {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const yl = Number(row.yearLevel) || 0;
    const list = map.get(yl) ?? [];
    list.push(row);
    map.set(yl, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([yearLevel, subjects]) => ({
      yearLevel,
      label: yearLevel > 0 ? yearLevelHeading(yearLevel) : "Unspecified year",
      subjects,
    }));
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
   * GEC Chairman: rows limited to GEC-% / GEE-% codes.
   * @deprecated Superseded by {@link SubjectCodesWorkspaceProps.allProgramsCatalog}; GEC now keeps the
   * whole catalog so its chairman can see how a GEC code sits beside the major subjects of a year.
   */
  gecCurriculumOnly?: boolean;
  /**
   * Campus-wide catalog: every program's subjects in one list, with the department chosen per row
   * instead of through a scope bar. Used by the GEC Chairman, who works across departments.
   */
  allProgramsCatalog?: boolean;
};

export function SubjectCodesWorkspace({
  lockedProgramId = null,
  lockedProgramCode = null,
  scopeProgramId = null,
  scopeProgramCode = null,
  gecCurriculumOnly = false,
  allProgramsCatalog = false,
}: SubjectCodesWorkspaceProps) {
  const scopedProgramId = lockedProgramId ?? scopeProgramId ?? null;
  /** Every program's subjects are listed; new rows pick their department in the form. */
  const campusWide = allProgramsCatalog || gecCurriculumOnly;
  /** Department a new / edited subject belongs to. */
  const [formProgramId, setFormProgramId] = useState("");
  const programId = campusWide ? formProgramId || scopedProgramId : scopedProgramId;

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
      try {
        const { apiFetch } = await import("@/lib/api/client");
        const data = await apiFetch<{ programs: { code: string }[] }>(
          `/api/catalog/programs?programId=${programId}`,
          { method: "GET" },
        );
        if (!cancelled) setResolvedProgramCode(data.programs[0]?.code ?? null);
      } catch { /* ignore */ }
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

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [lecUnits, setLecUnits] = useState("");
  const [labUnits, setLabUnits] = useState("");
  // Hours are stored per subject and stay editable; the unit conversion only
  // prefills them until someone types a value of their own.
  const [lecHours, setLecHours] = useState("");
  const [labHours, setLabHours] = useState("");
  const [lecHoursTouched, setLecHoursTouched] = useState(false);
  const [labHoursTouched, setLabHoursTouched] = useState(false);
  const [yearLevel, setYearLevel] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [programCodeById, setProgramCodeById] = useState<Record<string, string>>({});
  const [programOptions, setProgramOptions] = useState<{ id: string; code: string }[]>([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    // GEC codes are shared across departments, so that list is campus-wide; every other scope is
    // locked to the selected program.
    if (!scopedProgramId && !campusWide) {
      setDbSubjects([]);
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    setError(null);
    setDbSubjects([]);
    try {
      const { apiFetch } = await import("@/lib/api/client");
      const query = campusWide
        ? "limit=1000"
        : `programId=${encodeURIComponent(scopedProgramId as string)}&limit=500`;
      const data = await apiFetch<{ subjects: Subject[] }>(`/api/catalog/subjects?${query}`, {
        method: "GET",
      });
      setDbSubjects(data.subjects);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load subjects");
      setDbSubjects([]);
    }
    setLoadingList(false);
  }, [scopedProgramId, campusWide]);

  /** Program code per id, so a campus-wide list can say which department a subject belongs to. */
  const loadProgramCodes = useCallback(async () => {
    if (!campusWide) {
      setProgramCodeById({});
      return;
    }
    try {
      const { apiFetch } = await import("@/lib/api/client");
      const data = await apiFetch<{ programs: { id: string; code: string }[] }>(
        "/api/catalog/programs",
        { method: "GET" },
      );
      const map: Record<string, string> = {};
      for (const prog of data.programs ?? []) map[prog.id] = prog.code;
      setProgramCodeById(map);
      setProgramOptions(
        [...(data.programs ?? [])].sort((a, b) => a.code.localeCompare(b.code)),
      );
    } catch {
      setProgramCodeById({});
      setProgramOptions([]);
    }
  }, [campusWide]);

  useEffect(() => {
    setEditingId(null);
    setCode("");
    setTitle("");
    setLecUnits("");
    setLabUnits("");
    setLecHours("");
    setLabHours("");
    setLecHoursTouched(false);
    setLabHoursTouched(false);
    setYearLevel("1");
    setSubjectSearch("");
    setSuccess(null);
    void loadSubjects();
    void loadProgramCodes();
  }, [loadSubjects, loadProgramCodes]);

  useEffect(() => {
    if (!pendingDelete) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPendingDelete(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDelete]);

  const filteredDbSubjects = useMemo(() => {
    // GEC keeps the whole catalog now; only the legacy flag still narrows to GEC / GEE codes.
    const base =
      gecCurriculumOnly && !allProgramsCatalog
        ? dbSubjects.filter((s) => isGecCurriculumSubjectCode(s.code))
        : dbSubjects;
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        (programCodeById[s.programId] ?? "").toLowerCase().includes(q),
    );
  }, [dbSubjects, subjectSearch, gecCurriculumOnly, allProgramsCatalog, programCodeById]);

  const dbSubjectsByYear = useMemo(
    () =>
      groupSubjectsByYearLevel(
        [...filteredDbSubjects].sort((a, b) => {
          const ya = Number(a.yearLevel) || 0;
          const yb = Number(b.yearLevel) || 0;
          if (ya !== yb) return ya - yb;
          return a.code.localeCompare(b.code);
        }),
      ),
    [filteredDbSubjects],
  );

  const duplicateLocal = useMemo(() => {
    const n = normalizeSubjectCodeForCompare(code.trim());
    if (!n) return false;
    return dbSubjects.some(
      (s) => normalizeSubjectCodeForCompare(s.code) === n && s.id !== editingId,
    );
  }, [code, dbSubjects, editingId]);

  function resetForm() {
    setEditingId(null);
    setCode("");
    setTitle("");
    setLecUnits("");
    setLabUnits("");
    setLecHours("");
    setLabHours("");
    setLecHoursTouched(false);
    setLabHoursTouched(false);
    setYearLevel("1");
    if (campusWide) setFormProgramId("");
  }

  function startEdit(s: Subject) {
    setEditingId(s.id);
    setCode(s.code);
    setTitle(s.title);
    setLecUnits(String(s.lecUnits ?? ""));
    setLabUnits(String(s.labUnits ?? ""));
    setLecHours(String(s.lecHours ?? ""));
    setLabHours(String(s.labHours ?? ""));
    setLecHoursTouched(true);
    setLabHoursTouched(true);
    setYearLevel(String(s.yearLevel ?? 1));
    if (campusWide) setFormProgramId(s.programId ?? "");
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSaveSubject() {
    setError(null);
    setSuccess(null);
    if (!programId) {
      setError(
        campusWide
          ? "Choose the department this subject belongs to."
          : "Select a program (use the scope bar) before saving a subject.",
      );
      return;
    }
    const trimmedCode = code.trim();
    const trimmedTitle = title.trim();
    if (!trimmedCode || !trimmedTitle) {
      setError("Subject Code and Descriptive Title are required.");
      return;
    }
    if (gecCurriculumOnly && !allProgramsCatalog && !isGecCurriculumSubjectCode(trimmedCode)) {
      setError("GEC Chairman may only add subjects whose codes start with GEC- or GEE- (general education).");
      return;
    }
    if (duplicateLocal) {
      setError("Subject Code already exists.");
      return;
    }

    setSaving(true);
    const lec = parseFloat(lecUnits) || 0;
    const lab = parseFloat(labUnits) || 0;
    const lecHrs = lecHours.trim() === "" ? lectureHoursFromUnits(lec) : parseFloat(lecHours) || 0;
    const labHrs = labHours.trim() === "" ? labHoursFromUnits(lab) : parseFloat(labHours) || 0;
    const payload = {
      code: trimmedCode,
      title: trimmedTitle,
      lecUnits: lec,
      lecHours: lecHrs,
      labUnits: lab,
      labHours: labHrs,
      programId,
      yearLevel: Math.min(6, Math.max(1, parseInt(yearLevel, 10) || 1)),
    };
    try {
      if (editingId) {
        await subjectCodesApi.update(editingId, payload);
        setSuccess("Subject updated.");
      } else {
        await subjectCodesApi.create(payload);
        setSuccess("Subject saved.");
      }
      resetForm();
      void loadSubjects();
    } catch (err: any) {
      const msg = err?.message ?? "Failed to save subject.";
      if (msg.includes("duplicate") || msg.includes("already exists") || msg.includes("23505")) {
        setError("Subject Code already exists.");
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    const s = pendingDelete;
    if (!s) return;
    setError(null);
    setSuccess(null);
    setDeleting(true);
    try {
      await subjectCodesApi.delete(s.id);
      if (editingId === s.id) resetForm();
      setSuccess(`Subject “${s.code}” deleted.`);
      setPendingDelete(null);
      void loadSubjects();
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete subject.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 space-y-6 max-h-[min(78vh,960px)] overflow-y-auto">
      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="text-[16px] font-semibold">{editingId ? "Edit Subject" : "Add Subject"}</div>
          <div className="flex flex-wrap gap-2">
            {editingId ? (
              <Button type="button" variant="outline" disabled={saving} onClick={() => resetForm()}>
                Cancel edit
              </Button>
            ) : null}
            <Button
              type="button"
              className="bg-[#ff990a] text-white hover:bg-[#e68a09]"
              disabled={saving || !programId}
              onClick={() => void onSaveSubject()}
            >
              {saving ? "Saving…" : editingId ? "Update Subject" : "+ Add Subject"}
            </Button>
          </div>
        </div>

        {!programId ? (
          <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {campusWide
              ? "Choose a department above to add or edit a subject. The list below already covers every department."
              : "Select a program first. Subjects load only for the chosen program, grouped by year level."}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</p>
        ) : null}
        {success ? (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">{success}</p>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {campusWide ? (
            <div className="space-y-1">
              <div className="text-sm font-medium">Department (program)</div>
              <select
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                value={formProgramId}
                onChange={(e) => setFormProgramId(e.target.value)}
              >
                <option value="">Select department…</option>
                {programOptions.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.code}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-black/50">Which curriculum this subject belongs to.</p>
            </div>
          ) : null}
          <div className="space-y-1">
            <div className="text-sm font-medium">Subject Code</div>
            <Input placeholder="e.g. CC-111" value={code} onChange={(e) => setCode(e.target.value)} disabled={!programId} />
          </div>
          <div className="space-y-1 lg:col-span-2">
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
              onChange={(e) => {
                const v = e.target.value;
                setLecUnits(v);
                if (!lecHoursTouched) {
                  setLecHours(v === "" ? "" : String(lectureHoursFromUnits(parseFloat(v) || 0)));
                }
              }}
              disabled={!programId}
            />
            <p className="text-[11px] text-black/50">1 unit = 1 hour</p>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Lec Hours</div>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="0"
              value={lecHours}
              onChange={(e) => {
                setLecHoursTouched(true);
                setLecHours(e.target.value);
              }}
              disabled={!programId}
            />
            <p className="text-[11px] text-black/50">Editable — prefilled from units, override as needed.</p>
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
              <option value="5">5</option>
              <option value="6">6</option>
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Lab Units</div>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="0"
              value={labUnits}
              onChange={(e) => {
                const v = e.target.value;
                setLabUnits(v);
                if (!labHoursTouched) {
                  setLabHours(v === "" ? "" : String(labHoursFromUnits(parseFloat(v) || 0)));
                }
              }}
              disabled={!programId}
            />
            <p className="text-[11px] text-black/50">1 unit = 3 hours</p>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Lab Hours</div>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="0"
              value={labHours}
              onChange={(e) => {
                setLabHoursTouched(true);
                setLabHours(e.target.value);
              }}
              disabled={!programId}
            />
            <p className="text-[11px] text-black/50">Editable — prefilled from units, override as needed.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="p-4 border-b border-black/10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[16px] font-semibold">Saved subject codes (database)</div>
            <p className="text-[12px] text-black/55 mt-1">
              {campusWide
                ? "Every department's subjects — grouped by year level, with semester and department per row."
                : scopedProgramId
                  ? "Rows in Supabase for the selected program."
                  : "Select a program to load saved subjects."}
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
                <th className="border border-black/10 px-2 py-2 text-left">Descriptive Title</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lec Units</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lec Hours</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lab Units</th>
                <th className="border border-black/10 px-2 py-2 text-left">Lab Hours</th>
                {campusWide ? (
                  <th className="border border-black/10 px-2 py-2 text-left">Program</th>
                ) : null}
                <th className="border border-black/10 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {!scopedProgramId && !campusWide ? (
                <tr>
                  <td colSpan={campusWide ? 10 : 8} className="border border-black/10 px-2 py-6 text-center text-black/45">
                    Select a program to load subjects for that program.
                  </td>
                </tr>
              ) : filteredDbSubjects.length === 0 ? (
                <tr>
                  <td colSpan={campusWide ? 10 : 8} className="border border-black/10 px-2 py-6 text-center text-black/45">
                    {dbSubjects.length === 0
                      ? "No subjects in the database for this program yet."
                      : "No saved subjects match your search."}
                  </td>
                </tr>
              ) : (
                dbSubjectsByYear.flatMap((group) => [
                  <tr key={`yr-db-${group.yearLevel}`} className="bg-black/[0.04]">
                    <td
                      colSpan={campusWide ? 10 : 8}
                      className="border border-black/10 px-2 py-2 text-[12px] font-bold text-black/80"
                    >
                      {group.label}
                    </td>
                  </tr>,
                  ...group.subjects.map((s) => (
                    <tr key={s.id} className={editingId === s.id ? "bg-amber-50/80" : undefined}>
                      <td className="border border-black/10 px-2 py-2 tabular-nums">{s.yearLevel}</td>
                      <td className="border border-black/10 px-2 py-2 font-semibold">{s.code}</td>
                      <td className="border border-black/10 px-2 py-2">{s.title}</td>
                      <td className="border border-black/10 px-2 py-2">{s.lecUnits}</td>
                      <td className="border border-black/10 px-2 py-2">
                        {s.lecHours ?? lectureHoursFromUnits(s.lecUnits)}
                      </td>
                      <td className="border border-black/10 px-2 py-2">{s.labUnits}</td>
                      <td className="border border-black/10 px-2 py-2">
                        {s.labHours ?? labHoursFromUnits(s.labUnits)}
                      </td>
                      {campusWide ? (
                        <>
                          <td className="border border-black/10 px-2 py-2 tabular-nums">
                            {s.semester ? (s.semester === 1 ? "1st" : "2nd") : "—"}
                          </td>
                          <td className="border border-black/10 px-2 py-2">
                            {programCodeById[s.programId] ?? "—"}
                          </td>
                        </>
                      ) : null}
                      <td className="border border-black/10 px-2 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-[#780301] font-semibold hover:underline mr-3"
                          onClick={() => startEdit(s)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-800 font-semibold hover:underline"
                          onClick={() => setPendingDelete(s)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )),
                ])
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setPendingDelete(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-black/10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-subject-title"
          >
            <h2 id="delete-subject-title" className="text-lg font-semibold text-gray-900 mb-1">
              Delete subject
            </h2>
            <p className="text-sm text-gray-600">
              Delete <span className="font-semibold text-gray-900">{pendingDelete.code}</span>
              {pendingDelete.title ? ` — ${pendingDelete.title}` : ""}? This cannot be undone.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Subjects already used by a schedule entry cannot be deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-700 text-white hover:bg-red-800"
                disabled={deleting}
                onClick={() => void onConfirmDelete()}
              >
                {deleting ? "Deleting…" : "Delete subject"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
