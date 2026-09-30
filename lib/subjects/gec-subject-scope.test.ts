import { describe, expect, it } from "vitest";
import {
  canGecChairmanCreateSubjectCode,
  canGecChairmanWriteSubject,
  hasGecSubjectCodePrefix,
  isGecEditableSubject,
} from "./gec-subject-scope";

describe("hasGecSubjectCodePrefix", () => {
  it("accepts the CHED general education prefixes, however they are typed", () => {
    for (const code of ["GEC-MMW", "gec-us", " GEE-TEM ", "GEE-PEE"]) {
      expect(hasGecSubjectCodePrefix(code)).toBe(true);
    }
  });

  it("rejects everything else", () => {
    // "GECKO-1" starts with the letters but is not a GEC code; the dash is part of the prefix.
    for (const code of ["CC-112", "AP-6", "NSTP 1", "GECKO-1", "GEE", "", null, undefined]) {
      expect(hasGecSubjectCodePrefix(code)).toBe(false);
    }
  });
});

describe("isGecEditableSubject", () => {
  it("owns a subject by its code prefix", () => {
    expect(isGecEditableSubject({ code: "GEC-MMW", category: null })).toBe(true);
    expect(isGecEditableSubject({ code: "GEE-TEM" })).toBe(true);
  });

  it("owns a subject a chairman marked as GEC even without the prefix", () => {
    expect(isGecEditableSubject({ code: "HUM-101", category: "gec" })).toBe(true);
    expect(isGecEditableSubject({ code: "HUM-101", category: " GEC " })).toBe(true);
  });

  it("does not own another department's subject", () => {
    expect(isGecEditableSubject({ code: "CC-112", category: "major" })).toBe(false);
    expect(isGecEditableSubject({ code: "AP-6", category: null })).toBe(false);
    expect(isGecEditableSubject({})).toBe(false);
  });
});

describe("canGecChairmanCreateSubjectCode", () => {
  /**
   * Creation is judged on the code alone. `category` arrives in the request body, so honouring it
   * here would let the chairman mark any new subject "gec" and file it under another department.
   */
  it("allows a general education code", () => {
    expect(canGecChairmanCreateSubjectCode("GEC-RPH")).toBe(true);
  });

  it("refuses a code outside GEC, whatever category is claimed alongside it", () => {
    expect(canGecChairmanCreateSubjectCode("CC-999")).toBe(false);
    expect(canGecChairmanCreateSubjectCode("")).toBe(false);
  });
});

describe("canGecChairmanWriteSubject", () => {
  it("allows editing a GEC subject", () => {
    expect(canGecChairmanWriteSubject({ code: "GEC-MMW" })).toBe(true);
    expect(canGecChairmanWriteSubject({ code: "HUM-101", category: "gec" })).toBe(true);
  });

  it("refuses another department's subject", () => {
    expect(canGecChairmanWriteSubject({ code: "CC-112", category: "major" })).toBe(false);
  });

  /**
   * The check reads the STORED row. If it read the request, an edit to a major subject could carry
   * `category: "gec"` and be granted the very permission being tested.
   */
  it("refuses a major subject even when the edit claims it is GEC", () => {
    const stored = { code: "CC-112", category: "major" };
    expect(canGecChairmanWriteSubject(stored, "GEC-SNEAKY")).toBe(false);
  });

  it("refuses renaming a GEC subject out of GEC scope", () => {
    // Otherwise a subject could be taken from another department in two edits.
    expect(canGecChairmanWriteSubject({ code: "GEC-MMW" }, "CC-500")).toBe(false);
    expect(canGecChairmanWriteSubject({ code: "GEC-MMW" }, "GEC-MMW2")).toBe(true);
  });

  it("allows an edit that does not touch the code", () => {
    expect(canGecChairmanWriteSubject({ code: "GEC-MMW" }, undefined)).toBe(true);
    expect(canGecChairmanWriteSubject({ code: "GEC-MMW" }, "   ")).toBe(true);
  });
});
