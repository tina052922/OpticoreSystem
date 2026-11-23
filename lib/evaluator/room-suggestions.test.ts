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

import { dedupeClashMessages } from "./room-suggestions";

describe("dedupeClashMessages", () => {
  it("keeps one message per clash, the first one", () => {
    expect(
      dedupeClashMessages([
        "Christine Joy Tomol is double-booked: overlaps another assignment on Monday 10:00 AM – 12:00 PM.",
        "Monday 10:00 AM – 11:00 AM overlaps PC-4215 · BSIT-4B (10:00 AM – 12:00 PM) already plotted for this instructor. Pick another start time.",
        "Instructor is already scheduled on Monday 10:00 AM – 12:00 PM",
      ]),
    ).toEqual(["Christine Joy Tomol is double-booked: overlaps another assignment on Monday 10:00 AM – 12:00 PM."]);
  });
  it("keeps different clashes and different days", () => {
    const out = dedupeClashMessages([
      "Instructor is already scheduled on Monday 10:00 AM – 12:00 PM",
      "Instructor is already scheduled on Wednesday 10:00 AM – 12:00 PM",
      "Room COTE 305 is already occupied on Monday 10:00 AM – 11:00 AM",
      "Only 30 minutes are free before the next class.",
    ]);
    expect(out).toHaveLength(4);
  });
});

import { busyInstructorsForMeetings } from "./room-suggestions";

describe("busyInstructorsForMeetings", () => {
  const blocks = [
    { id: "pc-4215", academicPeriodId: "p", day: "Monday", startTime: "10:00", endTime: "12:00", instructorId: "tomol", sectionId: "4b", roomId: "R1", programMode: "day" as const },
  ];
  it("flags an instructor teaching in the clicked half hour, with the clashing class", () => {
    const busy = busyInstructorsForMeetings({
      instructorIds: ["tomol", "enoc"],
      meetings: [{ day: "Monday", startTime: "10:00", endTime: "10:30" }],
      existingBlocks: blocks,
      academicPeriodId: "p",
      programMode: "day",
    });
    expect([...busy.entries()]).toEqual([["tomol", "pc-4215"]]);
  });
  it("is free on another day", () => {
    const busy = busyInstructorsForMeetings({
      instructorIds: ["tomol"],
      meetings: [{ day: "Tuesday", startTime: "10:00", endTime: "10:30" }],
      existingBlocks: blocks,
      academicPeriodId: "p",
      programMode: "day",
    });
    expect(busy.size).toBe(0);
  });
});
