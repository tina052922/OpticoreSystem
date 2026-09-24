import { describe, expect, it } from "vitest";
import type { Building, Room } from "@/types/db";
import {
  buildingNameForRoom,
  buildingNamesForPlotting,
  roomsInBuildingNamed,
  sortedRoomsInBuildingNamed,
} from "./building-options";

function building(partial: Partial<Building> & Pick<Building, "id" | "name">): Building {
  return {
    code: null,
    floorCount: 1,
    collegeId: "c1",
    programId: null,
    gecUsable: false,
    ...partial,
  };
}

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

const cote = building({ id: "b-cote", name: "COTE Building", code: "COTE" });
const newBuilding = building({ id: "b-new", name: "New Building" });

/** A room still carrying the name of a building that was deleted from the table. */
const balikRoom = room({ id: "r-balik", code: "BLK-1", buildingId: null, building: "BALIK" });

describe("buildingNamesForPlotting", () => {
  it("lists the Building table, not leftover text on room rows", () => {
    // "BALIK" was deleted from Building but its name is still on a room row.
    const rooms = [
      room({ id: "r1", code: "COTE-101", buildingId: "b-cote", building: "COTE Building" }),
      room({ id: "r2", code: "NEW-1", buildingId: "b-new", building: "New Building" }),
      balikRoom,
    ];
    expect(buildingNamesForPlotting([cote, newBuilding], rooms)).toEqual([
      "COTE Building",
      "New Building",
    ]);
  });

  it("omits a building whose rooms are all out of the caller's scope", () => {
    // Picking such a building used to open an empty Room select with nothing explaining why.
    const rooms = [room({ id: "r1", code: "COTE-101", buildingId: "b-cote" })];
    expect(buildingNamesForPlotting([cote, newBuilding], rooms)).toEqual(["COTE Building"]);
    expect(buildingNamesForPlotting([cote, newBuilding], [])).toEqual([]);
  });

  it("keeps the campus-navigation order before the alphabetical tail", () => {
    const admin = building({ id: "b-adm", name: "Admin Building" });
    const ordered = [
      room({ id: "r1", code: "N-1", buildingId: "b-new" }),
      room({ id: "r2", code: "C-1", buildingId: "b-cote" }),
      room({ id: "r3", code: "A-1", buildingId: "b-adm" }),
    ];
    expect(buildingNamesForPlotting([newBuilding, cote, admin], ordered)).toEqual([
      "Admin Building",
      "COTE Building",
      "New Building",
    ]);
  });

  it("falls back to room text when the table is empty or not installed", () => {
    const rooms = [
      room({ id: "r1", code: "A-1", building: "Annex" }),
      balikRoom,
      room({ id: "r3", code: "C-1", building: null }),
    ];
    // "Other" (rooms with no building text) keeps its place in the campus-navigation order.
    expect(buildingNamesForPlotting([], rooms)).toEqual(["Other", "Annex", "BALIK"]);
    expect(buildingNamesForPlotting(null, rooms)).toEqual(["Other", "Annex", "BALIK"]);
  });

  it("ignores blank building names", () => {
    const rooms = [room({ id: "r1", code: "C-1", buildingId: "b-cote" })];
    expect(buildingNamesForPlotting([building({ id: "b0", name: "  " }), cote], rooms)).toEqual([
      "COTE Building",
    ]);
  });
});

describe("roomsInBuildingNamed", () => {
  const buildings = [cote, newBuilding];
  const rooms = [
    room({ id: "r1", code: "COTE-101", buildingId: "b-cote", building: "COTE Building" }),
    // Renamed building: the room's text is stale but the id still points at it.
    room({ id: "r2", code: "COTE-102", buildingId: "b-cote", building: "Old Name" }),
    // Seeded before buildingId existed.
    room({ id: "r3", code: "COTE-103", buildingId: null, building: "COTE Building" }),
    room({ id: "r4", code: "NEW-1", buildingId: "b-new", building: "New Building" }),
    balikRoom,
  ];

  it("matches by buildingId even when the room text is stale", () => {
    expect(roomsInBuildingNamed(rooms, "COTE Building", buildings).map((r) => r.id)).toEqual([
      "r1",
      "r2",
      "r3",
    ]);
  });

  it("does not leak a room into another building", () => {
    expect(roomsInBuildingNamed(rooms, "New Building", buildings).map((r) => r.id)).toEqual(["r4"]);
  });

  it("never offers rooms of a deleted building", () => {
    const everything = buildings.flatMap((b) => roomsInBuildingNamed(rooms, b.name, buildings));
    expect(everything.map((r) => r.id)).not.toContain("r-balik");
    expect(roomsInBuildingNamed(rooms, "BALIK", buildings)).toEqual([]);
  });

  it("is empty without a building name", () => {
    expect(roomsInBuildingNamed(rooms, "", buildings)).toEqual([]);
    expect(roomsInBuildingNamed(rooms, null, buildings)).toEqual([]);
  });

  it("groups by text when the table is not installed", () => {
    expect(roomsInBuildingNamed(rooms, "BALIK", []).map((r) => r.id)).toEqual(["r-balik"]);
  });
});

describe("sortedRoomsInBuildingNamed", () => {
  it("orders by floor then code", () => {
    const rooms = [
      room({ id: "r3", code: "C-301", buildingId: "b-cote", floor: 3 }),
      room({ id: "r1", code: "C-101", buildingId: "b-cote", floor: 1 }),
      room({ id: "r2", code: "C-102", buildingId: "b-cote", floor: 1 }),
    ];
    expect(sortedRoomsInBuildingNamed(rooms, "COTE Building", [cote]).map((r) => r.code)).toEqual([
      "C-101",
      "C-102",
      "C-301",
    ]);
  });
});

describe("buildingNameForRoom", () => {
  const buildings = [cote, newBuilding];

  it("uses the building the room is attached to", () => {
    const saved = room({ id: "r1", code: "COTE-101", buildingId: "b-cote", building: "Old Name" });
    expect(buildingNameForRoom(saved, buildings)).toBe("COTE Building");
  });

  it("falls back to the room's own text when the table still has that name", () => {
    const legacy = room({ id: "r3", code: "COTE-103", buildingId: null, building: "COTE Building" });
    expect(buildingNameForRoom(legacy, buildings)).toBe("COTE Building");
  });

  it("returns nothing for a room whose building was deleted", () => {
    expect(buildingNameForRoom(balikRoom, buildings)).toBe("");
    expect(buildingNameForRoom(null, buildings)).toBe("");
  });

  it("trusts the room text when the table is not installed", () => {
    expect(buildingNameForRoom(balikRoom, [])).toBe("BALIK");
  });
});
