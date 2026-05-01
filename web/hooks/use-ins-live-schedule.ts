"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  buildInsFacultyView,
  type InsFacultyFormSummary,
  type InsFacultySchedule,
} from "@/lib/ins/build-ins-faculty-view";
import { buildInsSignatureSlots, type InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
import { insInstructorDisplayName } from "@/lib/ins/ins-instructor-display";
import { useInsCatalog } from "@/hooks/use-ins-catalog";
import { Q } from "@/lib/supabase/catalog-columns";
import type { FacultyProfile } from "@/types/db";

export type { InsInstructorOption } from "@/hooks/use-ins-catalog";

/**
 * Live INS Form 5A: catalog data + faculty selection + built grid + signature strip when published.
 */
export function useInsLiveSchedule(args: {
  collegeId: string | null;
  programId: string | null;
  /** When set, locks the grid to this instructor (faculty portal). */
  lockedInstructorId?: string | null;
  /** Load all colleges’ entries (DOI campus-wide INS). */
  campusWide?: boolean;
  /** Faculty portal: narrow INS catalog to this instructor’s sections/programs. */
  instructorPortalUserId?: string | null;
}) {
  /** Form 5A totals must match faculty portal + Evaluator (cross-program teaching in one college). */
  const catalog = useInsCatalog({ ...args, ignoreProgramScope: true });
  const [selectedInstructorId, setSelectedInstructorId] = useState(args.lockedInstructorId ?? "");
  const [facultyProfile, setFacultyProfile] = useState<FacultyProfile | null>(null);

  useEffect(() => {
    if (args.lockedInstructorId) {
      setSelectedInstructorId(args.lockedInstructorId);
    }
  }, [args.lockedInstructorId]);

  useEffect(() => {
    if (!selectedInstructorId) {
      setFacultyProfile(null);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    void supabase
      .from("FacultyProfile")
      .select(Q.facultyProfileIns)
      .eq("userId", selectedInstructorId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setFacultyProfile((data as FacultyProfile) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedInstructorId]);

  const resolvedCollegeAndProgram = useMemo(() => {
    let collegeId: string | null = args.collegeId;
    let programId: string | null = args.programId ?? null;
    if (!catalog.academicPeriodId || !selectedInstructorId) {
      const collegeRow = collegeId ? catalog.colleges.find((c) => c.id === collegeId) ?? null : null;
      return { collegeId, programId, collegeRow };
    }
    const termList = catalog.entries.filter(
      (e) => e.academicPeriodId === catalog.academicPeriodId && e.instructorId === selectedInstructorId,
    );
    if (termList.length === 0) {
      const collegeRow = collegeId ? catalog.colleges.find((c) => c.id === collegeId) ?? null : null;
      return { collegeId, programId, collegeRow };
    }
    const sec0 = catalog.sectionById.get(termList[0]!.sectionId);
    const pr0 = sec0 ? catalog.programById.get(sec0.programId) : null;
    if (args.campusWide && pr0 && sec0) {
      collegeId = pr0.collegeId;
      programId = sec0.programId;
    } else if (!programId && sec0) {
      programId = sec0.programId;
    }
    const collegeRow = collegeId ? catalog.colleges.find((c) => c.id === collegeId) ?? null : null;
    return { collegeId, programId, collegeRow };
  }, [
    args.collegeId,
    args.programId,
    args.campusWide,
    catalog.academicPeriodId,
    catalog.scopedEntries,
    catalog.sectionById,
    catalog.programById,
    catalog.colleges,
    selectedInstructorId,
  ]);

  const insSignatureSlots: InsSignatureSlot[] | null = useMemo(() => {
    return buildInsSignatureSlots({
      college: resolvedCollegeAndProgram.collegeRow,
      programId: resolvedCollegeAndProgram.programId,
      users: catalog.users,
      userById: catalog.userById,
      scheduleApproved: catalog.termPublishLocked,
      campusWideDirectorSignatureUrl: catalog.campusWideDirectorSignatureUrl,
    });
  }, [
    resolvedCollegeAndProgram.collegeRow,
    resolvedCollegeAndProgram.programId,
    catalog.users,
    catalog.userById,
    catalog.termPublishLocked,
    catalog.campusWideDirectorSignatureUrl,
  ]);

  const facultyCredentials = useMemo(() => {
    if (!facultyProfile) return null;
    return {
      bachelors: facultyProfile.bsDegree,
      master: facultyProfile.msDegree,
      doctorate: facultyProfile.doctoralDegree,
      major: [facultyProfile.major1, facultyProfile.major2, facultyProfile.major3].filter(Boolean).join(" · ") || null,
      minor: [facultyProfile.minor1, facultyProfile.minor2, facultyProfile.minor3].filter(Boolean).join(" · ") || null,
      specialTraining: facultyProfile.specialTraining,
    };
  }, [facultyProfile]);

  /**
   * Form 5A grid + Hours/Week must use every `ScheduleEntry` for this instructor in the term (all colleges /
   * programs), matching `/api/portal/faculty-term-data` + My Schedule — not `scopedEntries`, which is limited to the
   * viewer college’s program graph for Section/Room INS pickers.
   */
  const entriesForInsFacultyView = useMemo(() => {
    if (!catalog.academicPeriodId || !selectedInstructorId) return [];
    return catalog.entries.filter(
      (e) => e.academicPeriodId === catalog.academicPeriodId && e.instructorId === selectedInstructorId,
    );
  }, [catalog.entries, catalog.academicPeriodId, selectedInstructorId]);

  const { schedule, courses, teachingMetrics } = useMemo(() => {
    if (!catalog.academicPeriodId || !selectedInstructorId) {
      const empty: InsFacultySchedule = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: [],
      };
      const z = { preparations: 0, totalUnits: 0, hoursPerWeek: 0 };
      return {
        schedule: empty,
        courses: [] as ReturnType<typeof buildInsFacultyView>["courses"],
        teachingMetrics: z,
      };
    }
    return buildInsFacultyView({
      entries: entriesForInsFacultyView,
      academicPeriodId: catalog.academicPeriodId,
      instructorId: selectedInstructorId,
      sectionById: catalog.sectionById,
      subjectById: catalog.subjectById,
      roomById: catalog.roomById,
    });
  }, [
    entriesForInsFacultyView,
    catalog.academicPeriodId,
    selectedInstructorId,
    catalog.sectionById,
    catalog.subjectById,
    catalog.roomById,
  ]);

  const facultyFormSummary: InsFacultyFormSummary | null = useMemo(() => {
    if (!catalog.academicPeriodId || !selectedInstructorId) return null;
    return {
      ...teachingMetrics,
      administrativeDesignation: facultyProfile?.designation?.trim() || null,
      production: facultyProfile?.production?.trim() || null,
      extension: facultyProfile?.extension?.trim() || null,
      research: facultyProfile?.research?.trim() || null,
    };
  }, [catalog.academicPeriodId, selectedInstructorId, teachingMetrics, facultyProfile]);

  /**
   * Form 5A header / print: AKA if set, else full name (INS rules). Uses the async `FacultyProfile` row when loaded,
   * otherwise catalog name fields so the label is correct before the detail fetch finishes.
   */
  const selectedFacultyDisplayName = useMemo(() => {
    if (!selectedInstructorId) return "Search faculty";
    const u = catalog.userById.get(selectedInstructorId);
    if (!u) return "Search faculty";
    const fromCatalog = catalog.facultyProfileByUserId.get(selectedInstructorId);
    return insInstructorDisplayName(u, facultyProfile ?? fromCatalog ?? null);
  }, [selectedInstructorId, catalog.userById, catalog.facultyProfileByUserId, facultyProfile]);

  return {
    loading: catalog.loading,
    error: catalog.error,
    periodLabel: catalog.periodLabel,
    periods: catalog.periods,
    academicPeriodId: catalog.academicPeriodId,
    setAcademicPeriodId: catalog.setAcademicPeriodId,
    instructorOptions: catalog.instructorOptions,
    sectionOptions: catalog.sectionOptions,
    roomOptions: catalog.roomOptions,
    selectedInstructorId,
    setSelectedInstructorId,
    schedule,
    courses,
    scopedEntries: catalog.scopedEntries,
    subjectIdByCode: catalog.subjectIdByCode,
    getInsConflictSummaries: catalog.getInsConflictSummaries,
    getInsConflictAlertText: catalog.getInsConflictAlertText,
    termPublishLocked: catalog.termPublishLocked,
    insSignatureSlots,
    facultyCredentials,
    facultyFormSummary,
    selectedFacultyDisplayName,
    reload: catalog.reload,
  };
}
