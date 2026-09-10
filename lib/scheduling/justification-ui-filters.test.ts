import { describe, expect, it } from "vitest";
import {
  evaluateFacultyLoadsForCollege,
  rowNeedsTeachingLoadJustification,
} from "./facultyPolicies";
import type { FacultyProfile, ScheduleEntry, Subject, User } from "@/types/db";

/**
 * Mirrors BsitChairmanEvaluatorWorksheet justification UI filters:
 * - full FAQ / form only for unjustified violators
 * - prep notice only after a justification is recorded
 */
function unjustifiedRows(
  rows: ReturnType<typeof evaluateFacultyLoadsForCollege>["rows"],
  recordedFacultyIds: Set<string>,
) {
  return rows.filter((r) => rowNeedsTeachingLoadJustification(r) && !recordedFacultyIds.has(r.instructorId));
}

function justifiedPrepWarnings(
  rows: ReturnType<typeof evaluateFacultyLoadsForCollege>["rows"],
  recordedFacultyIds: Set<string>,
) {
  return rows.filter(
    (r) =>
      recordedFacultyIds.has(r.instructorId) &&
      r.violations.some((v) => v.code === "OVER_PREP_LIMIT"),
  );
}

const instructorId = "instr-1";
const periodId = "p1";

function subject(id: string, code: string): Subject {
  return {
    id,
    code,
    subcode: null,
    title: code,
    lecUnits: 3,
    lecHours: 3,
    labUnits: 0,
    labHours: 0,
    programId: "prog1",
    yearLevel: 1,
  };
}

function entry(id: string, subjectId: string, day: string): ScheduleEntry {
  return {
    id,
    academicPeriodId: periodId,
    subjectId,
    instructorId,
    sectionId: "sec1",
    roomId: "room1",
    day,
    startTime: "08:00",
    endTime: "11:00",
    status: "draft",
    programMode: "day",
  };
}

describe("justification UI filters (worksheet behavior)", () => {
  const subjects = [
    subject("s1", "IT-101"),
    subject("s2", "IT-102"),
    subject("s3", "IT-103"),
    subject("s4", "IT-104"),
  ];
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const user: User = {
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
  const profile: FacultyProfile = {
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
    status: "Resident",
    designation: null,
    ratePerHour: null,
  };

  it("shows full justification UI only for unrecorded prep violators", () => {
    const entries = [
      entry("e1", "s1", "Monday"),
      entry("e2", "s2", "Tuesday"),
      entry("e3", "s3", "Wednesday"),
      entry("e4", "s4", "Thursday"),
    ];
    const { rows } = evaluateFacultyLoadsForCollege(
      entries,
      subjectById,
      new Map([[instructorId, user]]),
      new Map([[instructorId, profile]]),
      "c1",
      () => "c1",
    );
    expect(rows[0]?.preparations).toBe(4);
    expect(rowNeedsTeachingLoadJustification(rows[0]!)).toBe(true);

    const before = unjustifiedRows(rows, new Set());
    expect(before).toHaveLength(1);
    expect(justifiedPrepWarnings(rows, new Set())).toHaveLength(0);

    const afterRecord = unjustifiedRows(rows, new Set([instructorId]));
    expect(afterRecord).toHaveLength(0);
    expect(justifiedPrepWarnings(rows, new Set([instructorId]))).toHaveLength(1);
  });

  it("counts lec+lab of the same course as one prep", () => {
    const lec = subject("cc", "CC-112");
    const lab = { ...subject("ccl", "CC-112L"), lecUnits: 0, labUnits: 1, lecHours: 0, labHours: 3 };
    const map = new Map<string, Subject>([
      [lec.id, lec],
      [lab.id, lab],
      ...subjects.map((s) => [s.id, s] as const),
    ]);
    const entries = [
      entry("a", "cc", "Monday"),
      entry("b", "ccl", "Tuesday"),
      entry("c", "s1", "Wednesday"),
      entry("d", "s2", "Thursday"),
      entry("e", "s3", "Friday"),
    ];
    const { rows } = evaluateFacultyLoadsForCollege(
      entries,
      map,
      new Map([[instructorId, user]]),
      new Map([[instructorId, profile]]),
      "c1",
      () => "c1",
    );
    // CC-112 + CC-112L + 3 others = 4 preps (not 5)
    expect(rows[0]?.preparations).toBe(4);
  });
});
