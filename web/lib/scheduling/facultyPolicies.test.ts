import { describe, expect, it } from "vitest";
import { evaluateFacultyLoadsForCollege, rowNeedsTeachingLoadJustification } from "./facultyPolicies";
import type { FacultyProfile, ScheduleEntry, Subject, User } from "@/types/db";

const instructorId = "instr-1";
const periodId = "p1";
const subjectId = "sub1";
const sectionId = "sec1";
const roomId = "room1";

function makeEntry(id: string, startTime: string, endTime: string, day: string): ScheduleEntry {
  return {
    id,
    academicPeriodId: periodId,
    subjectId,
    instructorId,
    sectionId,
    roomId,
    day,
    startTime,
    endTime,
    status: "draft",
  };
}

const baseSubject: Subject = {
  id: subjectId,
  code: "IT 101",
  subcode: null,
  title: "Intro",
  lecUnits: 3,
  lecHours: 3,
  labUnits: 0,
  labHours: 0,
  programId: "prog1",
  yearLevel: 1,
};

function profile(status: string | null, designation: string | null): FacultyProfile {
  return {
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
    research: null,
    extension: null,
    production: null,
    specialTraining: null,
    status,
    designation,
    ratePerHour: null,
  };
}

const userRow: User = {
  id: instructorId,
  employeeId: null,
  email: "t@test.edu",
  name: "Test Faculty",
  role: "instructor",
  collegeId: "c1",
  chairmanProgramId: null,
  signatureImageUrl: null,
  profileImageUrl: null,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("evaluateFacultyLoadsForCollege / teaching-load justification gate", () => {
  it("does not treat “department” in appointment status as part-time (avoids false overload at ~15h)", () => {
    const entries: ScheduleEntry[] = [
      makeEntry("e1", "07:00", "10:00", "Monday"),
      makeEntry("e2", "07:00", "10:00", "Tuesday"),
      makeEntry("e3", "07:00", "10:00", "Wednesday"),
      makeEntry("e4", "07:00", "10:00", "Thursday"),
      makeEntry("e5", "07:00", "10:00", "Friday"),
    ];
    const subjects = new Map<string, Subject>([[subjectId, baseSubject]]);
    const users = new Map<string, User>([[instructorId, userRow]]);
    const profiles = new Map<string, FacultyProfile>([
      [instructorId, profile("Permanent · Department Chair", null)],
    ]);

    const { rows, hasTeachingLoadJustificationViolation } = evaluateFacultyLoadsForCollege(
      entries,
      subjects,
      users,
      profiles,
      "c1",
      () => null,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].weeklyTotalContactHours).toBeCloseTo(15, 5);
    expect(hasTeachingLoadJustificationViolation).toBe(false);
    expect(rowNeedsTeachingLoadJustification(rows[0])).toBe(false);
  });

  it("flags part-time faculty when weekly contact exceeds the part-time cap", () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const entries: ScheduleEntry[] = days.map((day, i) => makeEntry(`e${i}`, "07:00", "10:00", day));

    const subjects = new Map<string, Subject>([[subjectId, baseSubject]]);
    const users = new Map<string, User>([[instructorId, userRow]]);
    const profiles = new Map<string, FacultyProfile>([[instructorId, profile("Part-time", null)]]);

    const { rows, hasTeachingLoadJustificationViolation } = evaluateFacultyLoadsForCollege(
      entries,
      subjects,
      users,
      profiles,
      "c1",
      () => null,
    );

    expect(rows[0].weeklyTotalContactHours).toBeCloseTo(30, 5);
    expect(hasTeachingLoadJustificationViolation).toBe(true);
    expect(rowNeedsTeachingLoadJustification(rows[0])).toBe(true);
    expect(rows[0].violations.some((v) => v.code === "PARTTIME_WEEKLY_OVER_CAP")).toBe(true);
  });

  it("flags regular faculty without designation when contact exceeds the standard 24h/week", () => {
    const entries: ScheduleEntry[] = [
      makeEntry("e1", "07:00", "10:00", "Monday"),
      makeEntry("e2", "07:00", "10:00", "Tuesday"),
      makeEntry("e3", "07:00", "10:00", "Wednesday"),
      makeEntry("e4", "07:00", "10:00", "Thursday"),
      makeEntry("e5", "07:00", "10:00", "Friday"),
      makeEntry("e6", "07:00", "10:00", "Saturday"),
      makeEntry("e7", "13:00", "16:00", "Saturday"),
      makeEntry("e8", "13:00", "16:00", "Sunday"),
      makeEntry("e9", "07:00", "09:00", "Monday"),
    ];
    // 8×3h + 2h = 26h > 24

    const subjects = new Map<string, Subject>([[subjectId, baseSubject]]);
    const users = new Map<string, User>([[instructorId, userRow]]);
    const profiles = new Map<string, FacultyProfile>([[instructorId, profile("Permanent", null)]]);

    const { rows, hasTeachingLoadJustificationViolation } = evaluateFacultyLoadsForCollege(
      entries,
      subjects,
      users,
      profiles,
      "c1",
      () => null,
    );

    expect(rows[0].weeklyTotalContactHours).toBeCloseTo(26, 5);
    expect(hasTeachingLoadJustificationViolation).toBe(true);
    expect(rows[0].violations.some((v) => v.code === "OVER_STANDARD_TEACHING_LOAD")).toBe(true);
  });
});
