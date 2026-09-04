import { describe, expect, it } from "vitest";
import { designationTeachingCapHours, getDesignationPolicyByLabel } from "./designation-system";

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
