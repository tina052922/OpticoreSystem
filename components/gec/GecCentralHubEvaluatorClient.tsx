"use client";

import { apiFetch, authApi, catalogApi, gecApi, recordScheduleWrite, schedulingApi, ApiClientError } from "@/lib/api/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { ProgramModeToggle } from "@/components/scheduling/ProgramModeToggle";
import { buildScheduleEvaluatorTableRows } from "@/lib/evaluator/schedule-evaluator-table";
import {
  detectConflictsSparse,
  scanAllSparseScheduleConflicts,
  scheduleEntryToSparseBlock,
} from "@/lib/scheduling/conflicts";
import type { GASuggestion, ScheduleBlock } from "@/lib/scheduling/types";
import {
  buildConflictSummaryLines,
  enrichCampusConflictIssues,
  type CampusConflictScanApiPayload,
  type EnrichedCampusIssue,
} from "@/lib/scheduling/conflict-enrichment";
import { runRuleBasedGeneticAlgorithm } from "@/lib/scheduling/ruleBasedGA";
import { slotDurationHours } from "@/lib/scheduling/time";
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
import { isPlottableFacultyUser } from "@/lib/auth/instructor-validation";
import { useAccessRequests } from "@/hooks/use-access-requests";
import {
  getGecVacantSlotApprovalUiState,
  hasActiveScopeGrant,
} from "@/components/access/RequestAccessPanel";
import { GecVacantSlotsApprovalGate } from "@/components/access/GecVacantSlotsApprovalGate";
import { EvaluatorScheduleOverviewTable } from "@/components/evaluator/EvaluatorScheduleOverviewTable";
import { BsitProspectusSummaryTable } from "@/components/gec/BsitProspectusSummaryTable";
import { GecInteractiveWeekGrid } from "@/components/gec/GecInteractiveWeekGrid";
import type { GecPlotEditPatch } from "@/components/gec/GecSectionPlottingTable";
import { evaluatorTimeSlots, evaluatorWeekdays, type BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";
import { clampPlotStartSlotIndex, plotEntryDurationSlots, timesFromSlotRange } from "@/lib/evaluator/plot-duration";
import { filterByProgramMode, hydrateScheduleEntries, resolveProgramMode, stampProgramMode } from "@/lib/scheduling/program-mode";
import { useProgramMode } from "@/contexts/ProgramModeContext";
import { formatSparseConflictLines } from "@/lib/evaluator/plot-conflict-messages";
import {
  GEC_VACANT_INSTRUCTOR_USER_ID,
  isGecCurriculumSubjectCode,
  isGecVacantScheduleEntry,
} from "@/lib/gec/gec-vacant";
import { dedupeLegacyItLabsForCampusNavigation } from "@/lib/campus/campus-navigation-room-dedupe";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import { useScheduleEntryCrossReload } from "@/hooks/use-schedule-entry-cross-reload";
import {
  CAMPUS_WIDE_COLLEGE_SLUG,
  gecHubCollegeTiles,
  isHubCollegeListView,
} from "@/lib/evaluator-central-hub";
import { HubCollegesNavLink } from "@/components/evaluator/HubCollegesNavLink";
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
import { evaluateFacultyLoadsForCollege, rowNeedsTeachingLoadJustification } from "@/lib/scheduling/facultyPolicies";
import { FACULTY_POLICY_CONSTANTS } from "@/lib/scheduling/constants";
import { useSystemConfigurationOptional } from "@/contexts/SystemConfigurationContext";
import { PolicyJustificationModal } from "@/components/evaluator/PolicyJustificationModal";
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
    programMode: resolveProgramMode(e),
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
  const systemConfig = useSystemConfigurationOptional();
  const policyConstants = systemConfig?.policyConstants ?? FACULTY_POLICY_CONSTANTS;
  const { programMode } = useProgramMode();
  const slotsForMode = evaluatorTimeSlots(programMode);
  const { selectedPeriodId: academicPeriodId, selectedPeriod } = useSemesterFilter();
  const router = useRouter();
  const searchParams = useSearchParams();
  const collegeParam = isHubCollegeListView(searchParams.get("view"), searchParams.get("college"))
    ? ""
    : searchParams.get("college")?.trim() ?? "";
  const panel = searchParams.get("panel") === "hrs" ? "hrs" : "timetabling";
  const isCampusWide = collegeParam === CAMPUS_WIDE_COLLEGE_SLUG;

  const { requests, loading: accessLoading, reload: reloadAccess } = useAccessRequests();

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
  const [justModalOpen, setJustModalOpen] = useState(false);
  const [justificationText, setJustificationText] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [conflictIds, setConflictIds] = useState<Set<string>>(new Set());
  const [conflictSummary, setConflictSummary] = useState<string[]>([]);
  const [focusPlotEntryId, setFocusPlotEntryId] = useState<string | null>(null);
  const [roomBuildingByEntryId, setRoomBuildingByEntryId] = useState<Record<string, string>>({});
  /** DOI-style enriched pairwise issues + GA alternatives (same engine as Central Hub / VPAA panel). */
  const [gecEnrichedConflicts, setGecEnrichedConflicts] = useState<EnrichedCampusIssue[]>([]);
  const [gecGaByIssueKey, setGecGaByIssueKey] = useState<Record<string, GASuggestion[]>>({});
  /** Local rows not yet in Supabase — same “Add schedule row” flow as Program Chairman (`BsitChairmanEvaluatorWorksheet`). */
  const [extraEntries, setExtraEntries] = useState<ScheduleEntry[]>([]);
  const skipPeriodEntryFetchRef = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutosaveToastAtRef = useRef<number>(0);
  /** Inline status beside controls (complements global connection toasts). */
  const [connOnline, setConnOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [lastDraftSaveAt, setLastDraftSaveAt] = useState<Date | null>(null);

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

  useEffect(() => {
    const on = () => setConnOnline(true);
    const off = () => setConnOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    skipPeriodEntryFetchRef.current = true;
    try {
      const bundle = await apiFetch<any>(
        `/api/catalog/evaluator-bundle?academicPeriodId=${academicPeriodId ?? ""}`,
        { method: "GET" },
      );
      setColleges(bundle.colleges ?? []);
      setPeriods(bundle.periods ?? []);
      setPrograms(bundle.programs ?? []);
      setSections(bundle.sections ?? []);
      setSubjects(bundle.subjects ?? []);
      setRooms(bundle.rooms ?? []);
      setUsers(bundle.users ?? []);
      setFacultyProfiles(bundle.facultyProfiles ?? []);
      setEntries(hydrateScheduleEntries(bundle.entries ?? []));
      setLoading(false);
    } catch {
      setLoadError("Failed to load evaluator data.");
      setLoading(false);
    }
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
    try {
      const data = await catalogApi.scheduleEntries<{ entries: ScheduleEntry[] }>(
        academicPeriodId,
      );
      setEntries(hydrateScheduleEntries(data.entries ?? []));
    } catch {}
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
      try {
        const data = await catalogApi.scheduleEntries<{ entries: ScheduleEntry[] }>(
          academicPeriodId,
        );
        if (!cancelled) setEntries(hydrateScheduleEntries(data.entries ?? []));
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? "Failed to load entries");
      }
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

  const modeMergedEntries = useMemo(
    () => filterByProgramMode(mergedEntries, programMode),
    [mergedEntries, programMode],
  );

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

  /** College id for the section being plotted (required for conflict checks vs campus-wide URL). */
  const plotCollegeId = useMemo(() => {
    if (!sectionIdFilter) return null;
    const sec = sectionById.get(sectionIdFilter);
    const pr = sec ? programById.get(sec.programId) : null;
    return pr?.collegeId ?? null;
  }, [sectionIdFilter, sectionById, programById]);

  const grantScopeCollegeId = useMemo(() => {
    if (!isCampusWide) return collegeParam || null;
    return plotCollegeId;
  }, [isCampusWide, collegeParam, plotCollegeId]);

  const canEditVacant = useMemo(
    () =>
      grantScopeCollegeId ? hasActiveScopeGrant(requests, "gec_vacant_slots", grantScopeCollegeId) : false,
    [requests, grantScopeCollegeId],
  );

  const approvalState = useMemo(
    () => getGecVacantSlotApprovalUiState(requests, grantScopeCollegeId),
    [requests, grantScopeCollegeId],
  );

  /** Rows that are vacant GEC placeholders (DB + newly added local rows). */
  const vacantGecSourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of modeMergedEntries) {
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
    modeMergedEntries,
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
        const toSave: ScheduleEntry[] = [];
        for (const e of [...entries, ...extraEntries]) {
          if (!vacantGecSourceIds.has(e.id)) continue;
          const patch = edits[e.id];
          const isNew = pendingNewEntryIds.has(e.id);
          const hasPatch = patch && Object.keys(patch).length > 0;
          if (!isNew && !hasPatch) continue;
          toSave.push(stampProgramMode({ ...e, ...patch }, programMode));
        }
        if (toSave.length === 0) return;
        try { await apiFetch("/api/catalog/schedule-entries-upsert", { method: "POST", body: toSave }); } catch {}
        setLastDraftSaveAt(new Date());
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
    programMode,
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
          const toSave: ScheduleEntry[] = [];
          for (const e of [...entries, ...extraEntries]) {
            if (!vacantGecSourceIds.has(e.id)) continue;
            const patch = edits[e.id];
            const isNew = pendingNewEntryIds.has(e.id);
            const hasPatch = patch && Object.keys(patch).length > 0;
            if (!isNew && !hasPatch) continue;
            toSave.push(stampProgramMode({ ...e, ...patch }, programMode));
          }
          if (toSave.length === 0) return;
          try { await apiFetch("/api/catalog/schedule-entries-upsert", { method: "POST", body: toSave }); } catch {}
          setLastDraftSaveAt(new Date());
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
    programMode,
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
      entries: modeMergedEntries,
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
    modeMergedEntries,
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

  const entryInstructorIdsForPlotMerge = useMemo(
    () => mergedEntries.map((e) => e.instructorId).filter(Boolean) as string[],
    [mergedEntries],
  );

  const instructorPlotOptionsBase = useMemo(() => {
    if (!plotCollegeId) return [];
    const pool = users.filter(
      (u) => u.collegeId === plotCollegeId && isPlottableFacultyUser(u),
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
    const scoped = rooms.filter((r) => !r.collegeId || r.collegeId === plotCollegeId);
    return dedupeLegacyItLabsForCampusNavigation(scoped);
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
    });
  }

  /**
   * Campus-wide for the selected term: every `ScheduleEntry` row (all colleges/programs — majors + GEC),
   * so conflicts are detected against the real master timetable, not a single department filter.
   */
  function runConflictCheck() {
    if (!academicPeriodId) return;
    void (async () => {
      const entryById = new Map(modeMergedEntries.map((e) => [e.id, e]));
      const sparseBlocks = modeMergedEntries
        .filter((e) => e.academicPeriodId === academicPeriodId)
        .map((e) => scheduleEntryToSparseBlock(e))
        .filter((b): b is NonNullable<typeof b> => b != null);
      const localScan = scanAllSparseScheduleConflicts(sparseBlocks);
      const localEnriched = enrichCampusConflictIssues(
        localScan.issues,
        entryById,
        subjectById,
        sectionById,
        roomById,
        userById,
        programById,
        collegeNameById,
      );

      let serverPayload: CampusConflictScanApiPayload | null = null;
      try {
        const j = await schedulingApi.scopeConflictScan({
          academicPeriodId,
          mode: "doi_campus",
          collegeId: null,
          programId: null,
          programMode,
        });
        serverPayload = {
          entryCount: j.entryCount ?? 0,
          conflictingEntryIds: j.conflictingEntryIds ?? [],
          issueSummaries: j.issueSummaries ?? [],
          issues: j.issues ?? [],
          enrichedIssues: (j.enrichedIssues ?? []) as CampusConflictScanApiPayload["enrichedIssues"],
        };
      } catch (e) {
        toast.error(
          "Conflict scan failed",
          e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Please try again.",
        );
      }

      const mergedByKey = new Map<string, EnrichedCampusIssue>();
      for (const iss of serverPayload?.enrichedIssues ?? []) mergedByKey.set(iss.key, iss);
      for (const iss of localEnriched) {
        if (!mergedByKey.has(iss.key)) mergedByKey.set(iss.key, iss);
      }
      const mergedEnriched = [...mergedByKey.values()];

      const conflictSet = new Set<string>();
      for (const id of serverPayload?.conflictingEntryIds ?? []) conflictSet.add(id);
      for (const id of localScan.conflictingEntryIds) conflictSet.add(id);

      setConflictIds(conflictSet);
      setGecEnrichedConflicts(mergedEnriched);

      const summaryLines =
        mergedEnriched.length > 0
          ? buildConflictSummaryLines(mergedEnriched, 14)
          : [...new Set([...(serverPayload?.issueSummaries ?? []), ...localScan.issueSummaries])];
      setConflictSummary(summaryLines);

      const universe = modeMergedEntries.filter((e) => e.academicPeriodId === academicPeriodId).map(toBlock);
      const gaMap: Record<string, GASuggestion[]> = {};
      const roomIds = rooms.map((r) => r.id);
      const instructorIds = users
        .filter((u) => isPlottableFacultyUser(u))
        .map((u) => u.id);
      for (const iss of mergedEnriched.slice(0, 3)) {
        const entry = modeMergedEntries.find((e) => e.id === iss.rowA.entryId);
        if (!entry) continue;
        if (roomIds.length === 0 || instructorIds.length === 0) continue;
        const durationHours = slotDurationHours(entry.startTime, entry.endTime) || 2;
        const sug = runRuleBasedGeneticAlgorithm({
          universe,
          sectionId: entry.sectionId,
          subjectId: entry.subjectId,
          academicPeriodId: entry.academicPeriodId,
          excludeEntryId: entry.id,
          durationHours,
          fixedInstructorId: entry.instructorId,
          roomIds,
          instructorIds,
          generations: 16,
          populationSize: 24,
        });
        gaMap[iss.key] = sug.slice(0, 5);
      }
      setGecGaByIssueKey(gaMap);

      if (conflictSet.size === 0 && mergedEnriched.length === 0) {
        setSaveMsg("No conflicts detected — faculty, room, and section times are clear for this term.");
        setGecEnrichedConflicts([]);
        setGecGaByIssueKey({});
        toast.success("No conflicts detected");
      } else {
        setSaveMsg(null);
        const summaryCount =
          mergedEnriched.length > 0 ? buildConflictSummaryLines(mergedEnriched, 14).length : summaryLines.length;
        toast.info("Conflicts found – see details below", `${summaryCount} issue(s) detected.`);
      }
    })();
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

  async function saveVacantEdits(opts?: { skipJustificationPrompt?: boolean }) {
    if (!canEditVacant || !collegeParam || !academicPeriodId) return;
    setSaveBusy(true);
    setSaveMsg(null);
    try {
      const toSave: ScheduleEntry[] = [];
      for (const e of allEntries) {
        if (!vacantGecSourceIds.has(e.id)) continue;
        const merged = { ...e, ...edits[e.id] };
        const isNew = pendingNewEntryIds.has(e.id);
        const patch = edits[e.id];
        const hasPatch = patch && Object.keys(patch).length > 0;
        if (isNew || hasPatch) {
          toSave.push(stampProgramMode(merged, programMode));
        }
      }
      if (toSave.length === 0) {
        setSaveMsg("No vacant GEC edits to save.");
        toast.info("No changes to save");
        return;
      }

      const byId = new Map(allEntries.map((e) => [e.id, e]));
      for (const e of toSave) byId.set(e.id, e);
      const hypothetical = filterByProgramMode(
        [...byId.values()].filter(
          (e) => e.instructorId && e.instructorId !== GEC_VACANT_INSTRUCTOR_USER_ID,
        ),
        programMode,
      );
      const collegeIdForPolicy = plotCollegeId || grantScopeCollegeId || collegeParam;
      const policy = evaluateFacultyLoadsForCollege(
        hypothetical,
        subjectById,
        userById,
        facultyProfileByUserId,
        collegeIdForPolicy ?? "",
        (sid) => {
          const sec = sectionById.get(sid);
          const pr = sec ? programById.get(sec.programId) : null;
          return pr?.collegeId ?? null;
        },
        policyConstants,
      );
      const needsJust = policy.hasTeachingLoadJustificationViolation;
      if (needsJust && !opts?.skipJustificationPrompt) {
        setJustModalOpen(true);
        setSaveMsg("Enter a justification for College Admin and DOI review (min. 12 characters).");
        return;
      }
      if (needsJust && justificationText.trim().length < 12) {
        setJustModalOpen(true);
        setSaveMsg("Enter a justification for DOI/VPAA review (min. 12 characters).");
        return;
      }
      if (needsJust) {
        const { user } = await authApi.me();
        if (!user) {
          setSaveMsg("Not signed in.");
          toast.error("Failed to save. Please try again.", "Not signed in.");
          return;
        }
        const violators = policy.rows.filter((r) => rowNeedsTeachingLoadJustification(r));
        const snapRows = violators.map(
          (r) =>
            `${r.instructorName}: ${r.weeklyTotalContactHours.toFixed(1)} hrs/wk · ${r.preparations} preps — ${r.violations.map((v) => v.code).join(", ")}`,
        );
        const t = justificationText.trim();
        for (const v of violators) {
          await apiFetch("/api/catalog/schedule-load-justifications", {
            method: "POST",
            body: {
              academicPeriodId,
              collegeId: collegeIdForPolicy,
              facultyUserId: v.instructorId,
              scheduleEntryId: toSave.find((r) => r.instructorId === v.instructorId)?.id ?? null,
              authorUserId: user.id,
              authorName: user.name ?? user.email ?? user.id,
              authorEmail: user.email ?? null,
              justification: t,
              violationsSnapshot: {
                summary: snapRows.join("\n"),
                detail: policy.rows,
                facultyWeeklyHours: v.weeklyTotalContactHours,
                preparations: v.preparations,
              },
            },
          });
        }
      }

      await apiFetch("/api/catalog/schedule-entries-upsert", { method: "POST", body: toSave });
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
      void recordScheduleWrite({
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
        void gecApi
          .scheduleSaveNotify({
            collegeId: plotCollegeId,
            academicPeriodId,
            sectionId: sectionIdFilter,
            sectionName: sec?.name ?? "",
            rowCount: toSave.length,
          })
          .catch(() => {});
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

  function addGecScheduleRowAt(day: BsitEvaluatorWeekday, startIdx: number) {
    if (!canEditVacant || !sectionIdFilter || !academicPeriodId || !plotCollegeId) {
      setSaveMsg("Select a section and ensure vacant-slot access is approved before plotting.");
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
    const dur = plotEntryDurationSlots(programCode, firstSub, 1);
    const effIdx = clampPlotStartSlotIndex(Math.max(0, startIdx), dur, slotsForMode.length);
    const times = timesFromSlotRange(effIdx, dur, slotsForMode);
    if (!times) return;
    const roomPick = roomsForPlotting[0]?.id ?? "";
    if (!roomPick) {
      setSaveMsg("No room available for this college — add rooms in the database first.");
      return;
    }
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `gec-${Date.now()}-${Math.random()}`;
    const row: ScheduleEntry = {
      id,
      academicPeriodId,
      subjectId: firstSub.id,
      instructorId: GEC_VACANT_INSTRUCTOR_USER_ID,
      sectionId: sectionIdFilter,
      roomId: roomPick,
      day,
      startTime: times.startTime,
      endTime: times.endTime,
      status: "draft",
      programMode,
    };
    setExtraEntries((prev) => [...prev, row]);
    setFocusPlotEntryId(id);
    setSaveMsg(null);
  }

  /**
   * IMPORTANT (Rules of Hooks): these derived values must be computed before any early returns below.
   * The evaluator has multiple landing/invalid states; keeping hooks unconditional prevents hook order
   * changes when the user navigates between hub → college → section.
   */
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
    for (const e of modeMergedEntries) {
      if (e.sectionId !== sectionIdFilter || e.academicPeriodId !== academicPeriodId) continue;
      const sub = subjectById.get(e.subjectId);
      if (!sub || !isGecCurriculumSubjectCode(sub.code)) continue;
      set.add(normalizeProspectusCode(sub.code));
    }
    return set;
  }, [modeMergedEntries, sectionIdFilter, academicPeriodId, subjectById]);

  /** GEC subject ids on this section (enables “add another time slot” in the plot modal). */
  const gecPlottedSubjectIdsForSection = useMemo(() => {
    if (!sectionIdFilter || !academicPeriodId) return new Set<string>();
    const set = new Set<string>();
    for (const e of modeMergedEntries) {
      if (e.sectionId !== sectionIdFilter || e.academicPeriodId !== academicPeriodId) continue;
      const sub = subjectById.get(e.subjectId);
      if (!sub || !isGecCurriculumSubjectCode(sub.code)) continue;
      set.add(e.subjectId);
    }
    return set;
  }, [modeMergedEntries, sectionIdFilter, academicPeriodId, subjectById]);

  const gecSubjectsForPlot = useMemo(() => {
    if (!selectedSection || !allowedSubjectIds || allowedSubjectIds.size === 0) return [];
    return subjects
      .filter(
        (s) =>
          s.programId === selectedSection.programId &&
          isGecCurriculumSubjectCode(s.code) &&
          allowedSubjectIds.has(s.id),
      )
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [subjects, selectedSection, allowedSubjectIds]);

  const sparseCampusWideUniverse = useMemo(() => {
    if (!academicPeriodId) return [];
    const list = [];
    for (const e of modeMergedEntries) {
      if (e.academicPeriodId !== academicPeriodId) continue;
      const b = scheduleEntryToSparseBlock(e);
      if (b) list.push(b);
    }
    return list;
  }, [modeMergedEntries, academicPeriodId]);

  const conflictForEntry = useCallback(
    (e: ScheduleEntry) => {
      const candidate = scheduleEntryToSparseBlock(e);
      if (!candidate) return { faculty: "—", room: "—", section: "—" };
      const hits = detectConflictsSparse(candidate, sparseCampusWideUniverse, candidate.id);
      const fac = hits.some((h) => h.type === "faculty");
      const room = hits.some((h) => h.type === "room");
      const secHit = hits.some((h) => h.type === "section");
      return {
        faculty: !candidate.instructorId ? "—" : fac ? "Yes" : "No",
        room: !candidate.roomId ? "—" : room ? "Yes" : "No",
        section: !candidate.sectionId ? "—" : secHit ? "Yes" : "No",
      };
    },
    [sparseCampusWideUniverse],
  );

  const conflictDetailForEntry = useCallback(
    (e: ScheduleEntry) => {
      const candidate = scheduleEntryToSparseBlock(e);
      if (!candidate) return [];
      const hits = detectConflictsSparse(candidate, sparseCampusWideUniverse, candidate.id);
      const sub = subjectById.get(e.subjectId);
      const room = roomById.get(e.roomId);
      const inst = userById.get(e.instructorId);
      const sec = sectionById.get(e.sectionId);
      return formatSparseConflictLines(hits, sparseCampusWideUniverse, {
        instructorName: inst?.name,
        sectionName: sec?.name,
        roomCode: room?.code,
        subjectCode: sub?.code,
        when: `${e.day} ${candidate.startTime.slice(0, 5)}–${candidate.endTime.slice(0, 5)}`,
      });
    },
    [sparseCampusWideUniverse, subjectById, roomById, userById, sectionById],
  );

  const landingTiles = gecHubCollegeTiles(colleges.map((c) => ({ id: c.id, name: c.name })));

  /** Landing: college tiles first — never wait on catalog errors, never skip to Timetabling. */
  if (!collegeParam) {
    return (
      <div>
        <ChairmanPageHeader title="Central Hub Evaluator" />
        <div className="px-4 md:px-8 pb-12 max-w-4xl mx-auto">
          <GecHubEvaluatorTabs collegeParam="" panel="timetabling" />
          {loadError ? (
            <p className="mb-4 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Catalog could not fully load. College list below is still available.
            </p>
          ) : null}
          <div className="mb-4 flex justify-center mt-4">
            <Link
              href={`/admin/gec/evaluator?college=${CAMPUS_WIDE_COLLEGE_SLUG}`}
              className="inline-flex items-center justify-center min-h-[56px] rounded-[20px] bg-[#780301] text-white font-bold text-[14px] px-8 py-3 shadow-[0px_4px_4px_rgba(0,0,0,0.15)] hover:brightness-110 transition-[filter]"
            >
              All colleges (campus-wide timetable)
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {landingTiles.map((c) => (
              <Link
                key={c.id}
                href={`/admin/gec/evaluator?college=${encodeURIComponent(c.id)}`}
                className="flex items-center justify-center min-h-[72px] rounded-[20px] bg-[#ff990a] text-white font-bold text-[15px] text-center px-6 py-5 shadow-[0px_4px_4px_rgba(0,0,0,0.15)] hover:brightness-105 transition-[filter]"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <ChairmanPageHeader title="Central Hub Evaluator" />
        <div className="px-4 md:px-8 pb-8">
          <HubCollegesNavLink basePath="/admin/gec/evaluator" className="text-[13px] font-semibold text-[#780301] hover:underline mb-4 inline-block">
            ← Back to college hub
          </HubCollegesNavLink>
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{loadError}</div>
        </div>
      </div>
    );
  }

  if (invalidCollege) {
    return (
      <div>
        <ChairmanPageHeader title="Central Hub Evaluator" subtitle="Invalid college selection." />
        <div className="px-4 md:px-8 pb-8">
          <HubCollegesNavLink basePath="/admin/gec/evaluator" className="text-[13px] font-semibold text-[#780301] hover:underline">
            ← Back to college hub
          </HubCollegesNavLink>
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
          subtitle="Teaching load by college"
        />
        <div className="px-4 md:px-8 pb-8 max-w-[1400px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <HubCollegesNavLink basePath="/admin/gec/evaluator" className="text-[13px] font-semibold text-[#780301] hover:underline">
              ← College hub
            </HubCollegesNavLink>
          </div>
          <GecHubEvaluatorTabs collegeParam={collegeParam} panel="hrs" />
          <HrsUnitsPrepsRemarksTable />
        </div>
      </div>
    );
  }

  return (
    <>
    <div>
      <ChairmanPageHeader
        title="Central Hub Evaluator"
        subtitle="Vacant GEC slots only after one-time access approval for this college."
      />

      <div className="px-4 md:px-8 pb-10 space-y-5 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <HubCollegesNavLink basePath="/admin/gec/evaluator" className="text-[13px] font-semibold text-[#780301] hover:underline">
            ← College hub
          </HubCollegesNavLink>
        </div>

        <GecHubEvaluatorTabs collegeParam={collegeParam} panel="timetabling" />

        <GecVacantSlotsApprovalGate
          state={approvalState}
          loading={accessLoading}
          collegeId={grantScopeCollegeId}
          onSubmitted={() => void reloadAccess()}
        />

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
          <div className="pb-0.5">
            <ProgramModeToggle size="sm" />
          </div>
          {!sectionIdFilter ? (
            <div className="ml-auto flex flex-col items-end gap-0.5 text-[10px] text-black/55 min-w-[200px] pb-0.5">
              <span className="text-black/55">Select a section to open the INS weekly grid workspace.</span>
            </div>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-black/55 py-8">Loading…</p>
        ) : (
          <>
            {!sectionIdFilter ? (
              <>
                <p className="text-[12px] text-black/60">
                  Pick a <strong>section</strong> to open the workspace: prospectus summary and the INS weekly grid
                  (click cells to plot vacant GEC). Below is the college-wide overview until a section is selected.
                </p>
                {gecEnrichedConflicts.length > 0 ? (
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
                ) : conflictSummary.length > 0 ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                    <strong>Conflicts ({conflictSummary.length} type(s)):</strong>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {conflictSummary.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
                {selectedYearLevel == null ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                    <p className="font-semibold">Could not detect year level from the section name.</p>
                    <p className="mt-1 text-black/75">
                      Use a label like <strong>BSIT 3A</strong> or <strong>BSIT-3A</strong> so the summary can show only
                      that year&apos;s GEC subjects.
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

                {plotCollegeId && academicPeriodId ? (
                  <GecInteractiveWeekGrid
                    programCode={sectionProgram?.code ?? ""}
                    sectionId={sectionIdFilter}
                    sectionName={selectedSection?.name ?? sectionIdFilter}
                    academicPeriodId={academicPeriodId}
                    mergedEntries={modeMergedEntries}
                    programMode={programMode}
                    weekdays={evaluatorWeekdays(programMode)}
                    timeSlots={slotsForMode}
                    vacantGecSourceIds={vacantGecSourceIds}
                    subjectById={subjectById}
                    roomById={roomById}
                    userById={userById}
                    facultyProfileByUserId={facultyProfileByUserId}
                    gecSubjects={gecSubjectsForPlot}
                    instructorPlotOptions={instructorPlotOptionsBase}
                    rooms={roomsForPlotting}
                    roomBuildingByEntryId={roomBuildingByEntryId}
                    setRoomBuildingByEntryId={setRoomBuildingByEntryId}
                    canEditVacant={canEditVacant}
                    conflictForEntry={conflictForEntry}
                    conflictDetailForEntry={conflictDetailForEntry}
                    plottedGecSubjectIds={gecPlottedSubjectIdsForSection}
                    highlightConflictEntryIds={conflictIds}
                    pickedSummaryCode={pickedSummaryCode}
                    pickedSubjectId={pickedSubjectId}
                    onPatchEntry={(entryId, patch) => patchEdit(entryId, patch)}
                    onCreateVacantAtCell={addGecScheduleRowAt}
                    focusEntryId={focusPlotEntryId}
                    onFocusEntryHandled={() => setFocusPlotEntryId(null)}
                    onRemovePendingEntry={removePendingEntry}
                    pendingNewEntryIds={pendingNewEntryIds}
                    insFormBasePath="/admin/gec/ins"
                    plottingActions={{
                      onRunConflictCheck: () => runConflictCheck(),
                      onSaveSchedule: () => void saveVacantEdits(),
                      runConflictCheckDisabled: loading || saveBusy,
                      saveScheduleDisabled: !canEditVacant,
                      saveScheduleBusy: saveBusy,
                      connOnline,
                      lastDraftSaveAt,
                    }}
                    gridFooter={
                      <>
                        {instructorPlotOptionsBase.length === 0 ? (
                          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            No instructors with an Employee ID in this college. Add faculty in{" "}
                            <strong>Faculty Profile</strong> first.
                          </p>
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
                        {gecEnrichedConflicts.length > 0 ? (
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
                        ) : conflictSummary.length > 0 ? (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                            <strong>Conflicts ({conflictSummary.length} type(s)):</strong>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                              {conflictSummary.map((s) => (
                                <li key={s}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </>
                    }
                  />
                ) : (
                  <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    Could not resolve this section&apos;s college — check program linkage in the database.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    <PolicyJustificationModal
      open={justModalOpen}
      title="Policy justification"
      promptText="Assigning this GEC slot exceeds faculty load policy (weekly hours and/or 4 or more subject preparations). Enter a justification for College Admin and DOI review."
      value={justificationText}
      minLength={12}
      saving={saveBusy}
      onChange={setJustificationText}
      onCancel={() => setJustModalOpen(false)}
      onSave={async () => {
        setJustModalOpen(false);
        await saveVacantEdits({ skipJustificationPrompt: true });
      }}
    />
    </>
  );
}
