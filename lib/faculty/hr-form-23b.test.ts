import { describe, expect, it } from "vitest";
import {
  compareFacultyAlphabetically,
  composeFullName,
  composeListName,
  computeAge,
  facultyNamePartsFrom,
  formatDateOfBirth,
  normalizeFacultySex,
  splitFullName,
  toDateInputValue,
} from "./hr-form-23b";

describe("splitFullName", () => {
  it("reads “Last, First Middle” as written", () => {
    expect(splitFullName("Dela Cruz, Juan Miguel")).toEqual({
      lastName: "Dela Cruz",
      firstName: "Juan",
      middleName: "Miguel",
    });
  });

  it("takes the trailing token as the surname when there is no comma", () => {
    expect(splitFullName("Juan Miguel Santos")).toEqual({
      lastName: "Santos",
      firstName: "Juan",
      middleName: "Miguel",
    });
  });

  it("leaves middle blank for a two-token name", () => {
    expect(splitFullName("Juan Santos")).toEqual({
      lastName: "Santos",
      firstName: "Juan",
      middleName: "",
    });
  });

  it("returns empty parts for blank input", () => {
    expect(splitFullName("   ")).toEqual({ lastName: "", firstName: "", middleName: "" });
    expect(splitFullName(null)).toEqual({ lastName: "", firstName: "", middleName: "" });
  });
});

describe("composeFullName / composeListName", () => {
  it("keeps fullName in the First Middle Last shape INS already prints", () => {
    expect(composeFullName({ firstName: "Juan", middleName: "Miguel", lastName: "Santos" })).toBe(
      "Juan Miguel Santos",
    );
  });

  it("skips missing parts instead of leaving double spaces", () => {
    expect(composeFullName({ firstName: "Juan", middleName: "", lastName: "Santos" })).toBe("Juan Santos");
    expect(composeFullName({ lastName: "Santos" })).toBe("Santos");
  });

  it("writes the alphabetical label as Last, First Middle", () => {
    expect(composeListName({ firstName: "Juan", middleName: "Miguel", lastName: "Santos" })).toBe(
      "Santos, Juan Miguel",
    );
    expect(composeListName({ firstName: "Juan" })).toBe("Juan");
  });
});

describe("computeAge", () => {
  const asOf = new Date(2026, 8, 21); // 2026-09-21

  it("counts whole years", () => {
    expect(computeAge("1985-03-15", asOf)).toBe(41);
  });

  it("does not count a birthday that has not happened yet this year", () => {
    expect(computeAge("1985-12-01", asOf)).toBe(40);
  });

  it("counts the birthday itself", () => {
    expect(computeAge("1985-09-21", asOf)).toBe(41);
  });

  it("returns null for blank, unparseable, or future dates", () => {
    expect(computeAge("", asOf)).toBeNull();
    expect(computeAge(null, asOf)).toBeNull();
    expect(computeAge("not a date", asOf)).toBeNull();
    expect(computeAge("2030-01-01", asOf)).toBeNull();
  });
});

describe("date helpers", () => {
  it("trims a timestamptz down to the date input value", () => {
    expect(toDateInputValue("1985-03-15T00:00:00.000Z")).toBe("1985-03-15");
    expect(toDateInputValue("1985-03-15")).toBe("1985-03-15");
    expect(toDateInputValue(null)).toBe("");
  });

  it("prints the date without shifting across timezones", () => {
    expect(formatDateOfBirth("1985-03-15")).toBe("March 15, 1985");
    expect(formatDateOfBirth(null)).toBe("");
  });
});

describe("normalizeFacultySex", () => {
  it("accepts codes and spelled-out values", () => {
    expect(normalizeFacultySex("m")).toBe("M");
    expect(normalizeFacultySex("Female")).toBe("F");
  });

  it("blanks anything the form has no cell for", () => {
    expect(normalizeFacultySex("other")).toBe("");
    expect(normalizeFacultySex(null)).toBe("");
  });
});

describe("compareFacultyAlphabetically", () => {
  it("sorts by last name, then first, then middle", () => {
    const rows = [
      { lastName: "Santos", firstName: "Juan", middleName: "Miguel" },
      { lastName: "Abad", firstName: "Maria", middleName: "" },
      { lastName: "Santos", firstName: "Ana", middleName: "" },
    ];
    expect([...rows].sort(compareFacultyAlphabetically).map((r) => `${r.lastName} ${r.firstName}`)).toEqual([
      "Abad Maria",
      "Santos Ana",
      "Santos Juan",
    ]);
  });
});

describe("facultyNamePartsFrom", () => {
  it("prefers the stored columns", () => {
    expect(
      facultyNamePartsFrom({ lastName: "Santos", firstName: "Juan", fullName: "Someone Else" }),
    ).toEqual({ lastName: "Santos", firstName: "Juan", middleName: "" });
  });

  it("falls back to splitting fullName, then the user name", () => {
    expect(facultyNamePartsFrom({ fullName: "Juan Miguel Santos" })).toEqual({
      lastName: "Santos",
      firstName: "Juan",
      middleName: "Miguel",
    });
    expect(facultyNamePartsFrom({}, "Ana Abad")).toEqual({
      lastName: "Abad",
      firstName: "Ana",
      middleName: "",
    });
  });
});
