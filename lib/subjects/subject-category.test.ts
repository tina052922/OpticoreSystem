import { describe, expect, it } from "vitest";
import {
  SUBJECT_CATEGORIES,
  normalizeSubjectCategory,
  normalizeSubjectSemester,
  subjectCategoryLabel,
  subjectSemesterLabel,
  suggestSubjectCategory,
} from "./subject-category";

describe("normalizeSubjectCategory", () => {
  it("accepts every stored value, case-insensitively", () => {
    for (const { value } of SUBJECT_CATEGORIES) {
      expect(normalizeSubjectCategory(value)).toBe(value);
      expect(normalizeSubjectCategory(value.toUpperCase())).toBe(value);
    }
  });

  it("blanks anything unknown rather than passing it through", () => {
    expect(normalizeSubjectCategory("core")).toBe("");
    expect(normalizeSubjectCategory("")).toBe("");
    expect(normalizeSubjectCategory(null)).toBe("");
  });
});

describe("subjectCategoryLabel", () => {
  it("prints the label a person reads", () => {
    expect(subjectCategoryLabel("major")).toBe("Major");
    expect(subjectCategoryLabel("nstp")).toBe("NSTP");
    expect(subjectCategoryLabel("pe")).toBe("PE");
  });

  it("falls back for rows with no category yet", () => {
    expect(subjectCategoryLabel(null)).toBe("—");
    expect(subjectCategoryLabel("nonsense", "Unset")).toBe("Unset");
  });
});

describe("suggestSubjectCategory", () => {
  it("reads the category a code states outright", () => {
    expect(suggestSubjectCategory("GEC-101")).toBe("gec");
    expect(suggestSubjectCategory("gee 3")).toBe("elective");
    expect(suggestSubjectCategory("NSTP-1")).toBe("nstp");
    expect(suggestSubjectCategory("PATHFIT 2")).toBe("pe");
    expect(suggestSubjectCategory("PE-1")).toBe("pe");
  });

  it("says nothing when the code cannot tell major from minor", () => {
    expect(suggestSubjectCategory("CC-111")).toBe("");
    expect(suggestSubjectCategory("BSENVS 201")).toBe("");
    expect(suggestSubjectCategory("")).toBe("");
    expect(suggestSubjectCategory(null)).toBe("");
  });

  it("does not mistake a code that merely starts with the letters P and E", () => {
    expect(suggestSubjectCategory("PERDEV-1")).toBe("");
  });
});

describe("semester helpers", () => {
  it("accepts only the two semesters", () => {
    expect(normalizeSubjectSemester(1)).toBe(1);
    expect(normalizeSubjectSemester("2")).toBe(2);
    expect(normalizeSubjectSemester(3)).toBeNull();
    expect(normalizeSubjectSemester(null)).toBeNull();
    expect(normalizeSubjectSemester("summer")).toBeNull();
  });

  it("labels them for a table cell", () => {
    expect(subjectSemesterLabel(1)).toBe("1st");
    expect(subjectSemesterLabel(2)).toBe("2nd");
    expect(subjectSemesterLabel(null)).toBe("—");
  });
});
