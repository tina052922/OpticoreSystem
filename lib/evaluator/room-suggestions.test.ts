import { describe, expect, it } from "vitest";
import type { Room } from "@/types/db";
import { busyRoomIdsForMeetings, dedupeMessages, ordinalFloor, rankRoomSuggestions } from "./room-suggestions";

const room = (id: string, extra: Partial<Room> = {}): Room =>
  ({ id, code: id, building: "COTE", floor: 3, capacity: 40, type: "Lecture", collegeId: "c", ...extra }) as Room;

describe("busyRoomIdsForMeetings", () => {
  const blocks = [
    { id: "b1", academicPeriodId: "p", day: "Monday", startTime: "08:00", endTime: "10:00", instructorId: "i", sectionId: "s", roomId: "R1", programMode: "day" as const },
  ];
  it("marks a room busy when any meeting day overlaps", () => {
    const busy = busyRoomIdsForMeetings({
      rooms: [room("R1"), room("R2")],
      meetings: [
        { day: "Wednesday", startTime: "08:00", endTime: "09:00" },
        { day: "Monday", startTime: "09:00", endTime: "10:00" },
      ],
      existingBlocks: blocks,
      academicPeriodId: "p",
      programMode: "day",
    });
    expect([...busy]).toEqual(["R1"]);
  });
  it("ignores the entry being edited", () => {
    const busy = busyRoomIdsForMeetings({
      rooms: [room("R1")],
      meetings: [{ day: "Monday", startTime: "08:00", endTime: "09:00" }],
      existingBlocks: blocks,
      academicPeriodId: "p",
      programMode: "day",
      excludeId: "b1",
    });
    expect(busy.size).toBe(0);
  });
});

describe("rankRoomSuggestions", () => {
  const rooms = [
    room("COTE 303", { programId: "bsit", type: "Computer Laboratory" }),
    room("COTE 101", { programId: "bsit" }),
    room("COED 201", { programId: "beed" }),
    room("COTE 305", { programId: "bsit", type: "Computer Laboratory" }),
  ];
  it("puts the room the subject used before first, then the department's labs", () => {
    const out = rankRoomSuggestions({
      rooms,
      usage: new Map([["COTE 303", 4]]),
      subjectCode: "CC-111",
      programId: "bsit",
      wantLab: true,
      busy: new Set(),
    });
    expect(out.map((s) => s.room.id)).toEqual(["COTE 303", "COTE 305", "COTE 101"]);
    expect(out[0]!.reason).toBe("Held CC-111 here 4×");
  });
  it("never suggests a busy room", () => {
    const out = rankRoomSuggestions({
      rooms,
      usage: new Map([["COTE 303", 4]]),
      subjectCode: "CC-111",
      programId: "bsit",
      wantLab: true,
      busy: new Set(["COTE 303"]),
    });
    expect(out.some((s) => s.room.id === "COTE 303")).toBe(false);
  });
});

describe("helpers", () => {
  it("names floors", () => {
    expect(ordinalFloor(1)).toBe("1st floor");
    expect(ordinalFloor(3)).toBe("3rd floor");
    expect(ordinalFloor(12)).toBe("12th floor");
    expect(ordinalFloor(null)).toBeNull();
  });
  it("drops repeated messages", () => {
    expect(dedupeMessages(["Room is taken.", "room is taken", "", "Instructor busy"])).toEqual(["Room is taken.", "Instructor busy"]);
  });
});
