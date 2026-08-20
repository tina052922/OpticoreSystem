import { describe, expect, it } from "vitest";

import {
  campusNavigationBuildingOptionLabel,
  sortedNavigationBuildingKeysFromRooms,
} from "@/lib/campus/campus-navigation-catalog";
import type { Room } from "@/types/db";

const room = (building: string | null): Room => ({
  id: "x",
  code: "X",
  building,
  floor: 1,
  capacity: 1,
  type: "Lecture",
  collegeId: null,
});

describe("sortedNavigationBuildingKeysFromRooms", () => {
  it("orders COED and Science & Technology before COTE (campus navigator flow)", () => {
    const keys = sortedNavigationBuildingKeysFromRooms([
      room("COTE Building"),
      room("Science and Technology Building"),
      room("COED Building"),
    ]);
    expect(keys).toEqual(["COED Building", "Science and Technology Building", "COTE Building"]);
  });
});

describe("campusNavigationBuildingOptionLabel", () => {
  it("uses ampersand label for Science and Technology while value stays DB string", () => {
    expect(campusNavigationBuildingOptionLabel("Science and Technology Building")).toBe(
      "Science & Technology Building",
    );
  });
});
