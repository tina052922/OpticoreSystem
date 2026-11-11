import { describe, expect, it } from "vitest";
import { roomsForPlotting, searchPlotRooms } from "./program-plot-rooms";
import type { Building, Room } from "@/types/db";

function room(partial: Partial<Room> & Pick<Room, "id" | "code">): Room {
  return { building: null, floor: null, capacity: null, type: null, collegeId: null, ...partial };
}

const buildings = [
  { id: "b-cote", name: "COTE Building", collegeId: "c1" },
  { id: "b-agri", name: "Agriculture Building", collegeId: "c2" },
] as Building[];

const coteLab = room({ id: "r1", code: "COTE 303", displayName: "IT Lab 04", buildingId: "b-cote", programId: "prog-bsit" });
const agriRoom = room({ id: "r2", code: "AGRI 101", buildingId: "b-agri", collegeId: "c2" });
const loose = room({ id: "r3", code: "LOOSE-1" });

describe("roomsForPlotting", () => {
  it("offers every room, whatever college or department owns it", () => {
    expect(roomsForPlotting([coteLab, agriRoom, loose]).map((r) => r.id).sort()).toEqual(["r1", "r2", "r3"]);
  });
});

describe("searchPlotRooms", () => {
  const all = [coteLab, agriRoom, loose];

  it("matches the room name, code or building", () => {
    expect(searchPlotRooms(all, buildings, "it lab").map((h) => h.room.id)).toEqual(["r1"]);
    expect(searchPlotRooms(all, buildings, "agri").map((h) => h.room.id)).toEqual(["r2"]);
    expect(searchPlotRooms(all, buildings, "cote 303")[0]?.buildingName).toBe("COTE Building");
  });

  it("ignores leading zeros", () => {
    expect(searchPlotRooms(all, buildings, "lab 4").map((h) => h.room.id)).toEqual(["r1"]);
  });

  it("returns nothing for a blank query or a room in no building", () => {
    expect(searchPlotRooms(all, buildings, "  ")).toEqual([]);
    expect(searchPlotRooms(all, buildings, "loose")).toEqual([]);
  });
});

describe("searchPlotRooms word starts", () => {
  const etLab = room({ id: "e1", code: "COTE 204", displayName: "ET Lab 03 Digital Communication Lab", buildingId: "b-cote" });
  const lab2 = room({ id: "l2", code: "COTE 304", displayName: "IT Lab 02", buildingId: "b-cote" });
  it("does not match letters or digits in the middle of a word", () => {
    expect(searchPlotRooms([etLab, coteLab, lab2], buildings, "iT LAB 4").map((h) => h.room.id)).toEqual(["r1"]);
  });
});
