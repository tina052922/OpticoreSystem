/**
 * The "No. of Students" column of INS Form 5A / 5B, end to end from the plotted rows.
 *
 * The column is filled by `buildInsFacultyView` / `buildInsSectionView` and handed straight to
 * `INSSummaryTable`, both on screen and in the PDF, so these cover what the printed form shows.
 */
import { describe, expect, it } from "vitest";
import { buildInsFacultyView } from "./build-ins-faculty-view";
import { buildInsSectionView } from "./build-ins-section-view";
import type { Room, ScheduleEntry, Section, Subject } from "@/types/db";

const TERM = "term-1";
const INSTRUCTOR = "u-instr";

const section: Section = {
  id: "sec-3a",
  programId: "prog-bsit",
  name: "BSIT 3A",
  yearLevel: 3,
  studentCount: 40,
};

const subjects = new Map<string, Subject>([
  [
    "sub-cc112",
    {
      id: "sub-cc112",
      code: "CC-112",
      subcode: null,
      title: "Data Structures",
      lecUnits: 2,
      lecHours: 2,
      labUnits: 1,
      labHours: 3,
      programId: "prog-bsit",
      yearLevel: 3,
    },
  ],
  [
    "sub-riz",
    {
      id: "sub-riz",
      code: "GE-RIZ",
      subcode: null,
      title: "Life and Works of Rizal",
      lecUnits: 3,
      lecHours: 3,
      labUnits: 0,
      labHours: 0,
      programId: "prog-bsit",
      yearLevel: 3,
    },
  ],
]);

const rooms = new Map<string, Room>([
  [
    "room-1",
    {
      id: "room-1",
      code: "TB-101",
      building: "Tech",
      floor: 1,
      capacity: 45,
      type: "lecture",
      collegeId: "col-cote",
    } as Room,
  ],
]);

function entry(over: Partial<ScheduleEntry> & { id: string; subjectId: string }): ScheduleEntry {
  return {
    academicPeriodId: TERM,
    instructorId: INSTRUCTOR,
    sectionId: section.id,
    roomId: "room-1",
    day: "Monday",
    startTime: "07:00",
    endTime: "09:00",
    status: "draft",
    programMode: "day",
    ...over,
  };
}

const facultyView = (entries: ScheduleEntry[]) =>
  buildInsFacultyView({
    entries,
    academicPeriodId: TERM,
    instructorId: INSTRUCTOR,
    sectionById: new Map([[section.id, section]]),
    subjectById: subjects,
    roomById: rooms,
  });

const sectionView = (entries: ScheduleEntry[]) =>
  buildInsSectionView({
    entries,
    academicPeriodId: TERM,
    sectionId: section.id,
    sectionById: new Map([[section.id, section]]),
    subjectById: subjects,
    roomById: rooms,
    userById: new Map(),
    facultyProfileByUserId: new Map(),
  });

describe("INS Summary of Courses — No. of Students", () => {
  it("prints each subject's own plotted figure, not the section's size", () => {
    const courses = facultyView([
      entry({ id: "e1", subjectId: "sub-cc112", studentCount: 40 }),
      entry({ id: "e2", subjectId: "sub-riz", day: "Tuesday", studentCount: 12 }),
    ]).courses;

    expect(courses.map((c) => [c.code, c.students])).toEqual([
      ["CC-112", 40],
      ["GE-RIZ", 12],
    ]);
  });

  it("lets an offering exceed the section — a GE class can draw from two blocks", () => {
    const courses = facultyView([
      entry({ id: "e1", subjectId: "sub-riz", studentCount: 46 }),
    ]).courses;
    expect(courses[0]?.students).toBe(46);
  });

  it("leaves the column blank when nobody has counted the class", () => {
    // The section's own studentCount is 40, and it is deliberately NOT used: the figure has to come
    // from the plot modal, so a form never prints a number nobody entered against that subject.
    const courses = facultyView([entry({ id: "e1", subjectId: "sub-cc112" })]).courses;
    expect(courses[0]?.students).toBeNull();
  });

  it("uses the figure from whichever meeting carries one, across a two-day subject", () => {
    const courses = facultyView([
      entry({ id: "mon", subjectId: "sub-cc112", studentCount: 38 }),
      entry({ id: "wed", subjectId: "sub-cc112", day: "Wednesday", studentCount: 38 }),
    ]).courses;
    // One offering, so one row — and it reports the plotted figure.
    expect(courses).toHaveLength(1);
    expect(courses[0]?.students).toBe(38);
  });

  it("applies the same rule on the section form (5B)", () => {
    const courses = sectionView([
      entry({ id: "e1", subjectId: "sub-cc112", studentCount: 40 }),
      entry({ id: "e2", subjectId: "sub-riz", day: "Tuesday", studentCount: 12 }),
    ]).courses;

    expect(courses.map((c) => [c.code, c.students])).toEqual([
      ["CC-112", 40],
      ["GE-RIZ", 12],
    ]);
  });
});
