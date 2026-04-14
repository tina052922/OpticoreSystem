"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultAcademicPeriodId, Q } from "@/lib/supabase/catalog-columns";
import { useRouter, useSearchParams } from "next/navigation";
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
import { BSIT_EVALUATOR_TIME_SLOTS } from "@/lib/chairman/bsit-evaluator-constants";
import { scheduleSlotDurationForSubject } from "@/lib/chairman/prospectus-registry";
import {
  GEC_VACANT_INSTRUCTOR_USER_ID,
  isGecCurriculumSubjectCode,
  isGecVacantScheduleEntry,
} from "@/lib/gec/gec-vacant";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import { CAMPUS_WIDE_COLLEGE_SLUG } from "@/lib/evaluator-central-hub";
import { GecHubEvaluatorTabs } from "@/components/gec/GecHubEvaluatorTabs";
import { HrsUnitsPrepsRemarksTable } from "@/components/evaluator/HrsUnitsPrepsRemarksTable";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { prospectusSemesterFromAcademicPeriod } from "@/lib/academic-period-prospectus";
import { getProspectusSubjectsForProgram } from "@/lib/chairman/prospectus-registry";

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
 * 3) Layout (matches College Admin hub): prospectus summary by year level (top) → chairman-style plotting grid
 *    (vacant GEC in light green) → live INS weekly preview (bottom).
 * Vacant GEC placeholders are editable only after one-time `gec_vacant_slots` approval.
 */
export function GecCentralHubEvaluatorClient() {
  const { selectedPeriodId: academicPeriodId, selectedPeriod } = useSemesterFilter();
  const router = useRouter();
  const searchParams = useSearchParams();
  const collegeParam = searchParams.get("college")?.trim() ?? "";
  const panel = searchParams.get("panel") === "hrs" ? "hrs" : "timetabling";
  const isCampusWide = collegeParam === CAMPUS_WIDE_COLLEGE_SLUG;

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
  const [programId, setProgramId] = useState("");
  /** Section scope for the three-panel plotting workspace (summary → grid → preview). */
  const [sectionIdFilter, setSectionIdFilter] = useState("");
  const [edits, setEdits] = useState<Record<string, GecPlotEditPatch>>({});
  const [pickedSummaryCode, setPickedSummaryCode] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [conflictIds, setConflictIds] = useState<Set<string>>(new Set());
  const [conflictSummary, setConflictSummary] = useState<string[]>([]);
  /** Local rows not yet in Supabase — same “Add schedule row” flow as Program Chairman (`BsitChairmanEvaluatorWorksheet`). */
  const [extraEntries, setExtraEntries] = useState<ScheduleEntry[]>([]);
  const skipPeriodEntryFetchRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoadError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    skipPeriodEntryFetchRef.current = true;
    const { data: ap, error: e1 } = await supabase
      .from("AcademicPeriod")
      .select(Q.academicPeriod)
      .order("startDate", { ascending: false });
    if (e1) {
      setLoadError(e1.message);
      setLoading(false);
      return;
    }
    const periodList = (ap ?? []) as AcademicPeriod[];
    const periodId = academicPeriodId || defaultAcademicPeriodId(periodList);
    const schPromise = periodId
      ? supabase.from("ScheduleEntry").select(Q.scheduleEntry).eq("academicPeriodId", periodId)
      : Promise.resolve({ data: [] as ScheduleEntry[], error: null });

    const [
      { data: col, error: e0 },
      { data: prog, error: e2 },
      { data: sec, error: e3 },
      { data: sub, error: e4 },
      { data: rm, error: e5 },
      { data: fac, error: e6 },
      { data: sch, error: e7 },
    ] = await Promise.all([
      supabase.from("College").select(Q.college).order("name"),
      supabase.from("Program").select(Q.program).order("name"),
      supabase.from("Section").select(Q.section).order("name"),
      supabase.from("Subject").select(Q.subject).order("code"),
      supabase.from("Room").select(Q.room).order("code"),
      supabase.from("User").select("id,email,name,role,collegeId,employeeId"),
      schPromise,
    ]);
    const err = e0 || e2 || e3 || e4 || e5 || e6 || e7;
    if (err) {
      setLoadError(err.message);
      setLoading(false);
      return;
    }
    setColleges((col ?? []) as College[]);
    setPeriods(periodList);
    setPrograms((prog ?? []) as Program[]);
    setSections((sec ?? []) as Section[]);
    setSubjects((sub ?? []) as Subject[]);
    setRooms((rm ?? []) as Room[]);
    setUsers((fac ?? []) as User[]);
    setEntries((sch ?? []) as ScheduleEntry[]);
    setLoading(false);
  }, [academicPeriodId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!academicPeriodId) return;
    if (skipPeriodEntryFetchRef.current) {
      skipPeriodEntryFetchRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      const { data, error } = await supabase
        .from("ScheduleEntry")
        .select(Q.scheduleEntry)
        .eq("academicPeriodId", academicPeriodId);
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        return;
      }
      setEntries((data ?? []) as ScheduleEntry[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [academicPeriodId]);

  useEffect(() => {
    setSectionIdFilter("");
  }, [collegeParam]);

  useEffect(() => {
    setEdits({});
    setConflictIds(new Set());
    setConflictSummary([]);
    setSaveMsg(null);
    setPickedSummaryCode(null);
    setExtraEntries([]);
  }, [collegeParam, academicPeriodId, programId, sectionIdFilter]);

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

  const allEntries = useMemo(() => [...entries, ...extraEntries], [entries, extraEntries]);

  const pendingNewEntryIds = useMemo(
    () => new Set(extraEntries.map((e) => e.id)),
    [extraEntries],
  );

  const mergedEntries = useMemo((): ScheduleEntry[] => {
    return allEntries.map((e) => {
      const p = edits[e.id];
      if (!p) return e;
      return { ...e, ...p };
    });
  }, [allEntries, edits]);

  const selectedDbCollege = useMemo(
    () => (collegeParam && !isCampusWide ? colleges.find((c) => c.id === collegeParam) : undefined),
    [colleges, collegeParam, isCampusWide],
  );

  const invalidCollege = Boolean(
    collegeParam && !isCampusWide && !loading && colleges.length > 0 && !selectedDbCollege,
  );

  /** `null` = all colleges (campus-wide), same as College Admin hub. */
  const scopeCollegeIdForRows = useMemo((): string | null => {
    if (!collegeParam || isCampusWide) return null;
    return collegeParam;
  }, [collegeParam, isCampusWide]);

  /** Rows that are vacant GEC placeholders (DB + newly added local rows). */
  const vacantGecSourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of allEntries) {
      if (e.academicPeriodId !== academicPeriodId) continue;
      const sec = sectionById.get(e.sectionId);
      const pr = sec ? programById.get(sec.programId) : null;
      if (!pr) continue;
      if (!isCampusWide) {
        if (!collegeParam || pr.collegeId !== collegeParam) continue;
      }
      if (programId && sec?.programId !== programId) continue;
      if (sectionIdFilter && e.sectionId !== sectionIdFilter) continue;
      if (isGecVacantScheduleEntry(e, subjectById)) ids.add(e.id);
    }
    return ids;
  }, [
    allEntries,
    academicPeriodId,
    collegeParam,
    isCampusWide,
    programId,
    sectionIdFilter,
    sectionById,
    programById,
    subjectById,
  ]);

  const programsInCollege = useMemo(() => {
    if (!collegeParam) return [];
    if (isCampusWide) return programs;
    return programs.filter((p) => p.collegeId === collegeParam);
  }, [programs, collegeParam, isCampusWide]);

  const sectionsForCollegeFiltered = useMemo(() => {
    if (!collegeParam) return [];
    return sections
      .filter((s) => {
        const pr = programById.get(s.programId);
        if (!pr) return false;
        if (!isCampusWide && pr.collegeId !== collegeParam) return false;
        if (programId && s.programId !== programId) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sections, programById, collegeParam, programId, isCampusWide]);

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
    if (!academicPeriodId || !collegeParam) return [];
    return buildScheduleEvaluatorTableRows({
      entries: mergedEntries,
      academicPeriodId,
      scopeCollegeId: scopeCollegeIdForRows,
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
    collegeParam,
    scopeCollegeIdForRows,
    programId,
    sectionById,
    programById,
    subjectById,
    roomById,
    userById,
    collegeNameById,
  ]);

  /** College id for the section being plotted (required for conflict checks vs campus-wide URL). */
  const plotCollegeId = useMemo(() => {
    if (!sectionIdFilter) return null;
    const sec = sectionById.get(sectionIdFilter);
    const pr = sec ? programById.get(sec.programId) : null;
    return pr?.collegeId ?? null;
  }, [sectionIdFilter, sectionById, programById]);

  const instructorsForPlotting = useMemo(() => {
    if (!plotCollegeId) return [];
    return users.filter(
      (u) =>
        u.collegeId === plotCollegeId && (u.role === "instructor" || u.role === "chairman_admin"),
    );
  }, [users, plotCollegeId]);

  const roomsForPlotting = useMemo(() => {
    if (!plotCollegeId) return [];
    return rooms.filter((r) => !r.collegeId || r.collegeId === plotCollegeId);
  }, [rooms, plotCollegeId]);

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
        if (!collegeParam) return false;
        const sec = sectionById.get(e.sectionId);
        const pr = sec ? programById.get(sec.programId) : null;
        if (!pr) return false;
        if (!isCampusWide && pr.collegeId !== collegeParam) return false;
        if (programId && sec?.programId !== programId) return false;
        return true;
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
    if (!canEditVacant || !collegeParam || !academicPeriodId) return;
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
      for (const e of allEntries) {
        if (!vacantGecSourceIds.has(e.id)) continue;
        const merged = { ...e, ...edits[e.id] };
        const isNew = pendingNewEntryIds.has(e.id);
        const patch = edits[e.id];
        const hasPatch = patch && Object.keys(patch).length > 0;
        if (isNew || hasPatch) {
          toSave.push(merged);
        }
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
      setExtraEntries([]);
      await load();
      await reloadAccess();
      dispatchInsCatalogReload();
      setSaveMsg(`Saved ${toSave.length} vacant GEC row(s).`);
      runConflictCheck();

      const sec = sectionIdFilter ? sectionById.get(sectionIdFilter) : undefined;
      if (plotCollegeId && sectionIdFilter) {
        void fetch("/api/gec/schedule-save-notify", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collegeId: plotCollegeId,
            academicPeriodId,
            sectionId: sectionIdFilter,
            sectionName: sec?.name ?? "",
            rowCount: toSave.length,
          }),
        }).catch(() => {});
      }
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

  function removePendingEntry(entryId: string) {
    setExtraEntries((prev) => prev.filter((e) => e.id !== entryId));
    setEdits((prev) => {
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
  }

  function addGecScheduleRow() {
    if (!canEditVacant || !sectionIdFilter || !academicPeriodId || !plotCollegeId) {
      setSaveMsg("Select a section and ensure vacant-slot access is approved before adding rows.");
      return;
    }
    const sec = sectionById.get(sectionIdFilter);
    if (!sec) return;
    const prog = programById.get(sec.programId);
    const programCode = prog?.code ?? "";
    const gecList = subjects
      .filter((s) => s.programId === sec.programId && isGecCurriculumSubjectCode(s.code))
      .sort((a, b) => a.code.localeCompare(b.code));
    const firstSub = gecList[0];
    if (!firstSub) {
      setSaveMsg("No GEC/GEE subjects found for this program. Add curriculum subjects in the database first.");
      return;
    }
    const dur = scheduleSlotDurationForSubject(programCode, firstSub);
    const maxIdx = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
    const startIdx = 0;
    const startSlot = BSIT_EVALUATOR_TIME_SLOTS[startIdx];
    const endSlot = BSIT_EVALUATOR_TIME_SLOTS[startIdx + dur - 1];
    if (!startSlot || !endSlot) return;
    const roomPick = roomsForPlotting[0]?.id ?? "";
    if (!roomPick) {
      setSaveMsg("No room available for this college — add rooms in the database first.");
      return;
    }
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `gec-${Date.now()}-${Math.random()}`;
    const padTime = (t: string) => (t.length <= 5 ? `${t}:00` : t);
    const row: ScheduleEntry = {
      id,
      academicPeriodId,
      subjectId: firstSub.id,
      instructorId: GEC_VACANT_INSTRUCTOR_USER_ID,
      sectionId: sectionIdFilter,
      roomId: roomPick,
      day: "Monday",
      startTime: padTime(startSlot.startTime),
      endTime: padTime(endSlot.endTime),
      status: "draft",
    };
    setExtraEntries((prev) => [...prev, row]);
    setSaveMsg(null);
  }

  /**
   * IMPORTANT (Rules of Hooks): these derived values must be computed before any early returns below.
   * The evaluator has multiple landing/invalid states; keeping hooks unconditional prevents hook order
   * changes when the user navigates between hub → college → section.
   */
  const selectedCollege = isCampusWide ? null : selectedDbCollege;
  const selectedSection = sectionIdFilter ? sectionById.get(sectionIdFilter) : undefined;
  const sectionProgram = selectedSection ? programById.get(selectedSection.programId) : undefined;

  const selectedProspectusSemester = useMemo(
    () => prospectusSemesterFromAcademicPeriod(selectedPeriod),
    [selectedPeriod],
  );

  const selectedYearLevel = useMemo(() => {
    const raw = selectedSection?.name ?? "";
    // Examples: "BSIT 1A", "BSBA 2B", "1A" — we treat the first standalone digit as year level.
    const m = raw.match(/\b([1-5])\b/);
    if (m?.[1]) return parseInt(m[1], 10);
    const m2 = raw.match(/(?:^|\s)([1-5])[A-Z]\b/i);
    if (m2?.[1]) return parseInt(m2[1], 10);
    return null;
  }, [selectedSection?.name]);

  const allowedProspectusCodes = useMemo(() => {
    if (!sectionProgram?.code) return new Set<string>();
    const sem = selectedProspectusSemester;
    const yl = selectedYearLevel;
    if (!sem || !yl) return new Set<string>();
    const rows = getProspectusSubjectsForProgram(sectionProgram.code);
    const set = new Set<string>();
    for (const r of rows) {
      if (r.yearLevel !== yl) continue;
      if (r.semester !== sem) continue;
      if (!isGecCurriculumSubjectCode(r.code)) continue;
      set.add(normalizeProspectusCode(r.code));
    }
    return set;
  }, [sectionProgram?.code, selectedProspectusSemester, selectedYearLevel]);

  const allowedSubjectIds = useMemo(() => {
    if (!selectedSection || allowedProspectusCodes.size === 0) return null;
    const ids = new Set<string>();
    for (const s of subjects) {
      if (s.programId !== selectedSection.programId) continue;
      if (!isGecCurriculumSubjectCode(s.code)) continue;
      if (!allowedProspectusCodes.has(normalizeProspectusCode(s.code))) continue;
      ids.add(s.id);
    }
    return ids;
  }, [subjects, selectedSection, allowedProspectusCodes]);

  if (loadError) {
    return <div className="px-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4 m-4">{loadError}</div>;
  }

  if (invalidCollege) {
    return (
      <div>
        <ChairmanPageHeader title="Central Hub Evaluator" subtitle="Invalid college selection." />
        <div className="px-4 md:px-8 pb-8">
          <Link href="/admin/gec/evaluator" className="text-[13px] font-semibold text-[#780301] hover:underline">
            ← Back to college hub
          </Link>
        </div>
      </div>
    );
  }

  /** Landing: college tiles — same structure as College Admin Central Hub (`CentralHubEvaluatorView`). */
  if (!collegeParam) {
    return (
      <div>
        <ChairmanPageHeader
          title="Central Hub Evaluator"
          subtitle="High-level view of today's academic activity and room usage. GEC edits apply only to vacant GEC slots after College Admin approval."
        />
        <div className="px-4 md:px-8 pb-12 max-w-4xl mx-auto">
          <GecHubEvaluatorTabs collegeParam="" panel="timetabling" />
          <GecVacantSlotsApprovalGate state={approvalState} loading={accessLoading} />
          <p className="text-[14px] text-black/70 mb-8 text-center">
            Campus-wide scope — open the full timetable or select one college, then pick a section to plot GEC subjects
            into highlighted vacant slots.
          </p>
          <div className="mb-4 flex justify-center">
            <Link
              href={`/admin/gec/evaluator?college=${CAMPUS_WIDE_COLLEGE_SLUG}`}
              className="inline-flex items-center justify-center min-h-[56px] rounded-[20px] bg-[#780301] text-white font-bold text-[14px] px-8 py-3 shadow-[0px_4px_4px_rgba(0,0,0,0.15)] hover:brightness-110 transition-[filter]"
            >
              All colleges (campus-wide timetable)
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-black/55 text-center">Loading colleges…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
          <p className="text-[12px] text-black/45 mt-8 text-center">
            Same Campus Intelligence shell and hub pattern as College Admin; major subjects stay locked — only vacant GEC
            rows are editable when approved.
          </p>
        </div>
      </div>
    );
  }

  /** Hours / load tab — mirrors College Admin hub sample panel. */
  if (panel === "hrs") {
    return (
      <div>
        <ChairmanPageHeader
          title="Central Hub Evaluator"
          subtitle="Campus-wide data — narrow by college and department (program)."
        />
        <div className="px-4 md:px-8 pb-8 max-w-[1400px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <Link href="/admin/gec/evaluator" className="text-[13px] font-semibold text-[#780301] hover:underline">
              ← College hub
            </Link>
            <span className="text-[13px] text-black/55">
              Scope:{" "}
              <strong className="text-black/80">
                {isCampusWide ? "All colleges (campus-wide)" : selectedCollege?.name ?? "—"}
              </strong>
            </span>
          </div>
          <GecHubEvaluatorTabs collegeParam={collegeParam} panel="hrs" />
          <HrsUnitsPrepsRemarksTable />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ChairmanPageHeader
        title="Central Hub Evaluator"
        subtitle="Campus-wide data — narrow by college and department (program). Vacant GEC slots are highlighted; plotting matches the Program Chairman worksheet."
      />

      <div className="px-4 md:px-8 pb-10 space-y-5 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/gec/evaluator" className="text-[13px] font-semibold text-[#780301] hover:underline">
            ← College hub
          </Link>
          <span className="text-[13px] text-black/55">
            Scope:{" "}
            <strong className="text-black/80">
              {isCampusWide ? "All colleges (campus-wide)" : selectedCollege?.name ?? "—"}
            </strong>
          </span>
        </div>

        <GecHubEvaluatorTabs collegeParam={collegeParam} panel="timetabling" />

        <GecVacantSlotsApprovalGate state={approvalState} loading={accessLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <label className="block min-w-[200px]">
            <span className="text-[13px] font-semibold text-black/70">College</span>
            <select
              className="mt-1 w-full h-11 rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm"
              value={isCampusWide ? CAMPUS_WIDE_COLLEGE_SLUG : collegeParam}
              onChange={(e) => {
                const v = e.target.value;
                router.replace(`/admin/gec/evaluator?college=${encodeURIComponent(v)}`);
              }}
            >
              <option value={CAMPUS_WIDE_COLLEGE_SLUG}>All colleges (campus-wide)</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-[200px]">
            <span className="text-[13px] font-semibold text-black/70">Department (program)</span>
            <select
              className="mt-1 w-full h-11 rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm"
              value={programId}
              onChange={(e) => {
                setProgramId(e.target.value);
                setSectionIdFilter("");
              }}
            >
              <option value="">All departments</option>
              {programsInCollege.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <p className="text-[12px] text-black/55 max-w-xs self-end pb-2">
            Term is selected in the sidebar / header.
          </p>
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
                  showCollegeColumn={isCampusWide}
                  highlightRowIds={conflictIds}
                  vacantGecRowIds={vacantGecSourceIds}
                  dimNonVacantRows
                />
              </>
            ) : (
              <div className="space-y-6">
                {/* Top: static prospectus for this section’s program (registry in prospectus-registry.ts) */}
                <BsitProspectusSummaryTable
                  programCode={sectionProgram?.code ?? ""}
                  programName={sectionProgram?.name}
                  yearLevel={selectedYearLevel}
                  semester={selectedProspectusSemester}
                  onSelectSubjectCode={setPickedSummaryCode}
                />

                {/* Main plotting grid — same timetabling model as Program Chairman; only vacant GEC rows accept edits. */}
                {plotCollegeId ? (
                  <GecSectionPlottingTable
                    collegeId={plotCollegeId}
                    academicPeriodId={academicPeriodId}
                    sectionId={sectionIdFilter}
                    mergedEntries={mergedEntries}
                    entries={allEntries}
                    subjectById={subjectById}
                    sectionById={sectionById}
                    programById={programById}
                    instructors={instructorsForPlotting}
                    userById={userById}
                    rooms={roomsForPlotting}
                    edits={edits}
                    patchEdit={patchEdit}
                    canEditVacant={canEditVacant}
                    allowedSubjectIds={allowedSubjectIds}
                    pickedSummaryCode={pickedSummaryCode}
                    pickedSubjectId={pickedSubjectId}
                    onAddScheduleRow={addGecScheduleRow}
                    showAddScheduleButton={canEditVacant}
                    pendingNewEntryIds={pendingNewEntryIds}
                    onRemovePendingEntry={removePendingEntry}
                  />
                ) : (
                  <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    Could not resolve this section&apos;s college — check program linkage in the database.
                  </p>
                )}

                {!canEditVacant ? (
                  <p className="text-sm text-black/55">
                    College Admin must approve <strong>gec_vacant_slots</strong> before you can edit the highlighted vacant
                    rows. Overview remains visible for context.
                  </p>
                ) : null}

                {/* Bottom: INS-style schedule preview — reflects merged local edits immediately */}
                <GecSectionSchedulePreview
                  programCode={sectionProgram?.code ?? ""}
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
