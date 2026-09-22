import { describe, expect, it } from "vitest";
import {
  filterRoomsForGecPlot,
  filterRoomsForProgramPlot,
  isRoomEligibleForProgramPlot,
} from "./program-plot-rooms";
import type { Room } from "@/types/db";

function room(partial: Partial<Room> & Pick<Room, "id" | "code">): Room {
  return {
    building: null,
    floor: null,
    capacity: null,
    type: null,
    collegeId: "c1",
    ...partial,
  };
}

describe("department-scoped plot rooms", () => {
  const bsitLab = room({ id: "lab1", code: "IT LAB 1", displayName: "IT Lab 01", programId: null });
  const deptA = room({ id: "a1", code: "A-101", programId: "prog-a", building: "Annex" });
  const deptB = room({ id: "b1", code: "B-201", programId: "prog-b", building: "North" });
  const shared = room({ id: "s1", code: "SHARED-1", programId: null, collegeId: null });

  it("lets a department use only its assigned rooms once configured", () => {
    const rooms = [deptA, deptB, shared, bsitLab];
    const scoped = filterRoomsForProgramPlot(rooms, "BIT-AUTO", "c1", "prog-a");
    expect(scoped.map((r) => r.id)).toEqual(["a1"]);
  });

  it("blocks another department from assigning foreign department rooms", () => {
    expect(isRoomEligibleForProgramPlot(deptA, "BSIT", "c1", "prog-b")).toBe(false);
    expect(isRoomEligibleForProgramPlot(deptA, "BSIT", "c1", "prog-a")).toBe(true);
  });

  it("keeps BSIT IT-lab eligibility when no department rooms are assigned", () => {
    const scoped = filterRoomsForProgramPlot([bsitLab, shared], "BSIT", "c1", "prog-bsit");
    expect(scoped.some((r) => r.id === "lab1")).toBe(true);
  });

  it("shows rooms added in Buildings & Rooms to the BSIT plotter", () => {
    // A COTE Building room created by College Admin: same college, no department lock.
    const coteRoom = room({ id: "cote-1", code: "COTE-101", building: "COTE Building", programId: null });
    const scoped = filterRoomsForProgramPlot([coteRoom, bsitLab], "BSIT", "c1", "prog-bsit");
    expect(scoped.map((r) => r.id).sort()).toEqual(["cote-1", "lab1"]);
  });

  it("never shows a room from another college", () => {
    const otherCollege = room({ id: "x9", code: "X-9", collegeId: "c2", programId: null });
    const scoped = filterRoomsForProgramPlot([otherCollege, shared], "BIT-AUTO", "c1", "prog-a");
    expect(scoped.map((r) => r.id)).toEqual(["s1"]);
  });

  it("falls back to the legacy IT labs only when the college has no rooms at all", () => {
    const foreignLab = room({ id: "lab9", code: "IT LAB 2", displayName: "IT Lab 02", collegeId: "c2" });
    const scoped = filterRoomsForProgramPlot([foreignLab], "BSIT", "c1", "prog-bsit");
    expect(scoped.map((r) => r.id)).toEqual(["lab9"]);
  });
});

describe("GEC-usable room filter", () => {
  it("prefers gecUsable rooms when any exist for the college", () => {
    const rooms = [
      room({ id: "g1", code: "GEC-1", gecUsable: true }),
      room({ id: "x1", code: "X-1", gecUsable: false }),
      room({ id: "g2", code: "GEC-2", collegeId: "c2", gecUsable: true }),
    ];
    expect(filterRoomsForGecPlot(rooms, "c1").map((r) => r.id)).toEqual(["g1"]);
  });

  it("falls back to college rooms when no GEC flag is set yet", () => {
    const rooms = [
      room({ id: "a", code: "A", gecUsable: false }),
      room({ id: "b", code: "B", collegeId: null, gecUsable: null }),
    ];
    expect(filterRoomsForGecPlot(rooms, "c1").map((r) => r.id).sort()).toEqual(["a", "b"]);
  });
});
