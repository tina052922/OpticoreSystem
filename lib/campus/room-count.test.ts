import { describe, expect, it } from "vitest";
import { campusRoomCount, countRoomsInBuildingCatalog } from "./room-count";

const buildings = [
  { id: "b-cote", name: "COTE Building" },
  { id: "b-admin", name: "Admin Building" },
];

describe("countRoomsInBuildingCatalog", () => {
  it("counts rooms attached to a building", () => {
    const rooms = [
      { buildingId: "b-cote", building: "COTE Building" },
      { buildingId: "b-admin", building: "Admin Building" },
    ];
    expect(countRoomsInBuildingCatalog(rooms, buildings)).toBe(2);
  });

  it("counts rooms seeded before buildingId existed, by name", () => {
    const rooms = [{ buildingId: null, building: "Admin Building" }];
    expect(countRoomsInBuildingCatalog(rooms, buildings)).toBe(1);
  });

  it("excludes rooms left over from a deleted building", () => {
    const rooms = [
      { buildingId: "b-cote", building: "COTE Building" },
      // "BALIK" was removed from the Building table; its rooms still carry the name.
      { buildingId: null, building: "BALIK" },
      { buildingId: null, building: null },
    ];
    expect(countRoomsInBuildingCatalog(rooms, buildings)).toBe(1);
  });

  it("counts every room when no building catalog exists yet", () => {
    const rooms = [{ building: "Anything" }, { building: null }, { buildingId: "x" }];
    expect(countRoomsInBuildingCatalog(rooms, [])).toBe(3);
    expect(countRoomsInBuildingCatalog(rooms, [{ id: "b", name: "  " }])).toBe(3);
  });

  it("is zero for no rooms", () => {
    expect(countRoomsInBuildingCatalog([], buildings)).toBe(0);
  });
});

describe("campusRoomCount", () => {
  const rooms = [
    { buildingId: "b-cote", building: "COTE Building" },
    { buildingId: null, building: "BALIK" },
  ];

  it("returns the catalog count", async () => {
    const n = await campusRoomCount(
      async () => ({ data: rooms, error: null }),
      async () => ({ data: buildings, error: null }),
    );
    expect(n).toBe(1);
  });

  it("falls back to every room when the Building table is not installed", async () => {
    const n = await campusRoomCount(
      async () => ({ data: rooms, error: null }),
      async () => ({ data: null, error: { message: 'relation "Building" does not exist' } }),
    );
    expect(n).toBe(2);
  });

  it("is zero when rooms cannot be read", async () => {
    const n = await campusRoomCount(
      async () => ({ data: null, error: null }),
      async () => ({ data: buildings, error: null }),
    );
    expect(n).toBe(0);
  });
});
