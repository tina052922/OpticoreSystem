import { describe, expect, it } from "vitest";
import {
  FACULTY_EMPLOYMENT_NON_RESIDENT,
  FACULTY_EMPLOYMENT_RESIDENT,
  isNonResidentFacultyStatus,
  normalizeFacultyProfileStatus,
} from "./employment-status";

describe("normalizeFacultyProfileStatus", () => {
  it("maps legacy Organic / Permanent rows to Resident", () => {
    expect(normalizeFacultyProfileStatus("Organic")).toBe(FACULTY_EMPLOYMENT_RESIDENT);
    expect(normalizeFacultyProfileStatus("Permanent")).toBe(FACULTY_EMPLOYMENT_RESIDENT);
    expect(normalizeFacultyProfileStatus(null)).toBe(FACULTY_EMPLOYMENT_RESIDENT);
  });

  it("maps legacy Part-time rows to Non-resident so their cap is unchanged", () => {
    expect(normalizeFacultyProfileStatus("Part-time")).toBe(FACULTY_EMPLOYMENT_NON_RESIDENT);
    expect(normalizeFacultyProfileStatus("part time")).toBe(FACULTY_EMPLOYMENT_NON_RESIDENT);
  });

  it("round-trips the two current labels", () => {
    expect(normalizeFacultyProfileStatus("Resident")).toBe(FACULTY_EMPLOYMENT_RESIDENT);
    expect(normalizeFacultyProfileStatus("Non-resident")).toBe(FACULTY_EMPLOYMENT_NON_RESIDENT);
  });

  it("does not read “department” as Non-resident", () => {
    expect(normalizeFacultyProfileStatus("Permanent · Department Chair")).toBe(FACULTY_EMPLOYMENT_RESIDENT);
    expect(isNonResidentFacultyStatus("Department Chairperson")).toBe(false);
  });
});
