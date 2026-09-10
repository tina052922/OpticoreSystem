import { describe, expect, it } from "vitest";
import {
  FACULTY_CATEGORY_GEC,
  FACULTY_CATEGORY_PROGRAM,
  isGecFacultyCategory,
  isGecInstructorUser,
  parseFacultyCategory,
} from "./faculty-category";

describe("faculty category", () => {
  it("defaults unknown values to program", () => {
    expect(parseFacultyCategory(undefined)).toBe(FACULTY_CATEGORY_PROGRAM);
    expect(parseFacultyCategory("")).toBe(FACULTY_CATEGORY_PROGRAM);
    expect(parseFacultyCategory("program")).toBe(FACULTY_CATEGORY_PROGRAM);
  });

  it("recognizes GEC instructor category", () => {
    expect(parseFacultyCategory("gec")).toBe(FACULTY_CATEGORY_GEC);
    expect(parseFacultyCategory("GEC")).toBe(FACULTY_CATEGORY_GEC);
    expect(isGecFacultyCategory("gec")).toBe(true);
    expect(isGecInstructorUser({ facultyCategory: "gec" })).toBe(true);
    expect(isGecInstructorUser({ facultyCategory: "program" })).toBe(false);
  });
});
