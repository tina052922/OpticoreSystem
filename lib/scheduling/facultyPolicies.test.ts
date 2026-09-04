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
  it("does not treat “department” in appointment status as non-resident (avoids false overload at ~15h)", () => {
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

  it.each([
    ["Non-resident", "current label"],
    ["Part-time", "rows saved before the Resident / Non-resident rename"],
  ])("flags %s faculty over the non-resident cap (%s)", (status) => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const entries: ScheduleEntry[] = days.map((day, i) => makeEntry(`e${i}`, "07:00", "10:00", day));

    const subjects = new Map<string, Subject>([[subjectId, baseSubject]]);
    const users = new Map<string, User>([[instructorId, userRow]]);
    const profiles = new Map<string, FacultyProfile>([[instructorId, profile(status, null)]]);

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

  it("keeps Resident faculty on the standard cap, not the non-resident one", () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Monday", "Tuesday", "Wednesday"];
    const entries: ScheduleEntry[] = days.map((day, i) => makeEntry(`e${i}`, "07:00", "10:00", day));

    const subjects = new Map<string, Subject>([[subjectId, baseSubject]]);
    const users = new Map<string, User>([[instructorId, userRow]]);
    const profiles = new Map<string, FacultyProfile>([[instructorId, profile("Resident", null)]]);

    const { rows } = evaluateFacultyLoadsForCollege(entries, subjects, users, profiles, "c1", () => null);

    // 24 h/wk sits above the 24 h standard only by rounding, so the standard cap is what applies here.
    expect(rows[0].effectiveTeachingCap).toBe(24);
    expect(rows[0].violations.some((v) => v.code === "PARTTIME_WEEKLY_OVER_CAP")).toBe(false);
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

  it("counts Day and Night contact separately when callers pass one program's rows", () => {
    const dayOnly: ScheduleEntry[] = [
      { ...makeEntry("d1", "08:00", "10:00", "Monday"), programMode: "day" },
    ];
    const nightOnly: ScheduleEntry[] = [
      { ...makeEntry("n1", "18:00", "20:00", "Monday"), programMode: "night" },
    ];
    const mixed: ScheduleEntry[] = [...dayOnly, ...nightOnly];
    const subjects = new Map([[subjectId, baseSubject]]);
    const users = new Map([[instructorId, userRow]]);
    const profiles = new Map([[instructorId, profile("Regular", null)]]);

    const dayLoad = evaluateFacultyLoadsForCollege(dayOnly, subjects, users, profiles, "c1", () => "c1");
    const nightLoad = evaluateFacultyLoadsForCollege(nightOnly, subjects, users, profiles, "c1", () => "c1");
    const mixedLoad = evaluateFacultyLoadsForCollege(mixed, subjects, users, profiles, "c1", () => "c1");

    expect(dayLoad.rows[0].weeklyTotalContactHours).toBeCloseTo(2, 5);
    expect(nightLoad.rows[0].weeklyTotalContactHours).toBeCloseTo(2, 5);
    expect(mixedLoad.rows[0].weeklyTotalContactHours).toBeCloseTo(4, 5);
  });

  it("requires justification when assigning would reach 4 distinct subject preps", () => {
    const subjects = new Map<string, Subject>([
      [subjectId, baseSubject],
      ["sub2", { ...baseSubject, id: "sub2", code: "IT 102" }],
      ["sub3", { ...baseSubject, id: "sub3", code: "IT 103" }],
      ["sub4", { ...baseSubject, id: "sub4", code: "IT 104" }],
    ]);
    const threePreps: ScheduleEntry[] = [
      { ...makeEntry("e1", "08:00", "09:00", "Monday"), subjectId },
      { ...makeEntry("e2", "08:00", "09:00", "Tuesday"), subjectId: "sub2" },
      { ...makeEntry("e3", "08:00", "09:00", "Wednesday"), subjectId: "sub3" },
    ];
    const fourPreps: ScheduleEntry[] = [
      ...threePreps,
      { ...makeEntry("e4", "08:00", "09:00", "Thursday"), subjectId: "sub4" },
    ];
    const users = new Map([[instructorId, userRow]]);
    const profiles = new Map([[instructorId, profile("Regular", null)]]);

    const under = evaluateFacultyLoadsForCollege(threePreps, subjects, users, profiles, "c1", () => "c1");
    const over = evaluateFacultyLoadsForCollege(fourPreps, subjects, users, profiles, "c1", () => "c1");

    expect(under.rows[0].preparations).toBe(3);
    expect(rowNeedsTeachingLoadJustification(under.rows[0])).toBe(false);
    expect(over.rows[0].preparations).toBe(4);
    expect(over.hasTeachingLoadJustificationViolation).toBe(true);
    expect(rowNeedsTeachingLoadJustification(over.rows[0])).toBe(true);
    expect(over.rows[0].violations.some((v) => v.code === "OVER_PREP_LIMIT")).toBe(true);
  });

  it("counts lecture and lab of the same subject as one prep", () => {
    const subjects = new Map<string, Subject>([
      ["lec", { ...baseSubject, id: "lec", code: "CC-112" }],
      ["lab", { ...baseSubject, id: "lab", code: "CC-112L", lecUnits: 0, labUnits: 1 }],
    ]);
    const entries: ScheduleEntry[] = [
      { ...makeEntry("e1", "08:00", "10:00", "Monday"), subjectId: "lec" },
      { ...makeEntry("e2", "10:00", "13:00", "Monday"), subjectId: "lab" },
    ];
    const users = new Map([[instructorId, userRow]]);
    const profiles = new Map([[instructorId, profile("Regular", null)]]);
    const { rows } = evaluateFacultyLoadsForCollege(entries, subjects, users, profiles, "c1", () => "c1");
    expect(rows[0].preparations).toBe(1);
    expect(rows[0].violations.some((v) => v.code === "OVER_PREP_LIMIT")).toBe(false);
  });

  it("does not treat repeated meetings of the same subject as extra preps", () => {
    const entries: ScheduleEntry[] = [
      makeEntry("e1", "08:00", "09:00", "Monday"),
      makeEntry("e2", "08:00", "09:00", "Tuesday"),
      makeEntry("e3", "08:00", "09:00", "Wednesday"),
      makeEntry("e4", "08:00", "09:00", "Thursday"),
    ];
    const subjects = new Map([[subjectId, baseSubject]]);
    const users = new Map([[instructorId, userRow]]);
    const profiles = new Map([[instructorId, profile("Regular", null)]]);
    const { rows } = evaluateFacultyLoadsForCollege(entries, subjects, users, profiles, "c1", () => "c1");
    expect(rows[0].preparations).toBe(1);
    expect(rows[0].violations.some((v) => v.code === "OVER_PREP_LIMIT")).toBe(false);
  });
});

describe("weekly contact reference bound (resident 40 vs non-resident 49)", () => {
  /** 14 three-hour meetings = 42 hrs/wk: past the resident bound, still under the non-resident one. */
  function rowsAt42Hours(status: string) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Monday"];
    const entries: ScheduleEntry[] = [...days, ...days].map((day, i) =>
      makeEntry(`e${i}`, i % 2 === 0 ? "07:00" : "13:00", i % 2 === 0 ? "10:00" : "16:00", day),
    );
    const subjects = new Map<string, Subject>([[subjectId, baseSubject]]);
    const users = new Map<string, User>([[instructorId, userRow]]);
    const profiles = new Map<string, FacultyProfile>([[instructorId, profile(status, null)]]);
    return evaluateFacultyLoadsForCollege(entries, subjects, users, profiles, "c1", () => "c1").rows;
  }

  it("flags resident faculty past 40 hrs/wk", () => {
    const rows = rowsAt42Hours("Resident");
    expect(rows[0].weeklyTotalContactHours).toBeCloseTo(42, 5);
    expect(rows[0].violations.some((v) => v.code === "WEEKLY_CONTACT_OVER_RESIDENT_MAX")).toBe(true);
  });

  it("leaves non-resident faculty unflagged at the same hours, since their bound is 49", () => {
    const rows = rowsAt42Hours("Non-resident");
    expect(rows[0].weeklyTotalContactHours).toBeCloseTo(42, 5);
    expect(rows[0].violations.some((v) => v.code === "WEEKLY_CONTACT_OVER_RESIDENT_MAX")).toBe(false);
    expect(rows[0].violations.some((v) => v.code === "WEEKLY_CONTACT_OVER_NON_RESIDENT_MAX")).toBe(false);
  });

  it("flags non-resident faculty once they pass 49 hrs/wk", () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const entries: ScheduleEntry[] = [
      ...days.map((day, i) => makeEntry(`a${i}`, "07:00", "12:00", day)),
      ...days.map((day, i) => makeEntry(`b${i}`, "13:00", "17:00", day)),
    ];
    const subjects = new Map<string, Subject>([[subjectId, baseSubject]]);
    const users = new Map<string, User>([[instructorId, userRow]]);
    const profiles = new Map<string, FacultyProfile>([[instructorId, profile("Non-resident", null)]]);

    const { rows } = evaluateFacultyLoadsForCollege(entries, subjects, users, profiles, "c1", () => "c1");

    expect(rows[0].weeklyTotalContactHours).toBeCloseTo(54, 5);
    expect(rows[0].violations.some((v) => v.code === "WEEKLY_CONTACT_OVER_NON_RESIDENT_MAX")).toBe(true);
  });
});
