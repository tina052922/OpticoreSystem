"use client";

import { useMemo, useState } from "react";
import { buildInsFacultyView, type InsFacultySchedule } from "@/lib/ins/build-ins-faculty-view";
import { useInsCatalog } from "@/hooks/use-ins-catalog";

export type { InsInstructorOption } from "@/hooks/use-ins-catalog";

/**
 * Live INS Form 5A: catalog data + faculty selection + built grid.
 */
export function useInsLiveSchedule(args: { collegeId: string | null; programId: string | null }) {
  const catalog = useInsCatalog(args);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");

  const { schedule, courses } = useMemo(() => {
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
      return { schedule: empty, courses: [] as ReturnType<typeof buildInsFacultyView>["courses"] };
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

  return {
    loading: catalog.loading,
    error: catalog.error,
    periodLabel: catalog.periodLabel,
    periods: catalog.periods,
    academicPeriodId: catalog.academicPeriodId,
    setAcademicPeriodId: catalog.setAcademicPeriodId,
    instructorOptions: catalog.instructorOptions,
    selectedInstructorId,
    setSelectedInstructorId,
    schedule,
    courses,
    scopedEntries: catalog.scopedEntries,
    getInsConflictSummaries: catalog.getInsConflictSummaries,
    reload: catalog.reload,
  };
}
