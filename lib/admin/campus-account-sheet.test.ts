import { describe, expect, it } from "vitest";
import {
  cellText,
  campusAccountFileName,
  mapSheetHeaders,
  parseSheetRows,
  resolveImportRows,
} from "./campus-account-sheet";

const SCOPE = {
  colleges: [
    { id: "col-tech-eng", code: "COTE" },
    { id: "col-cafe", code: "CAFE" },
  ],
  programs: [
    { id: "prog-bsit", code: "BSIT", collegeId: "col-tech-eng" },
    { id: "prog-bit-auto", code: "BIT-AUTO", collegeId: "col-tech-eng" },
  ],
};

describe("mapSheetHeaders", () => {
  it("reads the exported headers", () => {
    expect(mapSheetHeaders(["Assignment code", "Full name", "Email"])).toEqual({
      assignmentCode: 0,
      fullName: 1,
      email: 2,
    });
  });

  it("accepts the wordings people actually type", () => {
    expect(mapSheetHeaders(["Department", "Name", "Email address"])).toEqual({
      assignmentCode: 0,
      fullName: 1,
      email: 2,
    });
    expect(mapSheetHeaders(["College Code", "FULLNAME", "Username"])).toEqual({
      assignmentCode: 0,
      fullName: 1,
      email: 2,
    });
  });

  it("ignores columns it does not know and reports the missing ones", () => {
    expect(mapSheetHeaders(["Notes", "Full name"])).toEqual({
      assignmentCode: -1,
      fullName: 1,
      email: -1,
    });
  });
});

describe("parseSheetRows", () => {
  const header = ["Assignment code", "Full name", "Email"];

  it("reads rows and numbers them as the sheet does", () => {
    const rows = parseSheetRows(header, [
      ["COTE", "Vilia Gelaga", "Vilia@ctu.edu.ph"],
      ["CAFE", "Juan Santos", "juan@ctu.edu.ph"],
    ]);
    expect(rows).toEqual([
      { assignmentCode: "COTE", fullName: "Vilia Gelaga", email: "vilia@ctu.edu.ph", rowNumber: 2 },
      { assignmentCode: "CAFE", fullName: "Juan Santos", email: "juan@ctu.edu.ph", rowNumber: 3 },
    ]);
  });

  it("skips blank padding rows", () => {
    const rows = parseSheetRows(header, [["COTE", "A", "a@ctu.edu.ph"], ["", "", ""], [null, null, null]]);
    expect(rows).toHaveLength(1);
  });

  it("collapses stray whitespace", () => {
    const [row] = parseSheetRows(header, [["  COTE ", " Vilia   Gelaga ", " V@CTU.EDU.PH "]]);
    expect(row).toMatchObject({ assignmentCode: "COTE", fullName: "Vilia Gelaga", email: "v@ctu.edu.ph" });
  });
});

describe("resolveImportRows", () => {
  function rows(...list: [string, string, string][]) {
    return list.map(([assignmentCode, fullName, email], i) => ({
      assignmentCode,
      fullName,
      email,
      rowNumber: i + 2,
    }));
  }

  it("matches a college code for an admin", () => {
    const [hit] = resolveImportRows(rows(["COTE", "Vilia", "v@ctu.edu.ph"]), "college_admin", SCOPE);
    expect(hit).toMatchObject({ collegeId: "col-tech-eng", programId: null, error: null });
  });

  it("matches a department code for a chairman, and carries its college", () => {
    const [hit] = resolveImportRows(rows(["bsit", "Ana", "ana@ctu.edu.ph"]), "chairman_admin", SCOPE);
    expect(hit).toMatchObject({ programId: "prog-bsit", collegeId: "col-tech-eng", error: null });
  });

  it("explains a code that matches nothing", () => {
    const [miss] = resolveImportRows(rows(["NOPE", "Ana", "ana@ctu.edu.ph"]), "college_admin", SCOPE);
    expect(miss.status).toBe("error");
    expect(miss.error).toBe('No college with code "NOPE". See the Codes sheet.');
  });

  it("reports missing names and malformed emails", () => {
    const [noName, badEmail] = resolveImportRows(
      rows(["COTE", "", "a@ctu.edu.ph"], ["CAFE", "Ana", "not-an-email"]),
      "college_admin",
      SCOPE,
    );
    expect(noName.error).toBe("Full name is empty.");
    expect(badEmail.error).toBe("Email is empty or not a valid address.");
  });

  it("treats an exported row left as it was as already registered, not a clash", () => {
    const holders = new Map([["col-tech-eng", "vilia@ctu.edu.ph"]]);
    const [same, other] = resolveImportRows(
      rows(["COTE", "Vilia", "vilia@ctu.edu.ph"], ["COTE", "Ana", "ana@ctu.edu.ph"]),
      "college_admin",
      SCOPE,
      holders,
    );
    expect(same.status).toBe("unchanged");
    expect(other.status).toBe("error");
    expect(other.error).toMatch(/already has a holder \(vilia@ctu.edu.ph\)/);
  });

  it("skips posts left blank instead of reporting them", () => {
    const [blank, ready] = resolveImportRows(
      rows(["COTE", "", ""], ["CAFE", "Ana", "ana@ctu.edu.ph"]),
      "college_admin",
      SCOPE,
    );
    expect(blank.status).toBe("empty");
    expect(blank.error).toBeNull();
    expect(ready.status).toBe("ready");
  });

  it("catches a post or an email listed twice in one sheet", () => {
    const resolved = resolveImportRows(
      rows(["COTE", "A", "a@ctu.edu.ph"], ["COTE", "B", "b@ctu.edu.ph"], ["CAFE", "C", "a@ctu.edu.ph"]),
      "college_admin",
      SCOPE,
    );
    expect(resolved[0].error).toBeNull();
    expect(resolved[1].error).toBe("The sheet lists COTE twice.");
    expect(resolved[2].error).toBe("The sheet lists this email twice.");
  });

  it("reports every row, so nothing imports silently", () => {
    const resolved = resolveImportRows(
      rows(["COTE", "A", "a@ctu.edu.ph"], ["NOPE", "B", "b@ctu.edu.ph"]),
      "college_admin",
      SCOPE,
    );
    expect(resolved).toHaveLength(2);
  });
});

describe("campusAccountFileName", () => {
  it("names the file after the role and the date", () => {
    const asOf = new Date(2026, 8, 30);
    expect(campusAccountFileName("college_admin", asOf)).toBe("college-admins_2026-09-30.xlsx");
    expect(campusAccountFileName("chairman_admin", asOf)).toBe("chairmen_2026-09-30.xlsx");
  });
});

describe("cellText — what Excel actually stores", () => {
  it("reads a typed email that Excel turned into a link", () => {
    expect(cellText({ text: "Ana@ctu.edu.ph", hyperlink: "mailto:Ana@ctu.edu.ph" })).toBe("Ana@ctu.edu.ph");
    expect(cellText({ hyperlink: "mailto:ana@ctu.edu.ph" })).toBe("ana@ctu.edu.ph");
  });
  it("reads rich text, formulas and plain values", () => {
    expect(cellText({ richText: [{ text: "Juan " }, { text: "Dela Cruz" }] })).toBe("Juan Dela Cruz");
    expect(cellText({ formula: "A1", result: "COTE" })).toBe("COTE");
    expect(cellText(42)).toBe("42");
    expect(cellText(null)).toBe("");
  });
  it("imports a hyperlinked email row end to end", () => {
    const [row] = parseSheetRows(
      ["Assignment code", "College", "Full name", "Email"],
      [["COTE", "College of Technology", "Ana", { text: "Ana@ctu.edu.ph", hyperlink: "mailto:Ana@ctu.edu.ph" }]],
    );
    expect(row.email).toBe("ana@ctu.edu.ph");
    expect(resolveImportRows([row], "college_admin", SCOPE)[0].status).toBe("ready");
  });
  it("ignores a note row under the table and uses real row numbers", () => {
    const parsed = parseSheetRows(
      ["Assignment code", "Full name", "Email"],
      [["COTE", "Ana", "ana@ctu.edu.ph"], ["Fill in Full name and Email…"]],
      2,
      [2, 9],
    );
    const resolved = resolveImportRows(parsed, "college_admin", SCOPE);
    expect(resolved.map((r) => r.status)).toEqual(["ready", "empty"]);
    expect(parsed[1].rowNumber).toBe(9);
  });
  it("explains a sheet whose header row is wrong", () => {
    expect(() => parseSheetRows(["Name", "Mail"], [])).toThrow(/Assignment code/);
  });
});
