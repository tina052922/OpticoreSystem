import { describe, expect, it } from "vitest";
import { casCollegeIdFrom, isCasCollege } from "./cas-faculty";

const colleges = [
  { id: "c-cote", code: "COTE" },
  { id: "c-cas", code: "cas" },
];

describe("CAS faculty helpers", () => {
  it("finds the CAS college by code, whatever the case", () => {
    expect(casCollegeIdFrom(colleges)).toBe("c-cas");
    expect(casCollegeIdFrom([{ id: "x", code: "COTE" }])).toBeNull();
  });

  it("tells a CAS college from another", () => {
    expect(isCasCollege("c-cas", colleges)).toBe(true);
    expect(isCasCollege("c-cote", colleges)).toBe(false);
    expect(isCasCollege(null, colleges)).toBe(false);
  });
});
