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
import { scanAllSparseScheduleConflicts, scheduleEntryToSparseBlock } from "@/lib/scheduling/conflicts";
import type { GASuggestion, ScheduleBlock } from "@/lib/scheduling/types";
import { enrichCampusConflictIssues, type EnrichedCampusIssue } from "@/lib/scheduling/conflict-enrichment";
import { runRuleBasedGeneticAlgorithm } from "@/lib/scheduling/ruleBasedGA";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import type {
  AcademicPeriod,
  College,
  FacultyProfile,
  Program,
  Room,
  ScheduleEntry,
  Section,
  Subject,
  User,
} from "@/types/db";
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
import { useScheduleEntryCrossReload } from "@/hooks/use-schedule-entry-cross-reload";
import { CAMPUS_WIDE_COLLEGE_SLUG } from "@/lib/evaluator-central-hub";
import { GecHubEvaluatorTabs } from "@/components/gec/GecHubEvaluatorTabs";
import { HrsUnitsPrepsRemarksTable } from "@/components/evaluator/HrsUnitsPrepsRemarksTable";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { prospectusSemesterFromAcademicPeriod } from "@/lib/academic-period-prospectus";
import { getProspectusSubjectsForProgram } from "@/lib/chairman/prospectus-registry";
import { parseGecYearLevelFromSectionName } from "@/lib/gec/gec-section-year-level";
import {
  mergeLegacyRowInstructorsIntoPlotOptions,
  usersToInstructorPlotOptions,
  formatUserInstructorLabel,
} from "@/lib/evaluator/instructor-employee-id";
import { EnrichedConflictIssuesPanel } from "@/components/campus-intelligence/EnrichedConflictIssuesPanel";
import { formatGaSuggestionShortLabel } from "@/lib/scheduling/conflict-suggestion-label";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";

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
  const toast = useOpticoreToast();
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
  const [facultyProfiles, setFacultyProfiles] = useState<FacultyProfile[]>([]);
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
  /** DOI-style enriched pairwise issues + GA alternatives (same engine as Central Hub / VPAA panel). */
  const [gecEnrichedConflicts, setGecEnrichedConflicts] = useState<EnrichedCampusIssue[]>([]);
  const [gecGaByIssueKey, setGecGaByIssueKey] = useState<Record<string, GASuggestion[]>>({});
  /** Local rows not yet in Supabase — same “Add schedule row” flow as Program Chairman (`BsitChairmanEvaluatorWorksheet`). */
  const [extraEntries, setExtraEntries] = useState<ScheduleEntry[]>([]);
  const skipPeriodEntryFetchRef = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutosaveToastAtRef = useRef<number>(0);

  const draftKey = useMemo(() => {
    if (!academicPeriodId || !collegeParam) return "";
    return `opticore:gec-vacant-draft:v1:${academicPeriodId}:${collegeParam}:${sectionIdFilter || "all"}`;
  }, [academicPeriodId, collegeParam, sectionIdFilter]);

  /** Local backup: survive tab crash / power loss. */
  useEffect(() => {
    if (!draftKey) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          version: 1,
          updatedAt: new Date().toISOString(),
          edits,
          extraEntries,
        }),
      );
    } catch {
      /* ignore quota */
    }
  }, [draftKey, edits, extraEntries]);

  /** Recovery: restore local draft for the current scope (best-effort, non-blocking). */
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const v = JSON.parse(raw) as { version: number; edits?: Record<string, GecPlotEditPatch>; extraEntries?: ScheduleEntry[] };
      if (v?.version !== 1) return;
      const hasEdits = v.edits && Object.keys(v.edits).length > 0;
      const hasExtra = Array.isArray(v.extraEntries) && v.extraEntries.length > 0;
      if (hasEdits && Object.keys(edits).length === 0) setEdits(v.edits ?? {});
      if (hasExtra && extraEntries.length === 0) setExtraEntries(v.extraEntries ?? []);
      if (hasEdits || hasExtra) {
        toast.info("Recovered unsaved draft", "Restored your last local backup after an interruption.");
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

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

    /**
     * Performance: GEC hub normally works within one college tile. When not campus-wide, scope the heavy
     * catalog tables (program/section/subject/room/user) to the selected college.
     */
    /** In this hub, `college` query param stores the DB `College.id` (or "all"). */
    const tileCollegeId = isCampusWide ? null : (collegeParam?.trim() || null);
    let programIdsForScope: string[] | null = null;
    let prePrograms: Program[] | null = null;
    if (tileCollegeId) {
      const { data: pr, error: ep } = await supabase
        .from("Program")
        .select(Q.program)
        .eq("collegeId", tileCollegeId)
        .order("name");
      if (ep) {
        setLoadError(ep.message);
        setLoading(false);
        return;
      }
      prePrograms = (pr ?? []) as Program[];
      programIdsForScope = prePrograms.map((p) => p.id);
    }

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
      tileCollegeId ? Promise.resolve({ data: prePrograms ?? ([] as Program[]), error: null }) : supabase.from("Program").select(Q.program).order("name"),
      tileCollegeId && programIdsForScope && programIdsForScope.length > 0
        ? supabase.from("Section").select(Q.section).in("programId", programIdsForScope).order("name")
        : supabase.from("Section").select(Q.section).order("name"),
      tileCollegeId && programIdsForScope && programIdsForScope.length > 0
        ? supabase.from("Subject").select(Q.subject).in("programId", programIdsForScope).order("code")
        : supabase.from("Subject").select(Q.subject).order("code"),
      tileCollegeId
        ? supabase.from("Room").select(Q.room).or(`collegeId.eq.${tileCollegeId},collegeId.is.null`).order("code")
        : supabase.from("Room").select(Q.room).order("code"),
      tileCollegeId
        ? supabase
            .from("User")
            .select("id,email,name,role,collegeId,employeeId")
            .or(`collegeId.eq.${tileCollegeId},collegeId.is.null`)
        : supabase.from("User").select("id,email,name,role,collegeId,employeeId"),
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
    const allUsers = (fac ?? []) as User[];
    setUsers(allUsers);
    const profileCandidateIds = allUsers
      .filter((u) => u.role === "instructor" || u.role === "chairman_admin")
      .map((u) => u.id);
    const { data: fpRows, error: efp } =
      profileCandidateIds.length > 0
        ? await supabase.from("FacultyProfile").select(Q.facultyProfilePolicy).in("userId", profileCandidateIds)
        : { data: [] as FacultyProfile[], error: null };
    if (efp) {
      setLoadError(efp.message);
      setLoading(false);
      return;
    }
    setFacultyProfiles((fpRows ?? []) as FacultyProfile[]);
    setEntries((sch ?? []) as ScheduleEntry[]);
    setLoading(false);
  }, [academicPeriodId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Program Chairman / hub saves + Realtime: reload should be lightweight (term `ScheduleEntry` only),
   * not a full catalog refresh (which is expensive and causes UI lag on frequent saves).
   */
  const reloadScheduleEntriesSoft = useCallback(async () => {
    if (!academicPeriodId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { data, error } = await supabase.from("ScheduleEntry").select(Q.scheduleEntry).eq("academicPeriodId", academicPeriodId);
    if (error) return;
    setEntries((data ?? []) as ScheduleEntry[]);
  }, [academicPeriodId]);

  /** Program Chairman / hub saves + Realtime: GEC grid & previews stay aligned with INS campus-wide. */
  useScheduleEntryCrossReload(reloadScheduleEntriesSoft, { academicPeriodId, enabled: Boolean(academicPeriodId) });

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
    setGecEnrichedConflicts([]);
    setGecGaByIssueKey({});
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

  const facultyProfileByUserId = useMemo(() => {
    const m = new Map<string, FacultyProfile>();
    facultyProfiles.forEach((p) => m.set(p.userId, p));
    return m;
  }, [facultyProfiles]);

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

  /** Autosave (Supabase draft upsert) — debounced and lightweight. */
  useEffect(() => {
    if (!canEditVacant || !academicPeriodId || !collegeParam) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void (async () => {
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;
        const supabase = createSupabaseBrowserClient();
        if (!supabase) return;
        const toSave: ScheduleEntry[] = [];
        for (const e of [...entries, ...extraEntries]) {
          if (!vacantGecSourceIds.has(e.id)) continue;
          const patch = edits[e.id];
          const isNew = pendingNewEntryIds.has(e.id);
          const hasPatch = patch && Object.keys(patch).length > 0;
          if (!isNew && !hasPatch) continue;
          toSave.push({ ...e, ...patch });
        }
        if (toSave.length === 0) return;
        const { error } = await supabase.from("ScheduleEntry").upsert(toSave, { onConflict: "id" });
        if (error) return;
        const now = Date.now();
        if (now - lastAutosaveToastAtRef.current > 30_000) {
          lastAutosaveToastAtRef.current = now;
          toast.success("Draft saved automatically");
        }
      })();
    }, 9000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    canEditVacant,
    academicPeriodId,
    collegeParam,
    edits,
    extraEntries,
    entries,
    vacantGecSourceIds,
    pendingNewEntryIds,
    toast,
  ]);

  /** Connection restore: flush autosave once immediately (don’t wait for the 9s debounce). */
  useEffect(() => {
    const onOnline = () => {
      if (!canEditVacant || !academicPeriodId || !collegeParam) return;
      if (Object.keys(edits).length === 0 && extraEntries.length === 0) return;
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      /** Trigger the same autosave effect quickly by scheduling at 0ms. */
      autosaveTimerRef.current = setTimeout(() => {
        autosaveTimerRef.current = null;
        void (async () => {
          const supabase = createSupabaseBrowserClient();
          if (!supabase) return;
          const toSave: ScheduleEntry[] = [];
          for (const e of [...entries, ...extraEntries]) {
            if (!vacantGecSourceIds.has(e.id)) continue;
            const patch = edits[e.id];
            const isNew = pendingNewEntryIds.has(e.id);
            const hasPatch = patch && Object.keys(patch).length > 0;
            if (!isNew && !hasPatch) continue;
            toSave.push({ ...e, ...patch });
          }
          if (toSave.length === 0) return;
          const { error } = await supabase.from("ScheduleEntry").upsert(toSave, { onConflict: "id" });
          if (error) return;
          toast.success("Draft saved automatically");
        })();
      }, 0);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [
    canEditVacant,
    academicPeriodId,
    collegeParam,
    edits,
    extraEntries,
    entries,
    vacantGecSourceIds,
    pendingNewEntryIds,
    toast,
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
      facultyProfileByUserId,
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
    facultyProfileByUserId,
    collegeNameById,
  ]);

  /** College id for the section being plotted (required for conflict checks vs campus-wide URL). */
  const plotCollegeId = useMemo(() => {
    if (!sectionIdFilter) return null;
    const sec = sectionById.get(sectionIdFilter);
    const pr = sec ? programById.get(sec.programId) : null;
    return pr?.collegeId ?? null;
  }, [sectionIdFilter, sectionById, programById]);

  const entryInstructorIdsForPlotMerge = useMemo(
    () => mergedEntries.map((e) => e.instructorId).filter(Boolean) as string[],
    [mergedEntries],
  );

  const instructorPlotOptionsBase = useMemo(() => {
    if (!plotCollegeId) return [];
    const pool = users.filter(
      (u) => u.collegeId === plotCollegeId && (u.role === "instructor" || u.role === "chairman_admin"),
    );
    const base = usersToInstructorPlotOptions(pool, facultyProfileByUserId);
    return mergeLegacyRowInstructorsIntoPlotOptions(
      base,
      pool,
      entryInstructorIdsForPlotMerge,
      facultyProfileByUserId,
    );
  }, [users, plotCollegeId, entryInstructorIdsForPlotMerge, facultyProfileByUserId]);

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

  /** Apply a GA suggestion to a vacant GEC row only (major rows stay locked). */
  function applyGecGaSuggestion(entryId: string, s: GASuggestion) {
    if (!vacantGecSourceIds.has(entryId)) return;
    const pad = (t: string) => (t.trim().length <= 5 ? `${t.trim()}:00` : t.trim());
    patchEdit(entryId, {
      day: s.day,
      startTime: pad(s.startTime),
      endTime: pad(s.endTime),
      roomId: s.roomId,
      instructorId: s.instructorId,
    });
  }

  /**
   * Campus-wide for the selected term: every `ScheduleEntry` row (all colleges/programs — majors + GEC),
   * so conflicts are detected against the real master timetable, not a single department filter.
   */
  function runConflictCheck() {
    if (!academicPeriodId) return;
    const sparseBlocks = mergedEntries
      .filter((e) => e.academicPeriodId === academicPeriodId)
      .map((e) => scheduleEntryToSparseBlock(e))
      .filter((b): b is NonNullable<typeof b> => b != null);
    const scan = scanAllSparseScheduleConflicts(sparseBlocks);
    setConflictIds(scan.conflictingEntryIds);
    setConflictSummary(scan.issueSummaries);

    const entryById = new Map(mergedEntries.map((e) => [e.id, e]));
    const enriched = enrichCampusConflictIssues(
      scan.issues,
      entryById,
      subjectById,
      sectionById,
      roomById,
      userById,
      programById,
      collegeNameById,
    );
    setGecEnrichedConflicts(enriched);

    const universe = mergedEntries.filter((e) => e.academicPeriodId === academicPeriodId).map(toBlock);
    const gaMap: Record<string, GASuggestion[]> = {};
    /** Search all rooms and all teaching staff campus-wide so suggestions can move across programs when needed. */
    const roomIds = rooms.map((r) => r.id);
    const instructorIds = users
      .filter((u) => u.role === "instructor" || u.role === "chairman_admin")
      .map((u) => u.id);
    for (const iss of enriched.slice(0, 3)) {
      const entry = mergedEntries.find((e) => e.id === iss.rowA.entryId);
      if (!entry) continue;
      if (roomIds.length === 0 || instructorIds.length === 0) continue;
      const sug = runRuleBasedGeneticAlgorithm({
        universe,
        sectionId: entry.sectionId,
        subjectId: entry.subjectId,
        academicPeriodId: entry.academicPeriodId,
        excludeEntryId: entry.id,
        roomIds,
        instructorIds,
        generations: 16,
        populationSize: 24,
      });
      gaMap[iss.key] = sug.slice(0, 5);
    }
    setGecGaByIssueKey(gaMap);

    if (scan.issueSummaries.length === 0) {
      setSaveMsg("No conflicts detected — faculty, room, and section times are clear for this term.");
      setGecEnrichedConflicts([]);
      setGecGaByIssueKey({});
      toast.success("No conflicts detected");
    } else {
      setSaveMsg(null);
      toast.info("Conflicts found – see details below", `${scan.issueSummaries.length} issue(s) detected.`);
    }
  }

  /** Campus Intelligence dashboard → Central Hub Evaluator with ?conflicts=1: auto-run the same scan + row highlights. */
  const runConflictCheckRef = useRef(runConflictCheck);
  runConflictCheckRef.current = runConflictCheck;
  const gecConflictDeepLinkKey = useRef<string | null>(null);
  useEffect(() => {
    if (searchParams.get("conflicts") !== "1" || loading || !academicPeriodId) return;
    const k = `${academicPeriodId}:${searchParams.toString()}`;
    if (gecConflictDeepLinkKey.current === k) return;
    runConflictCheckRef.current();
    gecConflictDeepLinkKey.current = k;
  }, [searchParams, loading, academicPeriodId, mergedEntries.length]);

  useEffect(() => {
    const id = searchParams.get("focusEntry")?.trim();
    if (!id || loading) return;
    requestAnimationFrame(() => {
      document.getElementById(`gec-hub-eval-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [searchParams, loading, conflictIds]);

  async function saveVacantEdits() {
    if (!canEditVacant || !collegeParam || !academicPeriodId) return;
    setSaveBusy(true);
    setSaveMsg(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setSaveMsg("Supabase not configured.");
      toast.error("Failed to save. Please try again.", "Supabase is not configured.");
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
        toast.info("No changes to save");
        return;
      }
      const { error } = await supabase.from("ScheduleEntry").upsert(toSave, { onConflict: "id" });
      if (error) {
        setSaveMsg(error.message);
        toast.error("Failed to save. Please try again.", error.message);
        return;
      }
      setEdits({});
      setExtraEntries([]);
      const secForAudit = sectionIdFilter ? sectionById.get(sectionIdFilter) : undefined;
      const auditRows = toSave.map((r) => {
        const sub = subjectById.get(r.subjectId);
        const sec = sectionById.get(r.sectionId);
        return {
          subjectCode: sub?.code ?? "—",
          sectionName: sec?.name ?? "",
          day: r.day,
          startTime: r.startTime,
          endTime: r.endTime,
        };
      });
      /** Same-tab + other evaluator shells: notify immediately so INS/evaluators start refetch without waiting on Realtime. */
      dispatchInsCatalogReload();
      void fetch("/api/audit/schedule-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "gec.vacant_slot_save",
          collegeId: plotCollegeId,
          academicPeriodId,
          details: {
            rowCount: toSave.length,
            sectionId: sectionIdFilter || null,
            sectionName: secForAudit?.name ?? "",
            entryIds: toSave.map((r) => r.id),
            rows: auditRows,
          },
        }),
      });
      await load();
      await reloadAccess();
      /** Second pulse after local state matches DB so any listener that batched with the first event still picks up the same commit. */
      dispatchInsCatalogReload();
      router.refresh();
      setSaveMsg(`Saved ${toSave.length} vacant GEC row(s).`);
      toast.success("Vacant slots updated successfully");
      runConflictCheck();

      const sec = secForAudit;
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
      .filter((s) => !allowedSubjectIds || allowedSubjectIds.size === 0 || allowedSubjectIds.has(s.id))
      .sort((a, b) => a.code.localeCompare(b.code));
    const firstSub = gecList[0];
    if (!firstSub) {
      setSaveMsg(
        "No GEC subjects for this section’s year level and term (check section code e.g. 3A) or add subjects in the database.",
      );
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

  const selectedYearLevel = useMemo(() => {
    const raw = selectedSection?.name ?? "";
    return parseGecYearLevelFromSectionName(raw);
  }, [selectedSection?.name]);

  /** GEC dropdown + summary: prospectus rows for this section’s year only (e.g. BSIT 3A → year 3), all GEC codes in that year. */
  const allowedProspectusCodes = useMemo(() => {
    if (!sectionProgram?.code) return new Set<string>();
    const yl = selectedYearLevel;
    if (!yl) return new Set<string>();
    const rows = getProspectusSubjectsForProgram(sectionProgram.code);
    const set = new Set<string>();
    for (const r of rows) {
      if (r.yearLevel !== yl) continue;
      if (!isGecCurriculumSubjectCode(r.code)) continue;
      set.add(normalizeProspectusCode(r.code));
    }
    return set;
  }, [sectionProgram?.code, selectedYearLevel]);

  /** Empty set = section selected but no matching curriculum codes; null = no section. */
  const allowedSubjectIds = useMemo(() => {
    if (!selectedSection) return null;
    if (allowedProspectusCodes.size === 0) return new Set<string>();
    const ids = new Set<string>();
    for (const s of subjects) {
      if (s.programId !== selectedSection.programId) continue;
      if (!isGecCurriculumSubjectCode(s.code)) continue;
      if (!allowedProspectusCodes.has(normalizeProspectusCode(s.code))) continue;
      ids.add(s.id);
    }
    return ids;
  }, [subjects, selectedSection, allowedProspectusCodes]);

  /** Current term → prospectus 1st/2nd sem; narrows the GEC summary when the period name is parseable. */
  const termProspectusSemesterForSummary = useMemo(
    () => prospectusSemesterFromAcademicPeriod(selectedPeriod),
    [selectedPeriod],
  );

  /** GEC codes already on the master schedule for this section + term (drives “Plotted” in the summary table). */
  const gecPlottedSubjectCodesForSection = useMemo(() => {
    if (!sectionIdFilter || !academicPeriodId) return new Set<string>();
    const set = new Set<string>();
    for (const e of mergedEntries) {
      if (e.sectionId !== sectionIdFilter || e.academicPeriodId !== academicPeriodId) continue;
      const sub = subjectById.get(e.subjectId);
      if (!sub || !isGecCurriculumSubjectCode(sub.code)) continue;
      set.add(normalizeProspectusCode(sub.code));
    }
    return set;
  }, [mergedEntries, sectionIdFilter, academicPeriodId, subjectById]);

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
        subtitle="Select college and section. Conflict check uses the full campus timetable for the selected term; you may edit vacant GEC slots only."
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
          {/* When a section workspace is open, Run / Save / alternatives live beside “Add schedule row” in the grid. */}
          {!sectionIdFilter ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 bg-white font-bold h-11 px-5"
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
                {saveBusy ? "Saving…" : "Save Vacant Edits"}
              </Button>
            </>
          ) : null}
        </div>

        {gecEnrichedConflicts.length > 0 ? (
          <div className="mb-4">
            <EnrichedConflictIssuesPanel
              variant="compact"
              title="Conflicts & suggested fixes (campus-wide scan)"
              issues={gecEnrichedConflicts}
              suggestionsByIssueKey={gecGaByIssueKey}
              allowApply={canEditVacant}
              onApplySuggestion={(key, s) => {
                const iss = gecEnrichedConflicts.find((i) => i.key === key);
                if (!iss || !vacantGecSourceIds.has(iss.rowA.entryId)) return;
                applyGecGaSuggestion(iss.rowA.entryId, s);
              }}
              formatSuggestionLabel={(sug) =>
                formatGaSuggestionShortLabel(sug, {
                  roomCode: roomById.get(sug.roomId)?.code ?? sug.roomId,
                  instructorDisplay: formatUserInstructorLabel(
                    userById.get(sug.instructorId),
                    facultyProfileByUserId.get(sug.instructorId),
                  ),
                })
              }
              maxIssues={12}
            />
          </div>
        ) : conflictSummary.length > 0 && !sectionIdFilter ? (
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
                  rowDomIdPrefix="gec-hub-eval-row"
                />
              </>
            ) : (
              <div className="space-y-6">
                {/* Top: GEC-only prospectus for this section’s year (from section name) + term semester when known */}
                {selectedYearLevel == null ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                    <p className="font-semibold">Could not detect year level from the section name.</p>
                    <p className="mt-1 text-black/75">
                      Use a label like <strong>BSIT 3A</strong> or <strong>BSIT-3A</strong> so the summary can show only
                      that year’s GEC subjects.
                    </p>
                  </div>
                ) : (
                  <BsitProspectusSummaryTable
                    key={`${sectionIdFilter}-${selectedYearLevel}-${termProspectusSemesterForSummary ?? "semx"}`}
                    programCode={sectionProgram?.code ?? ""}
                    programName={sectionProgram?.name}
                    yearLevel={selectedYearLevel}
                    semester={termProspectusSemesterForSummary}
                    plottedSubjectCodes={gecPlottedSubjectCodesForSection}
                    onSelectSubjectCode={setPickedSummaryCode}
                  />
                )}

                {/* Main plotting grid — same timetabling model as Program Chairman; only vacant GEC rows accept edits. */}
                {plotCollegeId ? (
                  <div className="space-y-2">
                    {instructorPlotOptionsBase.length === 0 ? (
                      <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        No instructors with an Employee ID in this college. Add faculty in <strong>Faculty Profile</strong>{" "}
                        first.
                      </p>
                    ) : null}
                    <GecSectionPlottingTable
                    collegeId={plotCollegeId}
                    academicPeriodId={academicPeriodId}
                    sectionId={sectionIdFilter}
                    mergedEntries={mergedEntries}
                    entries={allEntries}
                    subjectById={subjectById}
                    sectionById={sectionById}
                    programById={programById}
                    instructorPlotOptions={instructorPlotOptionsBase}
                    userById={userById}
                    facultyProfileByUserId={facultyProfileByUserId}
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
                    onRunConflictCheck={() => runConflictCheck()}
                    runConflictCheckDisabled={loading || saveBusy}
                    onSaveVacantEdits={() => void saveVacantEdits()}
                    saveVacantEditsDisabled={!canEditVacant}
                    saveVacantBusy={saveBusy}
                    highlightConflictEntryIds={conflictIds}
                  />
                  </div>
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
                  facultyProfileByUserId={facultyProfileByUserId}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
