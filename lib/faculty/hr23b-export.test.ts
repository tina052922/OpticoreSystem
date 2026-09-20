import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import type { FacultyProfile } from "@/types/db";
import {
  buildHr23bWorkbook,
  HR23B_MIN_PRINTED_ROWS,
  hr23bFileName,
  hr23bSheetRow,
  hr23bSheetRows,
  type Hr23bExportRow,
} from "./hr23b-export";

const asOf = new Date(2026, 8, 21); // 2026-09-21

function profile(over: Partial<FacultyProfile> = {}): FacultyProfile {
  return {
    id: "p1",
    userId: "u1",
    fullName: "Juan Miguel Santos",
    aka: null,
    lastName: "Santos",
    firstName: "Juan",
    middleName: "Miguel",
    academicRank: "Instructor I",
    sex: "M",
    dateOfBirth: "1985-03-15",
    educationalQualification: "MS Information Technology",
    experience: "8 years teaching",
    eligibility: "CSC Professional",
    bsDegree: null,
    msDegree: null,
    doctoralDegree: null,
    major1: null,
    major2: null,
    major3: null,
    minor1: null,
    minor2: null,
    minor3: null,
    research: null,
    extension: null,
    production: null,
    specialTraining: null,
    status: "Resident",
    designation: null,
    ratePerHour: null,
    ...over,
  };
}

const row: Hr23bExportRow = {
  user: { id: "u1", name: "Juan Miguel Santos", employeeId: "EMP-1" },
  profile: profile(),
};

describe("hr23bSheetRow", () => {
  it("maps a profile onto the form's cells", () => {
    expect(hr23bSheetRow(row, asOf)).toEqual({
      lastName: "Santos",
      firstName: "Juan",
      middleName: "Miguel",
      academicRank: "Instructor I",
      status: "Resident",
      sex: "M",
      dateOfBirth: new Date(1985, 2, 15),
      age: 41,
      educationalQualification: "MS Information Technology",
      experience: "8 years teaching",
      eligibility: "CSC Professional",
    });
  });

  it("splits the name for profiles saved before the form existed", () => {
    const legacy = hr23bSheetRow(
      {
        user: { id: "u2", name: "Ana Abad", employeeId: null },
        profile: profile({ lastName: null, firstName: null, middleName: null, fullName: "Ana Abad" }),
      },
      asOf,
    );
    expect(legacy.lastName).toBe("Abad");
    expect(legacy.firstName).toBe("Ana");
  });

  it("leaves cells blank rather than printing placeholders", () => {
    const blank = hr23bSheetRow(
      { user: { id: "u3", name: "Maria Reyes", employeeId: null }, profile: null },
      asOf,
    );
    expect(blank).toMatchObject({
      lastName: "Reyes",
      academicRank: "",
      status: "",
      sex: "",
      dateOfBirth: "",
      age: "",
      eligibility: "",
    });
  });
});

describe("hr23bFileName", () => {
  it("names the file after the scope and the date", () => {
    expect(hr23bFileName("BSIT", asOf)).toBe("HR-Form-23B_BSIT_2026-09-21.xlsx");
  });

  it("drops punctuation and copes with no scope", () => {
    expect(hr23bFileName("COTE — BSIT", asOf)).toBe("HR-Form-23B_COTE-BSIT_2026-09-21.xlsx");
    expect(hr23bFileName("", asOf)).toBe("HR-Form-23B_2026-09-21.xlsx");
  });
});

describe("buildHr23bWorkbook", () => {
  async function readBack(rows: Hr23bExportRow[]) {
    const blob = await buildHr23bWorkbook(rows, {
      academicYear: "2026-2027 · 1st Semester",
      scopeLabel: "BSIT",
      asOf,
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    return wb.worksheets[0];
  }

  it("writes the form's heading and two-row column header", async () => {
    const ws = await readBack([row]);
    expect(ws.getCell("A1").value).toBe("CEBU TECHNOLOGICAL UNIVERSITY");
    expect(ws.getCell("A2").value).toBe("Faculty Profile as to their Educational Qualification");
    expect(ws.getCell("A3").value).toBe("Academic Year 2026-2027 · 1st Semester");
    expect(ws.getCell("K1").value).toBe("HR Form 23B");

    expect(ws.getCell("A5").value).toBe("No.");
    expect(ws.getCell("B5").value).toBe("NAME OF PERSONNEL");
    expect(["LAST NAME", "FIRST NAME", "MIDDLE NAME"]).toEqual([
      ws.getCell("B6").value,
      ws.getCell("C6").value,
      ws.getCell("D6").value,
    ]);
    expect(ws.getCell("E5").value).toBe("ACADEMIC RANK");
    expect(ws.getCell("L5").value).toBe("ELIGIBILITY");
  });

  it("writes the faculty row under the header, numbered", async () => {
    const ws = await readBack([row]);
    expect(ws.getCell("A7").value).toBe(1);
    expect(ws.getCell("B7").value).toBe("Santos");
    expect(ws.getCell("E7").value).toBe("Instructor I");
    expect(ws.getCell("F7").value).toBe("Resident");
    expect(ws.getCell("I7").value).toBe(41);
    expect(ws.getCell("H7").value).toBeInstanceOf(Date);
  });

  it("keeps the form's 25 printed lines when fewer faculty are listed", async () => {
    const ws = await readBack([row]);
    const lastPrinted = 6 + HR23B_MIN_PRINTED_ROWS;
    expect(ws.getCell(`A${lastPrinted}`).value).toBe(HR23B_MIN_PRINTED_ROWS);
    expect(ws.getCell(`B${lastPrinted}`).value ?? "").toBe("");
    expect(ws.getCell(`A${lastPrinted + 1}`).value).toBe("(Alphabetical Order)");
  });

  it("grows past 25 lines for a longer list", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      user: { id: `u${i}`, name: `Name ${i}`, employeeId: null },
      profile: profile({ id: `p${i}`, userId: `u${i}`, lastName: `Last${i}` }),
    }));
    const ws = await readBack(many);
    expect(ws.getCell("A36").value).toBe(30);
    expect(ws.getCell("B36").value).toBe("Last29");
  });

  it("sets up landscape printing with repeated headers and column filters", async () => {
    const ws = await readBack([row]);
    expect(ws.pageSetup.orientation).toBe("landscape");
    expect(ws.pageSetup.fitToWidth).toBe(1);
    expect(ws.pageSetup.printTitlesRow).toBe("5:6");
    expect(ws.autoFilter).toBeTruthy();
  });

  it("prints the signatory block", async () => {
    const ws = await readBack([row]);
    const noteRow = 6 + HR23B_MIN_PRINTED_ROWS + 1;
    expect(ws.getCell(`C${noteRow}`).value).toBe("Prepared by:");
    expect(ws.getCell(`J${noteRow}`).value).toBe("Certified Correct:");
    expect(ws.getCell(`C${noteRow + 3}`).value).toBe("HRMO Designate");
    expect(ws.getCell(`J${noteRow + 3}`).value).toBe("Administrative Officer/HRMO");
  });
});

describe("hr23bSheetRows", () => {
  it("keeps the order it is given (the page sorts alphabetically)", () => {
    const rows = hr23bSheetRows(
      [
        { user: { id: "u1", name: "Ana Abad", employeeId: null }, profile: profile({ lastName: "Abad" }) },
        { user: { id: "u2", name: "Juan Santos", employeeId: null }, profile: profile({ lastName: "Santos" }) },
      ],
      asOf,
    );
    expect(rows.map((r) => r.lastName)).toEqual(["Abad", "Santos"]);
  });
});
