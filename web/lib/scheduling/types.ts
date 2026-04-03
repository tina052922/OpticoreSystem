/** Lightweight schedule row for conflict + GA (ids match Supabase text ids). */

export type ScheduleBlock = {
  id: string;
  academicPeriodId: string;
  subjectId: string;
  instructorId: string;
  sectionId: string;
  roomId: string;
  day: string;
  startTime: string;
  endTime: string;
};

export type ConflictType = "faculty" | "section" | "room";

export type ConflictHit = {
  type: ConflictType;
  message: string;
  withEntryId: string;
};

export type PlotDraft = {
  academicPeriodId: string;
  collegeId: string;
  programId: string;
  major: string;
  sectionId: string;
  subjectId: string;
  instructorId: string;
  roomId: string;
  day: string;
  startTime: string;
  endTime: string;
};

export type GASuggestion = {
  day: string;
  startTime: string;
  endTime: string;
  roomId: string;
  instructorId: string;
  fitness: number;
  label: string;
};
