import { describe, expect, it } from "vitest";
import { programModeLabel } from "./program-mode";
import { buildTeachingLoadSummary, metricsForEntries } from "./teaching-load-summary";
import type { FacultyProfile, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";

describe("programModeLabel", () => {
  it("shows Evening Program for stored night mode", () => {
    expect(programModeLabel("night")).toBe("Evening Program");
    expect(programModeLabel("day")).toBe("Day Program");
  });
});

const instructorId = "instr-1";
const periodId = "p1";
const collegeId = "c1";

const subjectDay: Subject = {
  id: "sub-day",
  code: "IT 101",
  subcode: null,
  title: "Day Sub",
  lecUnits: 3,
  lecHours: 3,
  labUnits: 0,
  labHours: 0,
  programId: "prog1",
  yearLevel: 1,
};
const subjectEve: Subject = { ...subjectDay, id: "sub-eve", code: "IT 201", title: "Evening Sub" };

function entry(partial: Partial<ScheduleEntry> & Pick<ScheduleEntry, "id" | "subjectId" | "programMode">): ScheduleEntry {
  return {
    academicPeriodId: periodId,
    instructorId,
    sectionId: "sec1",
    roomId: "room1",
    day: "Monday",
    startTime: "08:00",
    endTime: "10:00",
    status: "draft",
    ...partial,
  };
}

describe("buildTeachingLoadSummary", () => {
  it("keeps Day and Evening preps, units, and hours in separate columns", () => {
    const entries: ScheduleEntry[] = [
      entry({ id: "d1", subjectId: "sub-day", programMode: "day", startTime: "08:00", endTime: "11:00" }),
      entry({ id: "n1", subjectId: "sub-eve", programMode: "night", startTime: "18:00", endTime: "20:00", day: "Monday" }),
    ];
    const users: User[] = [
      {
        id: instructorId,
        employeeId: null,
        email: "t@test.edu",
        name: "Test Faculty",
        role: "instructor",
        collegeId,
        chairmanProgramId: null,
        signatureImageUrl: null,
        profileImageUrl: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
    ];
    const profiles: FacultyProfile[] = [
      {
        id: "fp1",
        userId: instructorId,
        fullName: "Test Faculty",
        aka: null,
        bsDegree: null,
        msDegree: null,
        doctoralDegree: null,
        major1: null,
        major2: null,
        major3: null,
        minor1: null,
        minor2: null,
        minor3: null,
        research: "Research load",
        extension: null,
        production: null,
        specialTraining: null,
        status: "Organic",
        designation: "Program Chair",
        ratePerHour: null,
      },
    ];
    const justifications: ScheduleLoadJustification[] = [
      {
        id: "j1",
        academicPeriodId: periodId,
        collegeId,
        authorUserId: "admin-1",
        authorName: "College Admin",
        authorEmail: null,
        facultyUserId: instructorId,
        justification: "Fourth prep approved for coverage of IT 201.",
        violationsSnapshot: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        doiDecision: "pending",
      },
    ];
    const rows = buildTeachingLoadSummary({
      collegeId,
      academicPeriodId: periodId,
      entries,
      users,
      profiles,
      programs: [{ id: "prog1", collegeId }],
      sections: [{ id: "sec1", programId: "prog1", name: "1A", yearLevel: 1, studentCount: 40 }],
      subjects: [subjectDay, subjectEve],
      justifications,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].day.preps).toBe(1);
    expect(rows[0].day.hoursPerWeek).toBeCloseTo(3, 5);
    expect(rows[0].day.unitsPerWeek).toBe(3);
    expect(rows[0].evening.preps).toBe(1);
    expect(rows[0].evening.hoursPerWeek).toBeCloseTo(2, 5);
    expect(rows[0].evening.unitsPerWeek).toBe(3);
    expect(rows[0].totalHoursPerWeek).toBeCloseTo(5, 5);
    expect(rows[0].subjectsHandled).toContain("IT 101");
    expect(rows[0].subjectsHandled).toContain("IT 201");
    expect(rows[0].justification).toMatch(/Fourth prep/);
    expect(rows[0].administrativeDesignation).toBe("Program Chair");
    expect(rows[0].otherResponsibilities).toBe("Research load");
  });

  it("counts distinct subjects as preps, not meeting count", () => {
    const entries: ScheduleEntry[] = [
      entry({ id: "d1", subjectId: "sub-day", programMode: "day", day: "Monday" }),
      entry({ id: "d2", subjectId: "sub-day", programMode: "day", day: "Wednesday" }),
    ];
    const slice = metricsForEntries(entries, new Map([["sub-day", subjectDay]]));
    expect(slice.preps).toBe(1);
    expect(slice.hoursPerWeek).toBeCloseTo(4, 5);
  });
});
