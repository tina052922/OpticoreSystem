"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Save } from "lucide-react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { buildScheduleEvaluatorTableRows } from "@/lib/evaluator/schedule-evaluator-table";
import { scanAllScheduleConflicts } from "@/lib/scheduling/conflicts";
import type { ScheduleBlock } from "@/lib/scheduling/types";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import type { AcademicPeriod, College, Program, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";
import { useAccessRequests } from "@/hooks/use-access-requests";
import {
  getGecVacantSlotApprovalUiState,
  hasActiveScopeGrant,
} from "@/components/access/RequestAccessPanel";
import { GecVacantSlotsApprovalGate } from "@/components/access/GecVacantSlotsApprovalGate";
import { EvaluatorScheduleOverviewTable } from "@/components/evaluator/EvaluatorScheduleOverviewTable";
import { BsitProspectusSummaryTable } from "@/components/gec/BsitProspectusSummaryTable";
import { GecSectionPlottingTable, type GecPlotEditPatch } from "@/components/gec/GecSectionPlottingTable";
import { GecSectionSchedulePreview } from "@/components/gec/GecSectionSchedulePreview";
import { isGecCurriculumSubjectCode, isGecVacantScheduleEntry } from "@/lib/gec/gec-vacant";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";

function toBlock(e: ScheduleEntry): ScheduleBlock {
  return {
    id: e.id,
    academicPeriodId: e.academicPeriodId,
    subjectId: e.subjectId,
    instructorId: e.instructorId,
    sectionId: e.sectionId,
    roomId: e.roomId,
    day: e.day,
    startTime: e.startTime.length > 5 ? e.startTime.slice(0, 5) : e.startTime,
    endTime: e.endTime.length > 5 ? e.endTime.slice(0, 5) : e.endTime,
  };
}

/**
 * GEC Chairman Central Hub:
 * 1) College tiles → college workspace.
 * 2) Department + Section — same `ScheduleEntry` data College Admin sees in the hub.
 * 3) Layout: BSIT prospectus summary (top) → chairman-style plotting grid (middle, vacant slots in light green) →
 *    INS weekly preview (bottom), updating live from merged edits.
 * Vacant GEC placeholders are editable only after one-time `gec_vacant_slots` approval.
 */
export function GecCentralHubEvaluatorClient() {
  const searchParams = useSearchParams();
  const collegeIdParam = searchParams.get("college")?.trim() ?? "";

  const { requests, loading: accessLoading, reload: reloadAccess } = useAccessRequests();
  const canEditVacant = hasActiveScopeGrant(requests, "gec_vacant_slots");
  const approvalState = getGecVacantSlotApprovalUiState(requests);

  const [colleges, setColleges] = useState<College[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicPeriodId, setAcademicPeriodId] = useState("");
  const [programId, setProgramId] = useState("");
  /** Section scope for the three-panel plotting workspace (summary → grid → preview). */
  const [sectionIdFilter, setSectionIdFilter] = useState("");
  const [edits, setEdits] = useState<Record<string, GecPlotEditPatch>>({});
  const [pickedSummaryCode, setPickedSummaryCode] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [conflictIds, setConflictIds] = useState<Set<string>>(new Set());
  const [conflictSummary, setConflictSummary] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoadError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    const [
      { data: col, error: e0 },
      { data: ap, error: e1 },
      { data: prog, error: e2 },
      { data: sec, error: e3 },
      { data: sub, error: e4 },
      { data: rm, error: e5 },
      { data: fac, error: e6 },
      { data: sch, error: e7 },
    ] = await Promise.all([
      supabase.from("College").select("*").order("name"),
      supabase.from("AcademicPeriod").select("*").order("startDate", { ascending: false }),
      supabase.from("Program").select("*").order("name"),
      supabase.from("Section").select("*").order("name"),
      supabase.from("Subject").select("*").order("code"),
      supabase.from("Room").select("*").order("code"),
      supabase.from("User").select("id,email,name,role,collegeId,employeeId"),
      supabase.from("ScheduleEntry").select("*"),
    ]);
    const err = e0 || e1 || e2 || e3 || e4 || e5 || e6 || e7;
    if (err) {
      setLoadError(err.message);
      setLoading(false);
      return;
    }
    setColleges((col ?? []) as College[]);
    setPeriods((ap ?? []) as AcademicPeriod[]);
    setPrograms((prog ?? []) as Program[]);
    setSections((sec ?? []) as Section[]);
    setSubjects((sub ?? []) as Subject[]);
    setRooms((rm ?? []) as Room[]);
    setUsers((fac ?? []) as User[]);
    setEntries((sch ?? []) as ScheduleEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (periods.length === 0 || academicPeriodId) return;
    const cur = periods.find((x) => x.isCurrent) ?? periods[0];
    if (cur) setAcademicPeriodId(cur.id);
  }, [periods, academicPeriodId]);

  useEffect(() => {
    setSectionIdFilter("");
  }, [collegeIdParam]);

  useEffect(() => {
    setEdits({});
    setConflictIds(new Set());
    setConflictSummary([]);
    setSaveMsg(null);
    setPickedSummaryCode(null);
  }, [collegeIdParam, academicPeriodId, programId, sectionIdFilter]);

  const subjectById = useMemo(() => {
    const m = new Map<string, Subject>();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  const sectionById = useMemo(() => {
    const m = new Map<string, Section>();
    sections.forEach((s) => m.set(s.id, s));
    return m;
  }, [sections]);

  const programById = useMemo(() => {
    const m = new Map<string, Program>();
    programs.forEach((p) => m.set(p.id, p));
    return m;
  }, [programs]);

  const roomById = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach((r) => m.set(r.id, r));
    return m;
  }, [rooms]);

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const collegeNameById = useMemo(() => {
    const m = new Map<string, string>();
    colleges.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [colleges]);

  const mergedEntries = useMemo((): ScheduleEntry[] => {
    return entries.map((e) => {
      const p = edits[e.id];
      if (!p) return e;
      return { ...e, ...p };
    });
  }, [entries, edits]);

  /** Original DB rows that are vacant GEC placeholders in scope (eligible for chairman-style plotting). */
  const vacantGecSourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      if (e.academicPeriodId !== academicPeriodId) continue;
      const sec = sectionById.get(e.sectionId);
      const pr = sec ? programById.get(sec.programId) : null;
      if (!collegeIdParam || !pr || pr.collegeId !== collegeIdParam) continue;
      if (programId && sec?.programId !== programId) continue;
      if (sectionIdFilter && e.sectionId !== sectionIdFilter) continue;
      if (isGecVacantScheduleEntry(e, subjectById)) ids.add(e.id);
    }
    return ids;
  }, [
    entries,
    academicPeriodId,
    collegeIdParam,
    programId,
    sectionIdFilter,
    sectionById,
    programById,
    subjectById,
  ]);

  const programsInCollege = useMemo(() => {
    if (!collegeIdParam) return [];
    return programs.filter((p) => p.collegeId === collegeIdParam);
  }, [programs, collegeIdParam]);

  const sectionsForCollegeFiltered = useMemo(() => {
    if (!collegeIdParam) return [];
    return sections
      .filter((s) => {
        const pr = programById.get(s.programId);
        if (!pr || pr.collegeId !== collegeIdParam) return false;
        if (programId && s.programId !== programId) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sections, programById, collegeIdParam, programId]);

  useEffect(() => {
    if (!sectionIdFilter) return;
    const s = sectionById.get(sectionIdFilter);
    if (!s) {
      setSectionIdFilter("");
      return;
    }
    if (programId && s.programId !== programId) setSectionIdFilter("");
  }, [programId, sectionIdFilter, sectionById]);

  const pickedSubjectId = useMemo(() => {
    if (!pickedSummaryCode || !sectionIdFilter) return null;
    const sec = sectionById.get(sectionIdFilter);
    if (!sec) return null;
    const n = normalizeProspectusCode(pickedSummaryCode);
    const sub = subjects.find(
      (s) =>
        s.programId === sec.programId &&
        normalizeProspectusCode(s.code) === n &&
        isGecCurriculumSubjectCode(s.code),
    );
    return sub?.id ?? null;
  }, [pickedSummaryCode, sectionIdFilter, sectionById, subjects]);

  const tableRows = useMemo(() => {
    if (!academicPeriodId || !collegeIdParam) return [];
    return buildScheduleEvaluatorTableRows({
      entries: mergedEntries,
      academicPeriodId,
      scopeCollegeId: collegeIdParam,
      programId,
      sectionById,
      programById,
      subjectById,
      roomById,
      userById,
      collegeNameById,
    });
  }, [
    mergedEntries,
    academicPeriodId,
    collegeIdParam,
    programId,
    sectionById,
    programById,
    subjectById,
    roomById,
    userById,
    collegeNameById,
  ]);

  const instructorsForCollege = useMemo(
    () =>
      users.filter(
        (u) => u.collegeId === collegeIdParam && (u.role === "instructor" || u.role === "chairman_admin"),
      ),
    [users, collegeIdParam],
  );

  const roomsForCollegeList = useMemo(
    () => rooms.filter((r) => !r.collegeId || r.collegeId === collegeIdParam),
    [rooms, collegeIdParam],
  );

  function patchEdit(entryId: string, patch: GecPlotEditPatch) {
    setEdits((prev) => ({
      ...prev,
      [entryId]: { ...prev[entryId], ...patch },
    }));
  }

  function runConflictCheck() {
    const blocks = mergedEntries
      .filter((e) => {
        if (e.academicPeriodId !== academicPeriodId) return false;
        if (!collegeIdParam) return false;
        const sec = sectionById.get(e.sectionId);
        const pr = sec ? programById.get(sec.programId) : null;
        return pr?.collegeId === collegeIdParam;
      })
      .map(toBlock);
    const scan = scanAllScheduleConflicts(blocks);
    setConflictIds(scan.conflictingEntryIds);
    setConflictSummary(scan.issueSummaries);
    if (scan.issueSummaries.length === 0) {
      setSaveMsg("No faculty, room, or section time conflicts detected for the current term.");
    } else {
      setSaveMsg(null);
    }
  }

  async function saveVacantEdits() {
    if (!canEditVacant || !collegeIdParam || !academicPeriodId) return;
    setSaveBusy(true);
    setSaveMsg(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setSaveMsg("Supabase not configured.");
      setSaveBusy(false);
      return;
    }
    try {
      const toSave: ScheduleEntry[] = [];
      for (const e of entries) {
        if (!vacantGecSourceIds.has(e.id)) continue;
        const patch = edits[e.id];
        if (!patch || Object.keys(patch).length === 0) continue;
        toSave.push({ ...e, ...patch });
      }
      if (toSave.length === 0) {
        setSaveMsg("No vacant GEC edits to save.");
        return;
      }
      const { error } = await supabase.from("ScheduleEntry").upsert(toSave, { onConflict: "id" });
      if (error) {
        setSaveMsg(error.message);
        return;
      }
      setEdits({});
      await load();
      await reloadAccess();
      dispatchInsCatalogReload();
      setSaveMsg(`Saved ${toSave.length} vacant GEC row(s).`);
      runConflictCheck();
    } finally {
      setSaveBusy(false);
    }
  }

  function onSectionSelect(id: string) {
    setSectionIdFilter(id);
    if (!id) return;
    const s = sectionById.get(id);
    if (s) setProgramId(s.programId);
  }

  if (loadError) {
    return <div className="px-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4 m-4">{loadError}</div>;
  }

  if (!collegeIdParam) {
    return (
      <div>
        <ChairmanPageHeader
          title="Central Hub Evaluator (GEC)"
          subtitle="Select a college to view its full schedule. Only vacant GEC slots can be edited after College Admin approves your access."
        />
        <div className="px-4 md:px-8 pb-12 max-w-5xl mx-auto space-y-6">
          <GecVacantSlotsApprovalGate state={approvalState} loading={accessLoading} />

          {loading ? (
            <p className="text-sm text-black/55">Loading colleges…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {colleges.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/gec/evaluator?college=${encodeURIComponent(c.id)}`}
                  className="flex items-center justify-center min-h-[72px] rounded-[20px] bg-[#ff990a] text-white font-bold text-[15px] text-center px-6 py-5 shadow-[0px_4px_4px_rgba(0,0,0,0.15)] hover:brightness-105 transition-[filter]"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedCollege = colleges.find((c) => c.id === collegeIdParam);
  const selectedSection = sectionIdFilter ? sectionById.get(sectionIdFilter) : undefined;

  return (
    <div>
      <ChairmanPageHeader
        title="Central Hub Evaluator (GEC)"
        subtitle={
          selectedCollege
            ? `${selectedCollege.name} — same ScheduleEntry hub as College Admin; vacant GEC slots plot like Program Chairman after approval.`
            : "College schedule"
        }
      />

      <div className="px-4 md:px-8 pb-10 space-y-5 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/gec/evaluator" className="text-[13px] font-semibold text-[#780301] hover:underline">
            ← All colleges
          </Link>
        </div>

        <GecVacantSlotsApprovalGate state={approvalState} loading={accessLoading} />

        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-[13px] font-semibold text-black/70">
            Term
            <select
              className="ml-2 h-11 rounded-lg border border-black/25 bg-white px-3 text-sm block mt-1"
              value={academicPeriodId}
              onChange={(e) => setAcademicPeriodId(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-semibold text-black/70">
            Department (program)
            <select
              className="ml-2 h-11 rounded-lg border border-black/25 bg-white px-3 text-sm block mt-1 min-w-[200px]"
              value={programId}
              onChange={(e) => {
                setProgramId(e.target.value);
                setSectionIdFilter("");
              }}
            >
              <option value="">All programs</option>
              {programsInCollege.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-semibold text-black/70">
            Section
            <select
              className="ml-2 h-11 rounded-lg border border-black/25 bg-white px-3 text-sm block mt-1 min-w-[220px]"
              value={sectionIdFilter}
              onChange={(e) => onSectionSelect(e.target.value)}
            >
              <option value="">Select section for plotting workspace…</option>
              {sectionsForCollegeFiltered.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold h-11 px-5"
            disabled={loading}
            onClick={() => runConflictCheck()}
          >
            <AlertTriangle className="w-4 h-4 mr-2 inline" aria-hidden />
            Run conflict check
          </Button>
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white font-bold h-11 px-5 disabled:opacity-50"
            disabled={saveBusy || !canEditVacant}
            onClick={() => void saveVacantEdits()}
          >
            <Save className="w-4 h-4 mr-2 inline" aria-hidden />
            {saveBusy ? "Saving…" : "Save vacant GEC edits"}
          </Button>
        </div>

        {conflictSummary.length > 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <strong>Conflicts ({conflictSummary.length} type(s)):</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {conflictSummary.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {saveMsg ? (
          <div
            className={`rounded-lg border px-4 py-2 text-sm ${
              saveMsg.startsWith("Saved") || saveMsg.startsWith("No ")
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-950"
            }`}
          >
            {saveMsg}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-black/55 py-8">Loading…</p>
        ) : (
          <>
            {!sectionIdFilter ? (
              <>
                <p className="text-[12px] text-black/60">
                  Pick a <strong>section</strong> to open the workspace: prospectus summary (top), chairman-style grid
                  with <span className="text-emerald-800 font-semibold">light-green vacant GEC</span> rows (middle),
                  and live INS weekly preview (bottom). Below is the college-wide overview until a section is selected.
                </p>
                <EvaluatorScheduleOverviewTable
                  rows={tableRows}
                  highlightRowIds={conflictIds}
                  vacantGecRowIds={vacantGecSourceIds}
                  dimNonVacantRows
                />
              </>
            ) : (
              <div className="space-y-6">
                {/* Top: predefined BSIT prospectus summary */}
                <BsitProspectusSummaryTable onSelectSubjectCode={setPickedSummaryCode} />

                {/* Middle: main plotting grid (Chairman-like; vacant slots highlighted) */}
                <GecSectionPlottingTable
                  collegeId={collegeIdParam}
                  academicPeriodId={academicPeriodId}
                  sectionId={sectionIdFilter}
                  mergedEntries={mergedEntries}
                  entries={entries}
                  subjectById={subjectById}
                  sectionById={sectionById}
                  programById={programById}
                  instructors={instructorsForCollege}
                  userById={userById}
                  rooms={roomsForCollegeList}
                  edits={edits}
                  patchEdit={patchEdit}
                  canEditVacant={canEditVacant}
                  pickedSummaryCode={pickedSummaryCode}
                  pickedSubjectId={pickedSubjectId}
                />

                {!canEditVacant ? (
                  <p className="text-sm text-black/55">
                    College Admin must approve <strong>gec_vacant_slots</strong> before you can edit the highlighted vacant
                    rows. Overview remains visible for context.
                  </p>
                ) : null}

                {/* Bottom: INS-style schedule preview — reflects merged local edits immediately */}
                <GecSectionSchedulePreview
                  entries={mergedEntries}
                  academicPeriodId={academicPeriodId}
                  sectionId={sectionIdFilter}
                  sectionName={selectedSection?.name ?? sectionIdFilter}
                  subjectById={subjectById}
                  roomById={roomById}
                  userById={userById}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
