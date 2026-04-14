"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  buildInsFacultyView,
  type InsFacultyFormSummary,
  type InsFacultySchedule,
} from "@/lib/ins/build-ins-faculty-view";
import { buildInsSignatureSlots, type InsSignatureSlot } from "@/lib/ins/ins-signature-slots";
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
}) {
  const catalog = useInsCatalog(args);
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
    const termList = catalog.scopedEntries.filter(
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
      entries: catalog.scopedEntries,
      academicPeriodId: catalog.academicPeriodId,
      instructorId: selectedInstructorId,
      sectionById: catalog.sectionById,
      subjectById: catalog.subjectById,
      roomById: catalog.roomById,
    });
  }, [
    catalog.scopedEntries,
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
    termPublishLocked: catalog.termPublishLocked,
    insSignatureSlots,
    facultyCredentials,
    facultyFormSummary,
    reload: catalog.reload,
  };
}
