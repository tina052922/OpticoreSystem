import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildCampusAccountWorkbook, readCampusAccountWorkbook } from "./campus-account-workbook";
import { resolveImportRows } from "./campus-account-sheet";

const SCOPE = {
  colleges: [
    { id: "col-tech-eng", code: "COTE" },
    { id: "col-cafe", code: "CAFE" },
    { id: "col-coed", code: "COED" },
  ],
  programs: [],
};

describe("export → fill in Excel → import", () => {
  it("imports what was typed into an exported file", async () => {
    // Export: COTE already has a holder, CAFE and COED are empty.
    const blob = await buildCampusAccountWorkbook("college_admin", [
      { assignmentCode: "COTE", assignmentName: "College of Technology", fullName: "Vilia Gelaga", email: "vilia@ctu.edu.ph" },
      { assignmentCode: "CAFE", assignmentName: "College of Agriculture", fullName: "", email: "" },
      { assignmentCode: "COED", assignmentName: "College of Education", fullName: "", email: "" },
    ]);

    // Fill CAFE the way Excel stores it: a typed email becomes a hyperlink cell.
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    expect(wb.worksheets.map((w) => w.name)).toEqual(["College Admins", "Codes", "How to fill"]);
    const ws = wb.worksheets[0]!;
    ws.getCell("C3").value = "Juan Dela Cruz";
    ws.getCell("D3").value = { text: "Juan@ctu.edu.ph", hyperlink: "mailto:Juan@ctu.edu.ph" };
    const filled = await wb.xlsx.writeBuffer();

    const rows = await readCampusAccountWorkbook(new File([filled], "college-admins.xlsx"));
    const resolved = resolveImportRows(rows, "college_admin", SCOPE, new Map([["col-tech-eng", "vilia@ctu.edu.ph"]]));

    expect(resolved.map((r) => [r.row.assignmentCode, r.status])).toEqual([
      ["COTE", "unchanged"],
      ["CAFE", "ready"],
      ["COED", "empty"],
    ]);
    const cafe = resolved.find((r) => r.row.assignmentCode === "CAFE")!;
    expect(cafe.row).toMatchObject({ fullName: "Juan Dela Cruz", email: "juan@ctu.edu.ph", rowNumber: 3 });
    expect(cafe.collegeId).toBe("col-cafe");
  });
});
