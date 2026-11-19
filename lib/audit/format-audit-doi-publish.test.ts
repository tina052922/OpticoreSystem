import { describe, expect, it } from "vitest";
import { formatAuditActionEnglish, formatAuditDetailsEnglish } from "./format-audit-entry";

const entry = (action: string, details: Record<string, unknown>) =>
  ({ action, details }) as unknown as Parameters<typeof formatAuditDetailsEnglish>[0];

describe("DOI publish / unpublish in the audit log", () => {
  it("labels the actions", () => {
    expect(formatAuditActionEnglish("doi.schedule_published")).toBe("Schedule published");
    expect(formatAuditActionEnglish("doi.schedule_unpublished")).toBe("Schedule unpublished");
  });

  it("describes a publication with term, class count and signer", () => {
    const text = formatAuditDetailsEnglish(
      entry("doi.schedule_published", { periodName: "2nd Semester, AY 2026-2027", entryCount: 120, signedByName: "Dr. Cruz" }),
    );
    expect(text).toBe(
      "DOI Admin published the schedule for 2nd Semester, AY 2026-2027 (120 classes), signed by Dr. Cruz. It is now visible to instructors and students.",
    );
  });

  it("describes an unpublish", () => {
    expect(formatAuditDetailsEnglish(entry("doi.schedule_unpublished", { periodName: "1st Semester", entryCount: 1 }))).toBe(
      "DOI Admin unpublished the schedule for 1st Semester (1 class). It is back to draft and editable.",
    );
  });
});

describe("recorded changes (subjects, rooms, accounts, …)", () => {
  it("titles and describes a created subject", () => {
    expect(formatAuditActionEnglish("subject.create")).toBe("Subject added");
    expect(
      formatAuditDetailsEnglish(
        entry("subject.create", { label: "Subject", verb: "create", code: "GEC-PC", title: "Purposive Communication", actorRole: "college_admin" }),
      ),
    ).toBe("College Admin added subject GEC-PC — Purposive Communication.");
  });

  it("describes an edited room and a deleted building", () => {
    expect(formatAuditActionEnglish("room.update")).toBe("Room edited");
    expect(
      formatAuditDetailsEnglish(entry("room.update", { label: "Room", verb: "update", code: "IT Lab 4", building: "COTE", actorRole: "chairman_admin" })),
    ).toBe("Program Chairperson edited room IT Lab 4 in COTE.");
    expect(formatAuditActionEnglish("building.delete")).toBe("Building deleted");
  });
});
