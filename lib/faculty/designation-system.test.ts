import { describe, expect, it } from "vitest";
import {
  computeRatePerHour,
  degreeTierFromEducationalQualification,
  designationTeachingCapHours,
  getDesignationPolicyByLabel,
  highestDegree,
} from "./designation-system";

describe("getDesignationPolicyByLabel with free-text designation", () => {
  it("matches a Merit System label regardless of case and extra spacing", () => {
    expect(getDesignationPolicyByLabel("College Dean")?.key).toBe("College Dean");
    expect(getDesignationPolicyByLabel("college dean")?.key).toBe("College Dean");
    expect(getDesignationPolicyByLabel("  Department   Chairperson ")?.key).toBe("Department Chairperson");
  });

  it("keeps the designation cap for those matches", () => {
    expect(designationTeachingCapHours("college dean")).toBe(9);
    expect(designationTeachingCapHours("Department Chairperson")).toBe(15);
  });

  it("treats unknown free text as no designation cap (standard load applies)", () => {
    expect(getDesignationPolicyByLabel("Program Coordinator")).toBeNull();
    expect(designationTeachingCapHours("Program Coordinator")).toBeNull();
    expect(designationTeachingCapHours("")).toBeNull();
    expect(designationTeachingCapHours(null)).toBeNull();
  });

  it("returns no cap for regular faculty", () => {
    expect(designationTeachingCapHours("Regular Faculty (no designation)")).toBeNull();
  });
});

describe("degreeTierFromEducationalQualification", () => {
  it("reads the doctorate tier from how the cell is usually written", () => {
    expect(degreeTierFromEducationalQualification("Doctor of Philosophy in Information Technology")).toBe(
      "Doctorate",
    );
    expect(degreeTierFromEducationalQualification("Ph.D. Educational Management")).toBe("Doctorate");
    expect(degreeTierFromEducationalQualification("EdD")).toBe("Doctorate");
  });

  it("reads the master's tier", () => {
    expect(degreeTierFromEducationalQualification("MS Information Technology")).toBe("Master\u2019s");
    expect(degreeTierFromEducationalQualification("Master of Arts in Education")).toBe("Master\u2019s");
    expect(degreeTierFromEducationalQualification("MBA")).toBe("Master\u2019s");
  });

  it("reads the baccalaureate tier", () => {
    expect(degreeTierFromEducationalQualification("BS Computer Science")).toBe("Baccalaureate");
    expect(degreeTierFromEducationalQualification("Bachelor of Secondary Education")).toBe("Baccalaureate");
  });

  it("prefers the highest tier named in the cell", () => {
    expect(degreeTierFromEducationalQualification("PhD (BS Computer Science, MS IT)")).toBe("Doctorate");
    expect(degreeTierFromEducationalQualification("MS IT, BS CS")).toBe("Master\u2019s");
  });

  it("gives no tier \u2014 and so no rate \u2014 for text that names no degree", () => {
    expect(degreeTierFromEducationalQualification("Undergraduate units earned")).toBeNull();
    expect(degreeTierFromEducationalQualification("")).toBeNull();
    expect(degreeTierFromEducationalQualification(null)).toBeNull();
  });
});

describe("highestDegree", () => {
  const legacy = { bsDegree: "BS IT", msDegree: null, doctoralDegree: null };

  it("lets the HR Form 23B qualification win over the legacy degree columns", () => {
    expect(highestDegree({ ...legacy, educationalQualification: "PhD Information Technology" })).toBe(
      "Doctorate",
    );
  });

  it("falls back to the legacy columns for profiles that predate the form", () => {
    expect(highestDegree({ ...legacy, msDegree: "MS IT" })).toBe("Master\u2019s");
    expect(highestDegree({ ...legacy, educationalQualification: "   " })).toBe("Baccalaureate");
  });

  it("is null when neither source names a degree", () => {
    expect(highestDegree({ bsDegree: null, msDegree: null, doctoralDegree: null })).toBeNull();
    expect(highestDegree(null)).toBeNull();
  });
});

describe("computeRatePerHour from the 23B qualification", () => {
  const noLegacy = { bsDegree: null, msDegree: null, doctoralDegree: null };

  it("rates by the qualification tier", () => {
    expect(computeRatePerHour({ ...noLegacy, educationalQualification: "PhD IT" })).toBe(250);
    expect(computeRatePerHour({ ...noLegacy, educationalQualification: "MS IT" })).toBe(225);
    expect(computeRatePerHour({ ...noLegacy, educationalQualification: "BS IT" })).toBe(200);
  });

  it("honours the overrides", () => {
    expect(
      computeRatePerHour({ ...noLegacy, educationalQualification: "MS IT" }, { masters: 300 }),
    ).toBe(300);
  });

  it("still lets a designation rate take precedence", () => {
    expect(
      computeRatePerHour(
        { ...noLegacy, educationalQualification: "BS IT", designation: "College Dean" },
        undefined,
        { "College Dean": 400 },
      ),
    ).toBe(400);
  });

  it("has no rate when the qualification names no degree", () => {
    expect(computeRatePerHour({ ...noLegacy, educationalQualification: "Graduate units earned" })).toBeNull();
  });
});
