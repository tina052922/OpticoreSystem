import { describe, expect, it } from "vitest";
import { isValidDateOfBirth, latestDateOfBirth } from "./hr-form-23b";

const asOf = new Date(2026, 10, 6); // 6 Nov 2026, local

describe("date of birth (20 years and above)", () => {
  it("offers today 20 years ago as the latest pickable date", () => {
    expect(latestDateOfBirth(asOf)).toBe("2006-11-06");
  });
  it("allows someone turning 20 today and anyone older", () => {
    expect(isValidDateOfBirth("2006-11-06", asOf)).toBe(true);
    expect(isValidDateOfBirth("1990-05-12", asOf)).toBe(true);
    expect(isValidDateOfBirth("", asOf)).toBe(true);
  });
  it("rejects anyone under 20, today and the future", () => {
    expect(isValidDateOfBirth("2006-11-07", asOf)).toBe(false);
    expect(isValidDateOfBirth("2026-11-06", asOf)).toBe(false);
    expect(isValidDateOfBirth("2030-01-01", asOf)).toBe(false);
  });
  it("rejects malformed or impossible dates", () => {
    expect(isValidDateOfBirth("1990-02-30", asOf)).toBe(false);
    expect(isValidDateOfBirth("12/05/1990", asOf)).toBe(false);
  });
  it("does not let 29 Feb roll forward a day", () => {
    expect(latestDateOfBirth(new Date(2028, 1, 29))).toBe("2008-02-29");
    expect(isValidDateOfBirth("2008-03-01", new Date(2028, 1, 29))).toBe(false);
  });
});
