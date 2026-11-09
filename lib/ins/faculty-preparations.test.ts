import { describe, expect, it } from "vitest";
import { buildInsFacultyView } from "./build-ins-faculty-view";

const subject = (id: string, code: string) => ({ id, code, title: code, lecUnits: 3, labUnits: 0 }) as any;
const section = (id: string, name: string) => ({ id, name }) as any;
const entry = (id: string, subjectId: string, sectionId: string, day: string, start: string, end: string) =>
  ({ id, academicPeriodId: "p", instructorId: "i", subjectId, sectionId, roomId: "r", day, startTime: start, endTime: end, programMode: "day" }) as any;

describe("Form 5A No. of Preparations", () => {
  it("equals the number of Summary of Courses rows (one per subject per section)", () => {
    const view = buildInsFacultyView({
      entries: [
        entry("e1", "s1", "3a", "Monday", "07:30", "08:30"),
        entry("e2", "s1", "3a", "Wednesday", "07:30", "08:30"),
        entry("e3", "s2", "4a", "Monday", "08:00", "09:00"),
        entry("e4", "s2", "3a", "Tuesday", "08:00", "09:00"),
      ],
      academicPeriodId: "p",
      instructorId: "i",
      sectionById: new Map([["3a", section("3a", "BSIT-3A")], ["4a", section("4a", "BSIT-4A")]]),
      subjectById: new Map([["s1", subject("s1", "PC-316")], ["s2", subject("s2", "AP-6")]]),
      roomById: new Map(),
      programMode: "day",
    } as any);
    expect(view.courses).toHaveLength(3);
    expect(view.teachingMetrics.preparations).toBe(3);
  });
});
