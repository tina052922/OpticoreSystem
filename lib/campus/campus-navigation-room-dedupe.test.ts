import { describe, expect, it } from "vitest";

import { alignCampusNavigationRoomCatalog } from "@/lib/campus/campus-navigation-room-dedupe";
import type { Room } from "@/types/db";

const r = (partial: Partial<Room> & Pick<Room, "id" | "code">): Room => ({
  building: null,
  floor: null,
  capacity: null,
  type: null,
  collegeId: null,
  ...partial,
});

describe("alignCampusNavigationRoomCatalog", () => {
  it("removes legacy IT LAB rows when COTE navigator IT labs are in the same list", () => {
    const list = [
      r({ id: "room-it-lab-1", code: "IT LAB 1", building: "COTE Building" }),
      r({ id: "room-cote-305", code: "COTE 305", building: "COTE Building" }),
    ];
    expect(alignCampusNavigationRoomCatalog(list).map((x) => x.id)).toEqual(["room-cote-305"]);
  });

  it("removes legacy college Room 201 when room-coed-201 is present", () => {
    const list = [
      r({ id: "room-201", code: "Room 201", building: "COED Building" }),
      r({ id: "room-coed-201", code: "Room 201", building: "COED Building" }),
    ];
    expect(alignCampusNavigationRoomCatalog(list).map((x) => x.id)).toEqual(["room-coed-201"]);
  });

  it("keeps legacy rows when canonical campus navigation rows are absent", () => {
    const list = [r({ id: "room-it-lab-1", code: "IT LAB 1", building: "COTE Building" })];
    expect(alignCampusNavigationRoomCatalog(list)).toHaveLength(1);
  });
});
