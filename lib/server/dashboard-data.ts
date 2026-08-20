import type { ScheduleEntry, Subject, Room, Section } from "@/types/db";

export type ScheduleRowView = {
  entry: ScheduleEntry;
  subject: Subject | null;
  room: Room | null;
  instructor: { name: string } | null;
  section: Section | null;
};
