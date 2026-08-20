import { describe, expect, it } from "vitest";
import { generateInstructorTempPassword } from "./instructor-registration";

describe("generateInstructorTempPassword", () => {
  it("produces 16-character passwords", () => {
    const p = generateInstructorTempPassword();
    expect(p).toHaveLength(16);
  });

  it("produces different values across calls", () => {
    const a = generateInstructorTempPassword();
    const b = generateInstructorTempPassword();
    expect(a).not.toBe(b);
  });
});
