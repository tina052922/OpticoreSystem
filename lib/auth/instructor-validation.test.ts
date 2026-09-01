import { describe, expect, it } from "vitest";
import {
  isPlottableFacultyUser,
  normalizeInstructorValidation,
} from "./instructor-validation";

describe("normalizeInstructorValidation", () => {
  it("treats missing values as active so existing faculty keep access", () => {
    expect(normalizeInstructorValidation(null)).toBe("active");
    expect(normalizeInstructorValidation(undefined)).toBe("active");
  });
});

describe("isPlottableFacultyUser", () => {
  it("excludes pending and rejected instructors from plotting lists", () => {
    expect(isPlottableFacultyUser({ role: "instructor", instructorValidation: "pending" })).toBe(false);
    expect(isPlottableFacultyUser({ role: "instructor", instructorValidation: "rejected" })).toBe(false);
    expect(isPlottableFacultyUser({ role: "instructor" })).toBe(true);
    expect(isPlottableFacultyUser({ role: "chairman_admin", instructorValidation: "pending" })).toBe(true);
  });
});
