/**
 * Summary of Teaching Load — acceptance checks:
 *   1. The same subject in Day and Evening is listed once in Subjects Handled.
 *   2. Total Preps counts unique subject codes only.
 *   3. Total Hours = Day hours/week + Evening hours/week.
 *   4. Both exports work and carry the same values (Excel cells, PDF renders).
 */
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { pdf } from "@react-pdf/renderer";
import { buildTeachingLoadSummaryByCategory } from "./teaching-load-summary";
import { buildTeachingLoadSummaryWorkbook } from "./teaching-load-summary-export";
import { buildTeachingLoadSignatories, departmentHeading } from "./teaching-load-signatories";
import { TeachingLoadSummaryDocument } from "@/components/pdf/forms/TeachingLoadSummaryDocument";
import type { FacultyProfile, ScheduleEntry, Subject, User } from "@/types/db";

const PERIOD = "ap-1";
const COLLEGE = "col-cote";
const PROGRAM = "prog-bsit";
const FACULTY = "u-tomol";

function subject(id: string, code: string, lecUnits: number, labUnits = 0): Subject {
  return {
    id,
    code,
    subcode: null,
    title: code,
    lecUnits,
    lecHours: lecUnits,
    labUnits,
    labHours: labUnits * 3,
    programId: PROGRAM,
    yearLevel: 1,
  };
}

const subjects = [
  subject("s-cc121", "CC121", 3),
  subject("s-gecpc", "GEC-PC", 3),
  subject("s-pe1", "PE 1", 2),
];

let seq = 0;
function plot(subjectId: string, mode: "day" | "night", start: string, end: string, sectionId = "sec-1a"): ScheduleEntry {
  seq += 1;
  return {
    id: `e${seq}`,
    academicPeriodId: PERIOD,
    subjectId,
    instructorId: FACULTY,
    sectionId,
    roomId: "room-1",
    day: "Monday",
    startTime: start,
    endTime: end,
    status: "draft",
    programMode: mode,
  };
}

/**
 * Day:     CC121 (3 h), GEC-PC (2 h)              → 2 preps, 5 h
 * Evening: CC121 again (2 h), PE 1 (1.5 h)         → 2 preps, 3.5 h
 * Combined unique codes: CC121, GEC-PC, PE 1      → Total Preps 3, Total Hours 8.5
 */
const entries: ScheduleEntry[] = [
  plot("s-cc121", "day", "07:00", "10:00"),
  plot("s-gecpc", "day", "10:00", "12:00"),
  plot("s-cc121", "night", "17:00", "19:00", "sec-1b"),
  plot("s-pe1", "night", "19:00", "20:30", "sec-1b"),
];

const users = [
  {
    id: FACULTY,
    employeeId: "E1",
    email: "tomol@ctu.edu.ph",
    name: "Christine Joy A. Tomol",
    role: "chairman_admin",
    collegeId: COLLEGE,
    chairmanProgramId: PROGRAM,
    signatureImageUrl: null,
    profileImageUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
] as unknown as User[];

const profiles = [
  {
    id: "fp-1",
    userId: FACULTY,
    fullName: "Dr. Christine Joy A. Tomol",
    designation: "Chair, BSIT",
    research: "Research Coordinator",
  },
] as unknown as FacultyProfile[];

function buildGroups() {
  return buildTeachingLoadSummaryByCategory({
    collegeId: COLLEGE,
    academicPeriodId: PERIOD,
    entries,
    users,
    profiles,
    programs: [{ id: PROGRAM, collegeId: COLLEGE, code: "BSIT", name: "Bachelor of Science in Information Technology" }],
    sections: [
      { id: "sec-1a", programId: PROGRAM, name: "1A", yearLevel: 1, studentCount: 40 },
      { id: "sec-1b", programId: PROGRAM, name: "1B", yearLevel: 1, studentCount: 35, programMode: "night" },
    ],
    subjects,
    justifications: [],
  }).map((g, i) => ({ ...g, heading: departmentHeading(g, i) }));
}

function theRow() {
  const groups = buildGroups();
  const row = groups[0]?.rows.find((r) => r.instructorId === FACULTY);
  if (!row) throw new Error("faculty row missing");
  return { groups, row };
}

describe("Summary of Teaching Load — Subjects Handled", () => {
  it("lists a subject taught in both Day and Evening once", () => {
    const { row } = theRow();
    const codes = row.subjectsHandled.split(",").map((c) => c.trim());
    expect(codes.filter((c) => c === "CC121")).toHaveLength(1);
    expect(codes).toEqual(["CC121", "GEC-PC", "PE 1"]);
  });

  it("still keeps Day and Evening preps separate in their own columns", () => {
    const { row } = theRow();
    expect(row.day.preps).toBe(2);
    expect(row.evening.preps).toBe(2);
  });
});

describe("Summary of Teaching Load — Total Preps", () => {
  it("counts unique subject codes only (CC121, GEC-PC, PE 1 → 3)", () => {
    const { row } = theRow();
    expect(row.totalPreps).toBe(3);
    // Not Day preps + Evening preps (2 + 2 = 4).
    expect(row.totalPreps).not.toBe(row.day.preps + row.evening.preps);
  });

  it("equals the number of codes in Subjects Handled", () => {
    const { row } = theRow();
    expect(row.totalPreps).toBe(row.subjectsHandled.split(",").length);
  });
});

describe("Summary of Teaching Load — Total Hours", () => {
  it("is Day hours/week + Evening hours/week", () => {
    const { row } = theRow();
    expect(row.day.hoursPerWeek).toBe(5);
    expect(row.evening.hoursPerWeek).toBe(3.5);
    expect(row.totalHoursPerWeek).toBe(8.5);
    expect(row.totalHoursPerWeek).toBe(row.day.hoursPerWeek + row.evening.hoursPerWeek);
  });
});

describe("Summary of Teaching Load — exports", () => {
  it("Excel: builds a workbook whose row carries the same subjects, total preps and total hours", async () => {
    const { groups, row } = theRow();
    const signatories = buildTeachingLoadSignatories({ college: null, groups, users });
    const blob = await buildTeachingLoadSummaryWorkbook({
      collegeName: "College of Technology and Engineering",
      semesterLabel: "First Semester, A.Y. 2026-2027",
      groups,
      signatories,
      headerBannerUrl: null,
      footerBannerUrl: null,
    });
    expect(blob.size).toBeGreaterThan(1000);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const ws = wb.worksheets[0]!;
    let found: ExcelJS.Row | null = null;
    ws.eachRow((r) => {
      if (r.getCell(2).value === row.facultyName) found = r;
    });
    expect(found).not.toBeNull();
    const r = found as unknown as ExcelJS.Row;
    expect(r.getCell(5).value).toBe(row.day.preps); // DAY · PREPS
    expect(r.getCell(7).value).toBe(row.day.hoursPerWeek); // DAY · HOURS/WEEK
    expect(r.getCell(8).value).toBe(row.evening.preps); // EVENING · PREPS
    expect(r.getCell(10).value).toBe(row.evening.hoursPerWeek); // EVENING · HOURS/WEEK
    expect(r.getCell(11).value).toBe(3); // TOTAL PREPS/WEEK
    expect(r.getCell(12).value).toBe(8.5); // TOTAL HOURS/WEEK
    expect(r.getCell(13).value).toBe("CC121, GEC-PC, PE 1"); // SUBJECT HANDLED

    // Title block and the signatory labels are on the sheet too.
    const text: string[] = [];
    ws.eachRow((x) => x.eachCell((c) => text.push(String(c.value ?? ""))));
    expect(text).toContain("Summary of Teaching Load");
    expect(text).toContain("Prepared by:");
    expect(text).toContain("Approved by:");
  });

  it("PDF: renders the same rows to a real PDF file", async () => {
    const { groups } = theRow();
    const signatories = buildTeachingLoadSignatories({ college: null, groups, users });
    const doc = createElement(TeachingLoadSummaryDocument, {
      collegeName: "College of Technology and Engineering",
      semesterLabel: "First Semester, A.Y. 2026-2027",
      groups,
      signatories,
      headerBanner: null,
      footerBanner: null,
    });
    const blob = await pdf(doc as Parameters<typeof pdf>[0]).toBlob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(1000);
    // A real PDF starts with the %PDF- signature.
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  }, 30_000);
});
