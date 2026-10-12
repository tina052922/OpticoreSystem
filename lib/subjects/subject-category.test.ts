import { describe, expect, it } from "vitest";
import {
  CAMPUS_SUBJECT_CATEGORIES,
  isCampusSubjectCategory,
  normalizeSubjectCategory,
  normalizeSubjectCategoryCode,
  normalizeSubjectSemester,
  subjectCategoriesForProgram,
  subjectCategoryLabel,
  subjectSemesterLabel,
  suggestSubjectCategory,
  type SubjectCategoryRow,
} from "./subject-category";

const cat = (over: Partial<SubjectCategoryRow> & { code: string }): SubjectCategoryRow => ({
  id: `c-${over.code}`,
  programId: "prog-bsit",
  label: over.code.toUpperCase(),
  sortOrder: 100,
  ...over,
});

/** A program's own list as a chairman would build it, alongside the campus three. */
const bsit = [
  ...CAMPUS_SUBJECT_CATEGORIES,
  cat({ code: "major", label: "Major", sortOrder: 100 }),
  cat({ code: "minor", label: "Minor", sortOrder: 110 }),
  cat({ code: "elective", label: "Professional Elective", sortOrder: 120 }),
];

describe("normalizeSubjectCategoryCode", () => {
  it("stores one spelling for what a person types several ways", () => {
    expect(normalizeSubjectCategoryCode("Professional Elective")).toBe("professional-elective");
    expect(normalizeSubjectCategoryCode("  professional-elective  ")).toBe("professional-elective");
    expect(normalizeSubjectCategoryCode("PROFESSIONAL_ELECTIVE")).toBe("professional-elective");
  });

  it("trims punctuation off the ends rather than keeping a dangling dash", () => {
    expect(normalizeSubjectCategoryCode("-major-")).toBe("major");
    expect(normalizeSubjectCategoryCode("!!!")).toBe("");
    expect(normalizeSubjectCategoryCode(null)).toBe("");
  });
});

describe("subjectCategoriesForProgram", () => {
  /** The three every program teaches, available without anyone adding them. */
  it("always offers the campus-wide categories", () => {
    const codes = subjectCategoriesForProgram(CAMPUS_SUBJECT_CATEGORIES, "prog-anything").map(
      (c) => c.code,
    );
    expect(codes).toEqual(["gec", "gee", "pe", "nstp"]);
  });

  /** The reason this is data: BSIT's majors are not BSENVS's majors. */
  it("offers a program its own categories and not another program's", () => {
    const all = [
      ...bsit,
      cat({ code: "field-work", label: "Field Work", programId: "prog-bsenvs" }),
    ];
    const codes = subjectCategoriesForProgram(all, "prog-bsit").map((c) => c.code);
    expect(codes).toContain("major");
    expect(codes).not.toContain("field-work");
  });

  it("offers only the campus three when the program has added none", () => {
    const codes = subjectCategoriesForProgram(bsit, "prog-bsenvs").map((c) => c.code);
    expect(codes).toEqual(["gec", "gee", "pe", "nstp"]);
  });

  it("orders by sortOrder, then label, so the list does not shuffle", () => {
    const codes = subjectCategoriesForProgram(bsit, "prog-bsit").map((c) => c.code);
    expect(codes).toEqual(["gec", "gee", "pe", "nstp", "major", "minor", "elective"]);
  });

  it("shows one entry when a program defines a code the campus already has", () => {
    const all = [...CAMPUS_SUBJECT_CATEGORIES, cat({ code: "gec", label: "Gen Ed (BSIT)" })];
    const gec = subjectCategoriesForProgram(all, "prog-bsit").filter((c) => c.code === "gec");
    expect(gec).toHaveLength(1);
  });

  it("gives nothing program-specific when no program is selected", () => {
    expect(subjectCategoriesForProgram(bsit, null).map((c) => c.code)).toEqual([
      "gec",
      "gee",
      "pe",
      "nstp",
    ]);
  });
});

describe("isCampusSubjectCategory", () => {
  it("marks the ones a chairman may not edit", () => {
    expect(isCampusSubjectCategory({ programId: null })).toBe(true);
    expect(isCampusSubjectCategory({ programId: "prog-bsit" })).toBe(false);
  });
});

describe("normalizeSubjectCategory", () => {
  it("accepts a code the program offers, however it is cased", () => {
    expect(normalizeSubjectCategory("major", bsit)).toBe("major");
    expect(normalizeSubjectCategory("MAJOR", bsit)).toBe("major");
  });

  it("blanks a code the program does not offer", () => {
    // BSENVS has no "major" row of its own, so the value means nothing there.
    expect(normalizeSubjectCategory("major", CAMPUS_SUBJECT_CATEGORIES)).toBe("");
    expect(normalizeSubjectCategory("core", bsit)).toBe("");
    expect(normalizeSubjectCategory(null, bsit)).toBe("");
  });

  it("falls back to the campus three when no catalog is given", () => {
    expect(normalizeSubjectCategory("gec")).toBe("gec");
    expect(normalizeSubjectCategory("major")).toBe("");
  });
});

describe("subjectCategoryLabel", () => {
  it("prints the label the chairman chose, not the stored code", () => {
    expect(subjectCategoryLabel("elective", bsit)).toBe("Professional Elective");
    expect(subjectCategoryLabel("major", bsit)).toBe("Major");
    expect(subjectCategoryLabel("nstp", bsit)).toBe("NSTP");
  });

  it("falls back for rows with no category this program knows", () => {
    expect(subjectCategoryLabel(null, bsit)).toBe("—");
    expect(subjectCategoryLabel("nonsense", bsit, "Unset")).toBe("Unset");
  });
});

describe("suggestSubjectCategory", () => {
  it("reads the category a code states outright", () => {
    expect(suggestSubjectCategory("GEC-101", bsit)).toBe("gec");
    // GEE is the elective half of general education and has a category of its own.
    expect(suggestSubjectCategory("gee 3", bsit)).toBe("gee");
    expect(suggestSubjectCategory("GEE-TEM", bsit)).toBe("gee");
    expect(suggestSubjectCategory("NSTP-1", bsit)).toBe("nstp");
    expect(suggestSubjectCategory("PATHFIT 2", bsit)).toBe("pe");
    expect(suggestSubjectCategory("PE-1", bsit)).toBe("pe");
  });

  it("says nothing when the code cannot tell major from minor", () => {
    expect(suggestSubjectCategory("CC-111", bsit)).toBe("");
    expect(suggestSubjectCategory("BSENVS 201", bsit)).toBe("");
    expect(suggestSubjectCategory("", bsit)).toBe("");
    expect(suggestSubjectCategory(null, bsit)).toBe("");
  });

  it("does not mistake a code that merely starts with the letters P and E", () => {
    expect(suggestSubjectCategory("PERDEV-1", bsit)).toBe("");
  });

  /** A suggestion the program cannot store is worse than no suggestion. */
  it("suggests nothing the program does not offer", () => {
    const noPe = bsit.filter((c) => c.code !== "pe");
    expect(suggestSubjectCategory("PATHFIT 2", noPe)).toBe("");
  });

  /** A catalog from before GEE existed still has somewhere sensible to put it. */
  it("falls back to GEC for a GEE code when the catalog has no GEE", () => {
    const noGee = bsit.filter((c) => c.code !== "gee");
    expect(suggestSubjectCategory("GEE-TEM", noGee)).toBe("gec");
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
