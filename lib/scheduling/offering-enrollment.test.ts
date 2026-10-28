import { describe, expect, it } from "vitest";
import {
  MAX_OFFERING_ENROLLMENT,
  applyOfferingEnrollmentToRows,
  enrollmentForOffering,
  enrollmentForStorage,
  insCourseEnrollment,
  isCompleteEnrollment,
  offeringEnrollmentIndex,
  offeringKey,
  parseEnrollmentInput,
} from "./offering-enrollment";

describe("offeringKey", () => {
  it("ignores case, spaces and dashes in the subject code", () => {
    expect(offeringKey("sec-3a", "cc 112")).toBe(offeringKey("sec-3a", "CC-112"));
  });

  it("keeps lecture and laboratory apart — they enroll and print separately", () => {
    expect(offeringKey("sec-3a", "CC-112")).not.toBe(offeringKey("sec-3a", "CC-112L"));
  });

  it("keeps the same subject in different sections apart", () => {
    expect(offeringKey("sec-3a", "CC-112")).not.toBe(offeringKey("sec-3b", "CC-112"));
  });
});

describe("isCompleteEnrollment", () => {
  it("accepts a real head count and rejects the blank, the zero and the absurd", () => {
    expect(isCompleteEnrollment(1)).toBe(true);
    expect(isCompleteEnrollment(MAX_OFFERING_ENROLLMENT)).toBe(true);
    expect(isCompleteEnrollment("")).toBe(false);
    expect(isCompleteEnrollment(0)).toBe(false);
    expect(isCompleteEnrollment(null)).toBe(false);
    expect(isCompleteEnrollment(undefined)).toBe(false);
    expect(isCompleteEnrollment(MAX_OFFERING_ENROLLMENT + 1)).toBe(false);
  });
});

describe("parseEnrollmentInput", () => {
  it("keeps the field clearable and reads a typed number", () => {
    expect(parseEnrollmentInput("")).toBe("");
    expect(parseEnrollmentInput("  ")).toBe("");
    expect(parseEnrollmentInput("12")).toBe(12);
  });

  it("clamps to the cap and discards junk", () => {
    expect(parseEnrollmentInput("9999")).toBe(MAX_OFFERING_ENROLLMENT);
    expect(parseEnrollmentInput("abc")).toBe("");
    expect(parseEnrollmentInput("-5")).toBe("");
  });
});

describe("enrollmentForStorage", () => {
  it("stores a figure and nulls a blank", () => {
    expect(enrollmentForStorage(12)).toBe(12);
    expect(enrollmentForStorage("")).toBeNull();
    expect(enrollmentForStorage(0)).toBeNull();
  });
});

describe("offeringEnrollmentIndex", () => {
  it("indexes only the rows that carry a figure", () => {
    const idx = offeringEnrollmentIndex([
      { sectionId: "sec-3a", subjectCode: "CC-112", students: 40 },
      { sectionId: "sec-3a", subjectCode: "GE-ETH", students: "" },
      { sectionId: "", subjectCode: "CC-112", students: 40 },
    ]);
    expect(idx.get(offeringKey("sec-3a", "CC-112"))).toBe(40);
    expect(idx.has(offeringKey("sec-3a", "GE-ETH"))).toBe(false);
    expect(idx.size).toBe(1);
  });
});

describe("enrollmentForOffering", () => {
  const plotted = new Map([
    [offeringKey("sec-3a", "CC-112"), 40],
    [offeringKey("sec-3a", "GE-RIZ"), 12],
  ]);

  it("inherits from another meeting of the same subject and section", () => {
    expect(enrollmentForOffering({ sectionId: "sec-3a", subjectCode: "CC-112", plotted })).toBe(40);
  });

  it("keeps each subject on its own figure", () => {
    expect(enrollmentForOffering({ sectionId: "sec-3a", subjectCode: "GE-RIZ", plotted })).toBe(12);
  });

  it("is blank for a subject nobody has counted — the section is NOT a fallback", () => {
    expect(enrollmentForOffering({ sectionId: "sec-3a", subjectCode: "NEW-101", plotted })).toBe("");
  });

  it("is blank when the offering is incomplete", () => {
    expect(enrollmentForOffering({ sectionId: "sec-3a", subjectCode: "" })).toBe("");
    expect(enrollmentForOffering({ sectionId: "", subjectCode: "CC-112" })).toBe("");
  });

  it("lets a figure being typed win over the plotted one", () => {
    expect(
      enrollmentForOffering({
        sectionId: "sec-3a",
        subjectCode: "CC-112",
        draft: { sectionId: "sec-3a", subjectCode: "CC-112", students: 38 },
        plotted,
      }),
    ).toBe(38);
  });

  it("does not carry a draft across a change of subject", () => {
    expect(
      enrollmentForOffering({
        sectionId: "sec-3a",
        subjectCode: "GE-RIZ",
        draft: { sectionId: "sec-3a", subjectCode: "CC-112", students: 38 },
        plotted,
      }),
    ).toBe(12);
  });

  it("does not carry a draft across a change of section", () => {
    expect(
      enrollmentForOffering({
        sectionId: "sec-3b",
        subjectCode: "CC-112",
        draft: { sectionId: "sec-3a", subjectCode: "CC-112", students: 38 },
        plotted,
      }),
    ).toBe("");
  });
});

describe("applyOfferingEnrollmentToRows", () => {
  const rows = [
    { id: "mon", sectionId: "sec-3a", subjectCode: "CC-112", students: 40 as number | "" },
    { id: "wed", sectionId: "sec-3a", subjectCode: "cc112", students: "" as number | "" },
    { id: "lab", sectionId: "sec-3a", subjectCode: "CC-112L", students: 40 as number | "" },
    { id: "eth", sectionId: "sec-3a", subjectCode: "GE-ETH", students: 40 as number | "" },
    { id: "other", sectionId: "sec-3b", subjectCode: "CC-112", students: 25 as number | "" },
  ];

  it("gives every meeting of the offering the same figure", () => {
    const next = applyOfferingEnrollmentToRows(rows, "sec-3a", "CC-112", 38);
    expect(next.map((r) => r.students)).toEqual([38, 38, 40, 40, 25]);
  });

  it("leaves the lab, the section's other subjects and other sections alone", () => {
    const next = applyOfferingEnrollmentToRows(rows, "sec-3a", "CC-112", 38);
    expect(next[2]).toBe(rows[2]);
    expect(next[3]).toBe(rows[3]);
    expect(next[4]).toBe(rows[4]);
  });

  it("returns the same array when nothing changes, so React can skip the render", () => {
    expect(applyOfferingEnrollmentToRows(rows, "sec-3b", "CC-112", 25)).toBe(rows);
    expect(applyOfferingEnrollmentToRows(rows, "", "CC-112", 38)).toBe(rows);
    expect(applyOfferingEnrollmentToRows(rows, "sec-3a", "", 38)).toBe(rows);
  });
});

describe("insCourseEnrollment", () => {
  it("prints the offering's own plotted figure", () => {
    expect(insCourseEnrollment(12)).toBe(12);
  });

  it("is null — a blank on the form — when nobody has recorded one", () => {
    expect(insCourseEnrollment(null)).toBeNull();
    expect(insCourseEnrollment(undefined)).toBeNull();
    expect(insCourseEnrollment(0)).toBeNull();
  });
});
